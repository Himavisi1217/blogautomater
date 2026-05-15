export type SearchSource = 'google' | 'bing' | 'duckduckgo' | 'competitor' | 'paa';

export interface KeywordCandidate {
  keyword: string;
  sources: SearchSource[];
  score: number;
  seed?: string;
  competitor?: string;
}

export interface IndexProbeResult {
  keyword: string;
  domain: string;
  indexed: boolean;
  resultCount: number;
  source: 'duckduckgo';
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function normalizeKeyword(k: string): string {
  return k.toLowerCase().replace(/\s+/g, ' ').trim();
}

function uniquePush(map: Map<string, KeywordCandidate>, keyword: string, source: SearchSource, extra?: Partial<KeywordCandidate>): void {
  const k = normalizeKeyword(keyword);
  if (!k || k.length < 3 || k.length > 120) return;
  const existing = map.get(k);
  if (existing) {
    if (!existing.sources.includes(source)) existing.sources.push(source);
    existing.score += 1;
    if (extra?.competitor && !existing.competitor) existing.competitor = extra.competitor;
    if (extra?.seed && !existing.seed) existing.seed = extra.seed;
  } else {
    map.set(k, {
      keyword: keyword.trim(),
      sources: [source],
      score: 1,
      seed: extra?.seed,
      competitor: extra?.competitor,
    });
  }
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*', ...headers },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Google autocomplete (live suggest API). */
export async function googleSuggest(query: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
    const data = (await fetchJson(url)) as [string, string[]];
    return (data[1] || []).filter(Boolean);
  } catch {
    return [];
  }
}

/** Bing autosuggest. */
export async function bingSuggest(query: string): Promise<string[]> {
  try {
    const url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`;
    const data = (await fetchJson(url)) as [string, string[]];
    return (data[1] || []).filter(Boolean);
  } catch {
    return [];
  }
}

/** DuckDuckGo autocomplete. */
export async function duckDuckGoSuggest(query: string): Promise<string[]> {
  try {
    const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`;
    const data = (await fetchJson(url)) as Array<{ phrase: string }>;
    return data.map((d) => d.phrase).filter(Boolean);
  } catch {
    return [];
  }
}

/** Expand one seed across all engines + alphabet suffixes. */
export async function expandSeedQueries(seed: string): Promise<KeywordCandidate[]> {
  const map = new Map<string, KeywordCandidate>();
  const suffixes = ['', ' for', ' vs', ' best', ' how', ' what', ' tools', ' software', ' platform', ' 2025', ' 2026'];

  const queries = [seed, ...suffixes.map((s) => `${seed}${s}`)];

  for (const q of queries) {
    const [g, b, d] = await Promise.all([googleSuggest(q), bingSuggest(q), duckDuckGoSuggest(q)]);
    for (const kw of g) uniquePush(map, kw, 'google', { seed });
    for (const kw of b) uniquePush(map, kw, 'bing', { seed });
    for (const kw of d) uniquePush(map, kw, 'duckduckgo', { seed });
    await delay(80);
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

/** Competitor-focused suggestions (site: queries + brand + topic). */
export async function fetchCompetitorSignals(
  competitors: string[],
  topic: string
): Promise<KeywordCandidate[]> {
  const map = new Map<string, KeywordCandidate>();

  for (const raw of competitors) {
    const domain = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    if (!domain) continue;

    const queries = [
      `site:${domain} ${topic}`,
      `${domain} ${topic}`,
      `${domain} blog ${topic}`,
      `site:${domain}`,
    ];

    for (const q of queries) {
      const [g, b, d] = await Promise.all([googleSuggest(q), bingSuggest(q), duckDuckGoSuggest(q)]);
      for (const kw of [...g, ...b, ...d]) {
        uniquePush(map, kw, 'competitor', { competitor: domain, seed: topic });
      }
      await delay(100);
    }

    try {
      const meta = await fetchPageMeta(domain);
      if (meta.title) uniquePush(map, meta.title, 'competitor', { competitor: domain });
      for (const phrase of meta.keywords) {
        uniquePush(map, phrase, 'competitor', { competitor: domain });
      }
    } catch {
      /* optional */
    }
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

async function fetchPageMeta(domain: string): Promise<{ title: string; keywords: string[] }> {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(10000),
    redirect: 'follow',
  });
  const html = await res.text();
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
  const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  const kwMeta =
    html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  const keywords = [...(kwMeta ? kwMeta.split(',') : []), ...(desc ? [desc.slice(0, 80)] : [])]
    .map((k) => k.trim())
    .filter((k) => k.length > 3);
  return { title, keywords };
}

/** DuckDuckGo HTML lite — checks if domain appears for keyword (index proxy). */
export async function probeIndexStatus(keyword: string, domain: string): Promise<IndexProbeResult> {
  const q = `site:${domain.replace(/^https?:\/\//, '').split('/')[0]} ${keyword}`;
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const noResults =
      html.includes('No results found') ||
      html.includes('no results') ||
      html.includes('did not match any');
    const resultLinks = (html.match(/class="result__a"/g) || []).length;
    return {
      keyword,
      domain,
      indexed: !noResults && resultLinks > 0,
      resultCount: resultLinks,
      source: 'duckduckgo',
    };
  } catch {
    return { keyword, domain, indexed: false, resultCount: 0, source: 'duckduckgo' };
  }
}

export function buildDefaultSeeds(topic: string, domain: string): string[] {
  const brand = domain.replace(/^www\./, '').split('.')[0];
  return [
    topic,
    `${topic} software`,
    `${topic} platform`,
    `${topic} for business`,
    `${topic} for startups`,
    `${topic} tools`,
    `virtual ${topic}`,
    `autonomous ${topic}`,
    `hire ${topic}`,
    `${brand} ${topic}`,
    `best ${topic}`,
    `${topic} vs human employees`,
    `${topic} pricing`,
    `${topic} use cases`,
    `ai workforce automation`,
    `digital ${topic}`,
  ];
}

export const DEFAULT_COMPETITORS = [
  'sintra.ai',
  'artisan.co',
  'relevanceai.com',
  'crewai.com',
  'multion.ai',
];

export async function collectAllCandidates(options: {
  topic: string;
  domain: string;
  extraSeeds?: string[];
  competitors?: string[];
}): Promise<{ candidates: KeywordCandidate[]; seedsUsed: string[]; fetchedAt: string }> {
  const seeds = [...new Set([...buildDefaultSeeds(options.topic, options.domain), ...(options.extraSeeds || [])])];
  const competitors = options.competitors?.length ? options.competitors : DEFAULT_COMPETITORS;

  const allMap = new Map<string, KeywordCandidate>();

  for (const seed of seeds) {
    const expanded = await expandSeedQueries(seed);
    for (const c of expanded) {
      const k = normalizeKeyword(c.keyword);
      const ex = allMap.get(k);
      if (ex) {
        ex.score += c.score;
        for (const s of c.sources) if (!ex.sources.includes(s)) ex.sources.push(s);
      } else {
        allMap.set(k, { ...c });
      }
    }
  }

  const comp = await fetchCompetitorSignals(competitors, options.topic);
  for (const c of comp) {
    const k = normalizeKeyword(c.keyword);
    const ex = allMap.get(k);
    if (ex) {
      ex.score += c.score + 2;
      for (const s of c.sources) if (!ex.sources.includes(s)) ex.sources.push(s);
      if (c.competitor) ex.competitor = c.competitor;
    } else {
      allMap.set(k, { ...c, score: c.score + 2 });
    }
  }

  const candidates = [...allMap.values()].sort((a, b) => b.score - a.score);
  return { candidates, seedsUsed: seeds, fetchedAt: new Date().toISOString() };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
