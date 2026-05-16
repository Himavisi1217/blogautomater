export const SETTINGS_KEYS = [
  'NOTION_API_KEY',
  'NOTION_DATABASE_ID',
  'GEMINI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GROQ_API_KEY',
  'STRAPI_URL',
  'STRAPI_API_TOKEN',
] as const;

export function buildSettingsResponse(settingsSource: Record<string, string | undefined>): {
  settings: Record<string, string>;
  configured: Record<string, boolean>;
} {
  const settings: Record<string, string> = {};

  for (const key of SETTINGS_KEYS) {
    const value = settingsSource[key] || '';

    if (value && value.length > 8 && !value.includes('your_')) {
      settings[key] = value.substring(0, 4) + '****' + value.substring(value.length - 4);
    } else if (value) {
      settings[key] = '****';
    } else {
      settings[key] = '';
    }
  }

  return {
    settings,
    configured: {
      notion: !!(settingsSource.NOTION_API_KEY && settingsSource.NOTION_API_KEY.includes('your_') === false && settingsSource.NOTION_DATABASE_ID),
      gemini: !!(settingsSource.GEMINI_API_KEY && !settingsSource.GEMINI_API_KEY.includes('your_')),
      anthropic: !!(settingsSource.ANTHROPIC_API_KEY && !settingsSource.ANTHROPIC_API_KEY.includes('your_')),
      groq: !!(settingsSource.GROQ_API_KEY && !settingsSource.GROQ_API_KEY.includes('your_')),
      strapi: !!(settingsSource.STRAPI_API_TOKEN && !settingsSource.STRAPI_API_TOKEN.includes('your_')),
    },
  };
}