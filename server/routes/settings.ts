import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSettingsResponse } from '../lib/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const settingsRouter = Router();

const SETTINGS_FILE = path.join(__dirname, '..', '..', '.env');

// Get current settings (masked)
settingsRouter.get('/', (_req: Request, res: Response) => {
  try {
    res.json(buildSettingsResponse(loadEnvFile()));
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

