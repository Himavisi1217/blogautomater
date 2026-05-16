import { Router, Request, Response } from 'express';
import { Client } from '@notionhq/client';
import {
  bingSuggest,
  collectAllCandidates,
  DEFAULT_COMPETITORS,
  duckDuckGoSuggest,
  googleSuggest,
  probeIndexStatus,
  type KeywordCandidate,
} from '../services/serpSignals.js';
import { buildKeywordPackWithAI, enrichPackWithIndexProbes, buildPackFallback } from '../services/keywordPack.js';

export const keywordResearchRouter = Router();

/** Live suggest lookup (single query, all engines). */
keywordResearchRouter.get('/suggest', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }
    const [google, bing, duckduckgo] = await Promise.all([
      googleSuggest(q).then((r) => r.map((keyword) => ({ keyword, source: 'google' as const }))),
      bingSuggest(q).then((r) => r.map((keyword) => ({ keyword, source: 'bing' as const }))),
      duckDuckGoSuggest(q).then((r) => r.map((keyword) => ({ keyword, source: 'duckduckgo' as const }))),
    ]);
    res.json({ query: q, suggestions: [...google, ...bing, ...duckduckgo], fetchedAt: new Date().toISOString() });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** Competitor keyword discovery. */
keywordResearchRouter.post('/competitors', async (req: Request, res: Response) => {
  try {
    const topic = (req.body.topic as string)?.trim() || 'ai employees';
    const competitors: string[] = req.body.competitors?.length
      ? req.body.competitors
      : DEFAULT_COMPETITORS;

    const { candidates, fetchedAt } = await collectAllCandidates({
      topic,
      domain: 'pilotup.io',
      competitors,
      extraSeeds: [],
    });

    const competitorOnly = candidates.filter((c) => c.sources.includes('competitor')).slice(0, 100);

    res.json({
      topic,
      competitors,
      keywords: competitorOnly,
      total: competitorOnly.length,
      fetchedAt,
      note: 'Keywords sourced from live Google, Bing, and DuckDuckGo suggest APIs plus competitor site signals.',
    });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** Full research: fetch SERP signals → 30 primaries + 3 secondaries each. */
keywordResearchRouter.post('/discover', async (req: Request, res: Response) => {
  try {
    const topic = (req.body.topic as string)?.trim() || 'ai employees';
    const domain = (req.body.domain as string)?.trim() || 'pilotup.io';
    const brandFocus = (req.body.brandFocus as string)?.trim() || 'AI employees MVP';
    const extraSeeds: string[] = req.body.extraSeeds || [];
    const competitors: string[] = req.body.competitors?.length ? req.body.competitors : DEFAULT_COMPETITORS;
    const useAI = req.body.useAI !== false;
    const probeIndex = req.body.probeIndex !== false;

    const { candidates, seedsUsed, fetchedAt } = await collectAllCandidates({
      topic,
      domain,
      extraSeeds,
      competitors,
    });

    if (candidates.length < 30) {
      res.status(422).json({
        error: `Only ${candidates.length} unique keywords found. Add seeds or check network access to suggest APIs.`,
        candidates,
      });
      return;
    }

    let pack;
    let usedAI = false;
    if (useAI) {
      const result = await buildKeywordPackWithAI(candidates, { topic, domain, brandFocus });
      pack = result.pack;
      usedAI = result.usedAI;
    } else {
      pack = buildPackFallback(candidates, 30);
    }

    const candidateByKey = new Map(candidates.map((c) => [c.keyword.toLowerCase().trim(), c]));
    pack = pack.map((g) => {
      const c = candidateByKey.get(g.primary.toLowerCase().trim());
      return {
        ...g,
        sources: g.sources?.length ? g.sources : c?.sources || [],
        score: g.score ?? c?.score,
        competitor: g.competitor ?? c?.competitor,
      };
    });

    let indexProbes: Awaited<ReturnType<typeof enrichPackWithIndexProbes>>['probes'] = [];
    if (probeIndex) {
      const enriched = await enrichPackWithIndexProbes(pack, domain, 12);
      pack = enriched.pack;
      indexProbes = enriched.probes;
    }

    res.json({
      success: true,
      topic,
      domain,
      brandFocus,
      seedsUsed,
      competitors,
      fetchedAt,
      usedAI,
      totalCandidates: candidates.length,
      sourceBreakdown: countSources(candidates),
      keywords: pack,
      indexProbes,
      disclaimer:
        'Keywords are collected from live search suggest APIs (Google, Bing, DuckDuckGo). Index status uses DuckDuckGo site: search as a proxy — verify in Google Search Console for production decisions.',
    });
  } catch (error: unknown) {
    console.error('Keyword discover error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/** Push keyword pack rows to Notion database. */
keywordResearchRouter.post('/export-notion', async (req: Request, res: Response) => {
  try {
    const apiKey = (req.headers['x-notion-key'] as string) || process.env.NOTION_API_KEY;
    const databaseId = (req.body.databaseId as string) || process.env.NOTION_DATABASE_ID;
    const keywords: Array<{ primary: string; secondary: string[] }> = req.body.keywords;

    if (!apiKey || !databaseId) {
      res.status(400).json({ error: 'Notion API key and database ID are required' });
      return;
    }
    if (!keywords?.length) {
      res.status(400).json({ error: 'No keywords to export' });
      return;
    }

    const notion = new Client({ auth: apiKey });
    const month = (req.body.month as string) || '';
    let created = 0;
    const errors: string[] = [];

    // Convert month (YYYY-MM) to tag name (e.g., "May 2026")
    const monthTagName = monthToTagName(month);

    for (const kw of keywords) {
      try {
        const props: any = {
          'Name': { title: [{ text: { content: kw.primary.slice(0, 2000) } }] },
          'Secondary': {
            rich_text: [{ text: { content: (kw.secondary || []).join(', ').slice(0, 2000) } }],
          },
          'Blog written': { checkbox: false },
        };

        // Set Created at as a select (tag) if month provided
        if (monthTagName) {
          props['Created at'] = { select: { name: monthTagName } };
        }

        await notion.pages.create({
          parent: { database_id: databaseId },
          properties: props,
        });
        created++;
        await new Promise((r) => setTimeout(r, 350));
      } catch (e: unknown) {
        errors.push(`${kw.primary}: ${(e as Error).message}`);
      }
    }

    res.json({ success: true, created, failed: errors.length, errors: errors.slice(0, 5) });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** Probe if a keyword has site: results for domain. */
keywordResearchRouter.post('/probe', async (req: Request, res: Response) => {
  try {
    const keyword = (req.body.keyword as string)?.trim();
    const domain = (req.body.domain as string)?.trim() || 'pilotup.io';
    if (!keyword) {
      res.status(400).json({ error: 'keyword is required' });
      return;
    }
    const result = await probeIndexStatus(keyword, domain);
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});

function monthToTagName(month: string): string {
  // Convert YYYY-MM to "Month Year" format (e.g., "May 2026")
  if (!month || !/^\d{4}-\d{2}/.test(month)) return '';
  const [year, monthNum] = month.split('-');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const idx = parseInt(monthNum, 10) - 1;
  if (idx < 0 || idx >= 12) return '';
  return `${monthNames[idx]} ${year}`;
}

function countSources(candidates: KeywordCandidate[]): Record<string, number> {
  const counts: Record<string, number> = { google: 0, bing: 0, duckduckgo: 0, competitor: 0 };
  for (const c of candidates) {
    for (const s of c.sources) counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}
