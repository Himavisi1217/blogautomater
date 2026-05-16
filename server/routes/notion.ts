import { Router, Request, Response } from 'express';
import { Client } from '@notionhq/client';

export const notionRouter = Router();

// Fetch keywords from Notion database
notionRouter.get('/keywords', async (req: Request, res: Response) => {
  try {
    const apiKey = (req.headers['x-notion-key'] as string) || process.env.NOTION_API_KEY;
    const databaseId = (req.query.databaseId as string) || process.env.NOTION_DATABASE_ID;

    if (!apiKey || !databaseId) {
      res.status(400).json({ error: 'Notion API key and Database ID are required' });
      return;
    }

    const notion = new Client({ auth: apiKey });

    const pages = await fetchAllDatabasePages(notion, databaseId);

    const keywords = pages.map((page: any) => {
      const props = page.properties;
      const blogWritten = extractCheckboxProperty(props, 'Blog written');
      const monthKey = extractMonthKey(props) || page.created_time?.slice(0, 7) || 'unknown';
      return {
        id: page.id,
        mainKeyword: extractTextProperty(props, 'Main Keyword') || extractTextProperty(props, 'Name') || extractTextProperty(props, 'Keyword') || '',
        secondaryKeywords: extractTextProperty(props, 'Secondary') || extractTextProperty(props, 'Secondary Keywords') || '',
        blogWritten,
        status: blogWritten ? 'pushed' : 'not_pushed',
        notionStatus: extractSelectProperty(props, 'Status') || '',
        monthKey,
        priority: extractSelectProperty(props, 'Priority') || 'medium',
        tone: extractSelectProperty(props, 'Tone') || 'conversational',
        wordCount: extractNumberProperty(props, 'Word Count') || 1500,
        createdAt: page.created_time,
        lastEdited: page.last_edited_time,
      };
    });

    keywords.sort((left: any, right: any) => compareKeywordRecords(left, right));

    res.json({ keywords, total: keywords.length });
  } catch (error: any) {
    console.error('Notion error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch keywords from Notion' });
  }
});

