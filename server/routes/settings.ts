import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const settingsRouter = Router();

const SETTINGS_FILE = path.join(__dirname, '..', '..', '.env');

// Get current settings (masked)
settingsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const settings = loadEnvFile();
    // Mask sensitive values
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (value && value.length > 8) {
        masked[key] = value.substring(0, 4) + '****' + value.substring(value.length - 4);
      } else if (value) {
        masked[key] = '****';
      } else {
        masked[key] = '';
      }
    }
    res.json({ settings: masked, configured: getConfiguredStatus(settings) });
  } catch {
    res.json({ settings: {}, configured: {} });
  }
});

// Update settings
settingsRouter.post('/', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const current = loadEnvFile();

    // Merge updates
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string' && value.trim()) {
        current[key] = value.trim();
      }
    }

    // Write back
    const envContent = Object.entries(current)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(SETTINGS_FILE, envContent + '\n');

    // Reload env vars
    for (const [key, value] of Object.entries(current)) {
      process.env[key] = value;
    }

    res.json({ success: true, message: 'Settings saved' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function loadEnvFile(): Record<string, string> {
  const settings: Record<string, string> = {};
  try {
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          settings[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
        }
      }
    }
  } catch {
    // File doesn't exist yet
  }
  return settings;
}

function getConfiguredStatus(settings: Record<string, string>): Record<string, boolean> {
  return {
    notion: !!(settings.NOTION_API_KEY && settings.NOTION_DATABASE_ID && 
              !settings.NOTION_API_KEY.includes('your_')),
    gemini: !!(settings.GEMINI_API_KEY && !settings.GEMINI_API_KEY.includes('your_')),
    anthropic: !!(settings.ANTHROPIC_API_KEY && !settings.ANTHROPIC_API_KEY.includes('your_')),
    strapi: !!(settings.STRAPI_API_TOKEN && !settings.STRAPI_API_TOKEN.includes('your_')),
  };
}
