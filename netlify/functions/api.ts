import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import { notionRouter } from '../../server/routes/notion.js';
import { generateRouter } from '../../server/routes/generate.js';
import { strapiRouter } from '../../server/routes/strapi.js';
import { keywordResearchRouter } from '../../server/routes/keyword-research.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes — mounted under /.netlify/functions/api
app.use('/api/notion', notionRouter);
app.use('/api/generate', generateRouter);
app.use('/api/strapi', strapiRouter);
app.use('/api/keyword-research', keywordResearchRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Settings — read-only on Netlify (env vars set in dashboard)
app.get('/api/settings', (_req, res) => {
  const keys = ['NOTION_API_KEY', 'NOTION_DATABASE_ID', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'GROQ_API_KEY', 'STRAPI_URL', 'STRAPI_API_TOKEN'];
  const masked: Record<string, string> = {};
  const configured: Record<string, boolean> = {};

  for (const key of keys) {
    const val = process.env[key] || '';
    if (val && val.length > 8 && !val.includes('your_')) {
      masked[key] = val.substring(0, 4) + '****' + val.substring(val.length - 4);
    } else {
      masked[key] = '';
    }
  }

  configured['notion'] = !!(process.env.NOTION_API_KEY && !process.env.NOTION_API_KEY.includes('your_'));
  configured['gemini'] = !!(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_'));
  configured['anthropic'] = !!(process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your_'));
  configured['groq'] = !!(process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your_'));
  configured['strapi'] = !!(process.env.STRAPI_API_TOKEN && !process.env.STRAPI_API_TOKEN.includes('your_'));

  res.json({ settings: masked, configured });
});

export const handler = serverless(app);
