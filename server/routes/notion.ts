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

    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    });

    const keywords = response.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        mainKeyword: extractTextProperty(props, 'Main Keyword') || extractTextProperty(props, 'Name') || extractTextProperty(props, 'Keyword') || '',
        secondaryKeywords: extractTextProperty(props, 'Secondary Keywords') || '',
        status: extractSelectProperty(props, 'Status') || 'pending',
        priority: extractSelectProperty(props, 'Priority') || 'medium',
        tone: extractSelectProperty(props, 'Tone') || 'conversational',
        wordCount: extractNumberProperty(props, 'Word Count') || 1500,
        createdAt: page.created_time,
        lastEdited: page.last_edited_time,
      };
    });

    res.json({ keywords, total: response.results.length });
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

// Helper functions to extract Notion properties
function extractTextProperty(props: any, name: string): string {
  const prop = props[name];
  if (!prop) return '';
  if (prop.type === 'title') return prop.title?.[0]?.plain_text || '';
  if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '';
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