// Update keyword status in Notion
notionRouter.patch('/keywords/:id/status', async (req: Request, res: Response) => {
  try {
    const apiKey = (req.headers['x-notion-key'] as string) || process.env.NOTION_API_KEY;
    if (!apiKey) {
      res.status(400).json({ error: 'Notion API key is required' });
      return;
    }

    const notion = new Client({ auth: apiKey });
    const { id } = req.params;
    const { status } = req.body;

    await notion.pages.update({
      page_id: id,
      properties: {
        'Status': {
          select: { name: status },
        },
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Notion update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update status' });
  }
});

// Test Notion connection
notionRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const { apiKey, databaseId } = req.body;
    const notion = new Client({ auth: apiKey });

    const database = await notion.databases.retrieve({ database_id: databaseId });
    res.json({ success: true, title: (database as any).title?.[0]?.plain_text || 'Connected' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Save blog content into the matching Keywords database row
notionRouter.post('/save-blog', async (req: Request, res: Response) => {
  try {
    const apiKey = (req.headers['x-notion-key'] as string) || process.env.NOTION_API_KEY;
    const keywordsDbId = (req.body.databaseId as string) || process.env.NOTION_DATABASE_ID;

    if (!apiKey || !keywordsDbId) {
      res.status(400).json({ error: 'Notion API key and Keywords Database ID are required' });
      return;
    }

    const {
      title,
      content,
      mainKeyword,
      secondaryKeywords,
      metaTitle,
      metaDescription,
      excerpt,
      slug,
      provider,
      keywords,
    } = req.body;

    const notion = new Client({ auth: apiKey });
    const mainKey = (mainKeyword || metaTitle || title || '').toString().trim();

    if (!mainKey) {
      res.status(400).json({ error: 'Main keyword is required to locate the Notion row' });
      return;
    }

    const database = await notion.databases.retrieve({ database_id: keywordsDbId });
    const keywordMatchProperty = pickKeywordMatchProperty(database as any);
    const queryRes = await notion.databases.query({
      database_id: keywordsDbId,
      page_size: 1,
      filter: buildContainsFilterForProperty(database as any, keywordMatchProperty, mainKey),
    });

    const kwPage = queryRes.results?.[0] as any;
    if (!kwPage) {
      res.status(404).json({ error: `No keyword row found for "${mainKey}"` });
      return;
    }

    const blogContent = (content || '').slice(0, 2000);
    const articleProperty = kwPage.properties?.['Blog Articles'];

    if (!articleProperty || articleProperty.type !== 'relation') {
      throw new Error('Blog Articles is expected to be relation in the live Notion schema');
    }

    const relationDbId =
      articleProperty.relation?.database_id ||
      articleProperty.relation?.data_source_id ||
      process.env.NOTION_ARTICLES_DATABASE_ID ||
      process.env.NOTION_BLOG_ARTICLES_DATABASE_ID;

    if (!relationDbId) {
      throw new Error('Could not determine the Blog Articles relation database id');
    }

    const articlePage = await notion.pages.create({
      parent: { database_id: relationDbId },
      properties: {
        'Name': { title: [{ text: { content: (title || mainKey).slice(0, 2000) } }] },
        'Content': { rich_text: [{ text: { content: blogContent } }] },
      },
    });

    await notion.pages.update({
      page_id: kwPage.id,
      properties: {
        'Blog Articles': { relation: [{ id: articlePage.id }] },
        'Blog written': { checkbox: true },
      },
    });

    res.json({
      success: true,
      message: 'Blog content saved to Notion Keywords database row',
      notionPageId: kwPage.id,
    });
  } catch (error: any) {
    console.error('Notion save blog error:', error);
    res.status(500).json({ error: error.message || 'Failed to save blog to Notion' });
  }
});
function extractTextProperty(props: any, name: string): string {
  const prop = props[name];
  if (!prop) return '';
  if (prop.type === 'title') return (prop.title || []).map((part: any) => part.plain_text || '').join('');
  if (prop.type === 'rich_text') return (prop.rich_text || []).map((part: any) => part.plain_text || '').join('');
  return '';
}

function extractSelectProperty(props: any, name: string): string {
  const prop = props[name];
  if (!prop || prop.type !== 'select') return '';
  return prop.select?.name || '';
}

function extractNumberProperty(props: any, name: string): number {
  const prop = props[name];
  if (!prop || prop.type !== 'number') return 0;
  return prop.number || 0;
}

function extractCheckboxProperty(props: any, name: string): boolean {
  const prop = props[name];
  if (!prop || prop.type !== 'checkbox') return false;
  return Boolean(prop.checkbox);
}

async function fetchAllDatabasePages(notion: Client, databaseId: string): Promise<any[]> {
  const pages: any[] = [];
  let startCursor: string | undefined;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      start_cursor: startCursor,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    });

    pages.push(...response.results);
    startCursor = response.has_more ? response.next_cursor || undefined : undefined;
  } while (startCursor);

  return pages;
}

function compareKeywordRecords(left: any, right: any): number {
  const leftMonth = left.monthKey || left.createdAt || '';
  const rightMonth = right.monthKey || right.createdAt || '';

  const leftMonthValue = getSortDateValue(leftMonth);
  const rightMonthValue = getSortDateValue(rightMonth);
  if (leftMonthValue !== rightMonthValue) return rightMonthValue - leftMonthValue;

  const leftCreatedValue = getSortDateValue(left.createdAt);
  const rightCreatedValue = getSortDateValue(right.createdAt);
  if (leftCreatedValue !== rightCreatedValue) return rightCreatedValue - leftCreatedValue;

  return String(left.mainKeyword || '').localeCompare(String(right.mainKeyword || ''));
}

function getSortDateValue(value: string): number {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function pickKeywordMatchProperty(database: any): string {
  const properties = database?.properties || {};
  if (properties['Name']) return 'Name';
  if (properties['Main Keyword']) return 'Main Keyword';
  if (properties['Keyword']) return 'Keyword';
  const firstTitle = Object.entries(properties).find(([, prop]: any) => prop?.type === 'title');
  return firstTitle?.[0] ? String(firstTitle[0]) : 'Name';
}

function buildTextContainsFilter(property: string, value: string): any {
  return {
    property,
    rich_text: { contains: value },
  };
}

function buildContainsFilterForProperty(database: any, property: string, value: string): any {
  const prop = database?.properties?.[property];
  if (prop?.type === 'title') {
    return { property, title: { contains: value } };
  }
  if (prop?.type === 'rich_text') {
    return { property, rich_text: { contains: value } };
  }
  if (prop?.type === 'checkbox') {
    return { property, checkbox: { equals: true } };
  }
  if (prop?.type === 'select') {
    return { property, select: { equals: value } };
  }
  return { property, rich_text: { contains: value } };
}


function extractMonthKey(props: any): string {
  const candidates = ['Created at', 'Month', 'Blog Month', 'Article Month', 'Published', 'Published At', 'Date', 'Created'];

  for (const name of candidates) {
    const prop = props[name];
    if (!prop) continue;

    if (prop.type === 'date' && prop.date?.start) {
      return prop.date.start.slice(0, 7);
    }

    if (prop.type === 'select' && prop.select?.name) {
      const parsed = parseMonthText(prop.select.name);
      if (parsed) return parsed;
    }

    if (prop.type === 'rich_text' && prop.rich_text?.[0]?.plain_text) {
      const parsed = parseMonthText(prop.rich_text[0].plain_text);
      if (parsed) return parsed;
    }

    if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
      const parsed = parseMonthText(prop.title[0].plain_text);
      if (parsed) return parsed;
    }
  }

  return '';
}

function parseMonthText(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  return '';
}
