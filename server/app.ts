import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { notionRouter } from './routes/notion.js';
import { generateRouter } from './routes/generate.js';
import { strapiRouter } from './routes/strapi.js';
import { settingsRouter } from './routes/settings.js';
import { keywordResearchRouter } from './routes/keyword-research.js';
import { authRouter } from './routes/auth.js';
import { buildSettingsResponse } from './lib/settings.js';

export interface CreateAppOptions {
  includeMutableSettings?: boolean;
}

export function createApp({ includeMutableSettings = false }: CreateAppOptions = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/notion', notionRouter);
  app.use('/api/generate', generateRouter);
  app.use('/api/strapi', strapiRouter);
  app.use('/api/keyword-research', keywordResearchRouter);
  app.use('/api/auth', authRouter);

  if (includeMutableSettings) {
    app.use('/api/settings', settingsRouter);
  } else {
    app.get('/api/settings', (_req, res) => {
      res.json(buildSettingsResponse(process.env));
    });
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}