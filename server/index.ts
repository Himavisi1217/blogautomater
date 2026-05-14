import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { notionRouter } from './routes/notion.js';
import { generateRouter } from './routes/generate.js';
import { strapiRouter } from './routes/strapi.js';
import { settingsRouter } from './routes/settings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/notion', notionRouter);
app.use('/api/generate', generateRouter);
app.use('/api/strapi', strapiRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Blog Automation Server running on http://localhost:${PORT}`);
});
