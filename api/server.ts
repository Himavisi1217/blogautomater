import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import express from 'express';
import cors from 'cors';
import { notionRouter } from '../server/routes/notion.js';
import { generateRouter } from '../server/routes/generate.js';
import { strapiRouter } from '../server/routes/strapi.js';
import { settingsRouter } from '../server/routes/settings.js';
import { keywordResearchRouter } from '../server/routes/keyword-research.js';
import { authRouter } from '../server/routes/auth.js';

// Create Express app
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/notion', notionRouter);
app.use('/api/generate', generateRouter);
app.use('/api/strapi', strapiRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/keyword-research', keywordResearchRouter);
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vercel serverless handler
export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};
