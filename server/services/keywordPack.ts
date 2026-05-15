import { generateWithClaude } from './claude.js';
import { buildKeywordPackPrompt } from '../prompts.js';
import type { IndexProbeResult, KeywordCandidate } from './serpSignals.js';
import { probeIndexStatus } from './serpSignals.js';

export interface KeywordGroup {
  primary: string;
  secondary: string[];
  sources: string[];
  score: number;
  indexed?: boolean;
  indexResultCount?: number;
  competitor?: string;
  intent?: string;
}

function normalize(k: string): string {
  return k.toLowerCase().replace(/\s+/g, ' ').trim();
}

function allowedSet(candidates: KeywordCandidate[]): Set<string> {
  return new Set(candidates.map((c) => normalize(c.keyword)));
}

function pickRelatedSecondaries(
  primary: string,
  candidates: KeywordCandidate[],
  allowed: Set<string>,
  count = 3
): string[] {
  const p = normalize(primary);
  const scored = candidates
    .filter((c) => normalize(c.keyword) !== p && allowed.has(normalize(c.keyword)))
    .map((c) => {
      const k = normalize(c.keyword);
      let rel = 0;
      if (k.includes(p) || p.includes(k)) rel += 5;
      const pWords = p.split(' ');
      const kWords = k.split(' ');
      rel += pWords.filter((w) => w.length > 3 && kWords.includes(w)).length * 2;
      rel += c.score;
      return { keyword: c.keyword, rel };
    })
    .sort((a, b) => b.rel - a.rel);

  const out: string[] = [];
  for (const s of scored) {
    if (out.length >= count) break;
    if (!out.some((x) => normalize(x) === normalize(s.keyword))) out.push(s.keyword);
  }
  return out;
}

/** Programmatic fallback — no AI, only verified candidates. */
export function buildPackFallback(candidates: KeywordCandidate[], count = 30): KeywordGroup[] {
  const top = candidates.slice(0, count * 2);
  const groups: KeywordGroup[] = [];
  const used = new Set<string>();
  const allowed = allowedSet(candidates);

  for (const c of top) {
    if (groups.length >= count) break;
    const k = normalize(c.keyword);
    if (used.has(k)) continue;
    used.add(k);
    const secondary = pickRelatedSecondaries(c.keyword, candidates, allowed, 3);
    groups.push({
      primary: c.keyword,
      secondary,
      sources: c.sources,
      score: c.score,
      competitor: c.competitor,
      intent: 'informational',
    });
  }
  return groups;
}

function validatePack(
  pack: KeywordGroup[],
  allowed: Set<string>,
  candidates: KeywordCandidate[]
): KeywordGroup[] {
  return pack
    .filter((g) => allowed.has(normalize(g.primary)))
    .map((g) => {
      let secondary = (g.secondary || []).filter((s) => allowed.has(normalize(s)));
      if (secondary.length < 3) {
        const extra = pickRelatedSecondaries(g.primary, candidates, allowed, 3);
        for (const s of extra) {
          if (secondary.length >= 3) break;
          if (!secondary.some((x) => normalize(x) === normalize(s))) secondary.push(s);
        }
      }
      return { ...g, secondary: secondary.slice(0, 3) };
    })
    .filter((g) => g.primary.length > 0);
}

export async function buildKeywordPackWithAI(
  candidates: KeywordCandidate[],
  context: { topic: string; domain: string; brandFocus: string }
): Promise<{ pack: KeywordGroup[]; usedAI: boolean }> {
  const allowed = allowedSet(candidates);
  const candidateList = candidates.slice(0, 250).map((c) => ({
    keyword: c.keyword,
    sources: c.sources,
    score: c.score,
    competitor: c.competitor,
  }));

  try {
    const raw = await generateWithClaude(buildKeywordPackPrompt(context, candidateList));
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(jsonMatch[0]) as { keywords?: KeywordGroup[] };
    let pack = (parsed.keywords || []).slice(0, 30);
    pack = validatePack(pack, allowed, candidates);
    if (pack.length < 20) throw new Error('AI pack failed validation');
    return { pack, usedAI: true };
  } catch (err) {
    console.warn('Keyword pack AI fallback:', (err as Error).message);
    return { pack: buildPackFallback(candidates, 30), usedAI: false };
  }
}

export async function enrichPackWithIndexProbes(
  pack: KeywordGroup[],
  domain: string,
  maxProbes = 15
): Promise<{ pack: KeywordGroup[]; probes: IndexProbeResult[] }> {
  const probes: IndexProbeResult[] = [];
  const toProbe = pack.slice(0, maxProbes);

  for (const g of toProbe) {
    const probe = await probeIndexStatus(g.primary, domain);
    probes.push(probe);
    g.indexed = probe.indexed;
    g.indexResultCount = probe.resultCount;
    await new Promise((r) => setTimeout(r, 200));
  }

  return { pack, probes };
}
