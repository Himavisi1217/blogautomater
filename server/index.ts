import dotenv from 'dotenv';
dotenv.config(); // MUST be first — loads .env before any route modules read process.env

import express from 'express';
import cors from 'cors';
import { notionRouter } from './routes/notion.js';
import { generateRouter } from './routes/generate.js';
import { strapiRouter } from './routes/strapi.js';
import { settingsRouter } from './routes/settings.js';
import { keywordResearchRouter } from './routes/keyword-research.js';
import { authRouter } from './routes/auth.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Blog Automation Server running on http://localhost:${PORT}`);
});
