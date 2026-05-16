import { apiGet, apiPost } from '../api';
import { showToast } from '../utils';

export function renderSettings(): string {
  return `
    <div class="page" id="page-settings">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Configure your API keys and integrations</p>
      </div>

      <div class="grid-2">
        <div>
          <!-- Appearance -->
          <div class="settings-section">
            <div class="settings-section-title">
              <div class="settings-icon" style="background:var(--bg-card);">🌓</div>
              Appearance
            </div>
            <div class="theme-row">
              <div class="theme-copy">
                <div class="theme-title">Dark mode</div>
                <div class="theme-desc">Switch the entire app between light and dark appearance.</div>
              </div>
              <label class="theme-switch" aria-label="Dark mode toggle">
                <input type="checkbox" id="theme-toggle" />
                <span class="theme-slider"></span>
              </label>
            </div>
          </div>

          <!-- Notion -->
          <div class="settings-section">
            <div class="settings-section-title">
              <div class="settings-icon" style="background:var(--bg-card);">📋</div>
              Notion Integration
            </div>
            <div class="form-group">
              <label class="form-label">Notion API Key</label>
              <input type="password" class="form-input" id="set-notion-key" placeholder="ntn_xxxxxxxxxxxxx" />
            </div>
            <div class="form-group">
              <label class="form-label">Notion Database ID</label>
              <input type="text" class="form-input" id="set-notion-db" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <div class="form-hint">The ID of your keywords database in Notion</div>
            </div>
            <div class="form-group">
              <label class="form-label">Notion Blog Articles DB ID</label>
              <input type="text" class="form-input" id="set-notion-articles-db" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <div class="form-hint">The ID of your Blog Articles database in Notion (where generated blogs will be saved)</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary btn-sm" id="btn-test-notion">Test Connection</button>
              <button class="btn btn-primary btn-sm" id="btn-save-notion">Save</button>
            </div>
            <div class="test-result" id="test-notion-result"></div>
          </div>

          <!-- Strapi -->
          <div class="settings-section">
            <div class="settings-section-title">
              <div class="settings-icon" style="background:var(--bg-card);">🚀</div>
              Strapi CMS
            </div>
            <div class="form-group">
              <label class="form-label">Strapi URL</label>
              <input type="text" class="form-input" id="set-strapi-url" placeholder="http://localhost:1337" />
            </div>
            <div class="form-group">
              <label class="form-label">Strapi API Token</label>
              <input type="password" class="form-input" id="set-strapi-token" placeholder="Your Strapi API token" />
            </div>
            <div class="form-group">
              <label class="form-label">Content Type</label>
              <input type="text" class="form-input" id="set-strapi-type" placeholder="blog-post" value="blog-post" />
              <div class="form-hint">The Strapi collection slug (e.g., blog-post, articles, blogPost)</div>
            </div>
            <div class="theme-row">
              <div class="theme-copy">
                <div class="theme-title">Auto-publish to Strapi</div>
                <div class="theme-desc">Automatically publish blogs when saving, or save as drafts.</div>
              </div>
              <label class="theme-switch" aria-label="Auto-publish toggle">
                <input type="checkbox" id="set-strapi-autopublish" />
                <span class="theme-slider"></span>
              </label>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary btn-sm" id="btn-test-strapi">Test Connection</button>
              <button class="btn btn-primary btn-sm" id="btn-save-strapi">Save</button>
            </div>
            <div class="test-result" id="test-strapi-result"></div>
          </div>
        </div>

        <div>
          <!-- Gemini -->
          <div class="settings-section">
            <div class="settings-section-title">
              <div class="settings-icon" style="background:var(--bg-card);">💎</div>
              Google Gemini AI
            </div>
            <div class="form-group">
              <label class="form-label">Gemini API Key</label>
              <input type="password" class="form-input" id="set-gemini-key" placeholder="AIzaSy..." />
              <div class="form-hint">Get your key from <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--accent);">Google AI Studio</a></div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary btn-sm" id="btn-test-gemini">Test Connection</button>
              <button class="btn btn-primary btn-sm" id="btn-save-gemini">Save</button>
            </div>
            <div class="test-result" id="test-gemini-result"></div>
          </div>

          <!-- Claude via AgentRouter -->
          <div class="settings-section">
            <div class="settings-section-title">
              <div class="settings-icon" style="background:var(--bg-card);">🧠</div>
              Claude AI (via AgentRouter)
            </div>
            <div class="form-group">
              <label class="form-label">AgentRouter API Key</label>
              <input type="password" class="form-input" id="set-claude-key" placeholder="sk-G5CA..." />
              <div class="form-hint">Get your key from <a href="https://agentrouter.org/console/token" target="_blank" style="color:var(--accent);">AgentRouter Console</a></div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary btn-sm" id="btn-test-claude">Test Connection</button>
              <button class="btn btn-primary btn-sm" id="btn-save-claude">Save</button>
            </div>
            <div class="test-result" id="test-claude-result"></div>
          </div>

          <!-- Groq -->
          <div class="settings-section">
            <div class="settings-section-title">
              <div class="settings-icon" style="background:var(--bg-card);">⚡</div>
              Groq AI
            </div>
            <div class="form-group">
              <label class="form-label">Groq API Key</label>
              <input type="password" class="form-input" id="set-groq-key" placeholder="gsk_..." />
              <div class="form-hint">Get your key from <a href="https://console.groq.com/keys" target="_blank" style="color:var(--accent);">Groq Console</a></div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary btn-sm" id="btn-test-groq">Test Connection</button>
              <button class="btn btn-primary btn-sm" id="btn-save-groq">Save</button>
            </div>
            <div class="test-result" id="test-groq-result"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initSettingsPage(): void {
  // Load current settings
  loadCurrentSettings();
  loadThemeSetting();

  const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement | null;
  themeToggle?.addEventListener('change', () => {
    window.setTheme?.(themeToggle.checked ? 'dark' : 'light');
  });

  // Notion
  document.getElementById('btn-test-notion')?.addEventListener('click', async () => {
    const key = (document.getElementById('set-notion-key') as HTMLInputElement).value;
    const db = (document.getElementById('set-notion-db') as HTMLInputElement).value;
    const result = document.getElementById('test-notion-result')!;
    try {
      const data = await apiPost('/notion/test', { apiKey: key, databaseId: db });
      result.className = 'test-result success';
      result.textContent = `✓ Connected: ${data.title}`;
    } catch (e: any) {
      result.className = 'test-result error';
      result.textContent = `✗ ${e.message}`;
    }
  });

  document.getElementById('btn-save-notion')?.addEventListener('click', async () => {
    const key = (document.getElementById('set-notion-key') as HTMLInputElement).value;
    const db = (document.getElementById('set-notion-db') as HTMLInputElement).value;
    const articlesDb = (document.getElementById('set-notion-articles-db') as HTMLInputElement).value;
    await saveSettings({ NOTION_API_KEY: key, NOTION_DATABASE_ID: db, NOTION_ARTICLES_DATABASE_ID: articlesDb });
  });

  // Gemini
  document.getElementById('btn-test-gemini')?.addEventListener('click', async () => {
    const key = (document.getElementById('set-gemini-key') as HTMLInputElement).value;
    const result = document.getElementById('test-gemini-result')!;
    try {
      await apiPost('/generate/test', { provider: 'gemini', apiKey: key });
      result.className = 'test-result success';
      result.textContent = '✓ Gemini connected!';
    } catch (e: any) {
      result.className = 'test-result error';
      result.textContent = `✗ ${e.message}`;
    }
  });

  document.getElementById('btn-save-gemini')?.addEventListener('click', async () => {
    const key = (document.getElementById('set-gemini-key') as HTMLInputElement).value;
    await saveSettings({ GEMINI_API_KEY: key });
  });

  // Claude
  document.getElementById('btn-test-claude')?.addEventListener('click', async () => {
    const key = (document.getElementById('set-claude-key') as HTMLInputElement).value;
    const result = document.getElementById('test-claude-result')!;
    try {
      await apiPost('/generate/test', { provider: 'claude', apiKey: key });
      result.className = 'test-result success';
      result.textContent = '✓ Claude connected!';
    } catch (e: any) {
      result.className = 'test-result error';
      result.textContent = `✗ ${e.message}`;
    }
  });

  document.getElementById('btn-save-claude')?.addEventListener('click', async () => {
    const key = (document.getElementById('set-claude-key') as HTMLInputElement).value;
    await saveSettings({ ANTHROPIC_API_KEY: key });
  });

  // Groq
  document.getElementById('btn-test-groq')?.addEventListener('click', async () => {
    const key = (document.getElementById('set-groq-key') as HTMLInputElement).value;
    const result = document.getElementById('test-groq-result')!;
    try {
      await apiPost('/generate/test', { provider: 'groq', apiKey: key });
      result.className = 'test-result success';
      result.textContent = '✓ Groq connected!';
    } catch (e: any) {
      result.className = 'test-result error';
      result.textContent = `✗ ${e.message}`;
    }
  });

  document.getElementById('btn-save-groq')?.addEventListener('click', async () => {
    const key = (document.getElementById('set-groq-key') as HTMLInputElement).value;
    await saveSettings({ GROQ_API_KEY: key });
  });

  // Strapi
  document.getElementById('btn-test-strapi')?.addEventListener('click', async () => {
    const url = (document.getElementById('set-strapi-url') as HTMLInputElement).value;
    const token = (document.getElementById('set-strapi-token') as HTMLInputElement).value;
    const result = document.getElementById('test-strapi-result')!;
    try {
      await apiPost('/strapi/test', { strapiUrl: url, apiToken: token });
      result.className = 'test-result success';
      result.textContent = '✓ Strapi connected!';
    } catch (e: any) {
      result.className = 'test-result error';
      result.textContent = `✗ ${e.message}`;
    }
  });

  document.getElementById('btn-save-strapi')?.addEventListener('click', async () => {
    const url = (document.getElementById('set-strapi-url') as HTMLInputElement).value;
    const token = (document.getElementById('set-strapi-token') as HTMLInputElement).value;
    const contentType = (document.getElementById('set-strapi-type') as HTMLInputElement).value;
    const autopublish = (document.getElementById('set-strapi-autopublish') as HTMLInputElement).checked;
    localStorage.setItem('strapi_autopublish', String(autopublish));
    await saveSettings({ STRAPI_URL: url, STRAPI_API_TOKEN: token, STRAPI_CONTENT_TYPE: contentType });
  });
}

function loadThemeSetting(): void {
  const savedTheme = localStorage.getItem('blogforge_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : (prefersDark ? 'dark' : 'light');
  const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement | null;
  if (themeToggle) {
    themeToggle.checked = theme === 'dark';
  }
}

async function loadCurrentSettings(): Promise<void> {
  try {
    const data = await apiGet('/settings');
    const s = data.settings || {};
    if (s.NOTION_API_KEY) (document.getElementById('set-notion-key') as HTMLInputElement).placeholder = s.NOTION_API_KEY;
    if (s.NOTION_DATABASE_ID) (document.getElementById('set-notion-db') as HTMLInputElement).placeholder = s.NOTION_DATABASE_ID;
    if (s.NOTION_ARTICLES_DATABASE_ID) (document.getElementById('set-notion-articles-db') as HTMLInputElement).placeholder = s.NOTION_ARTICLES_DATABASE_ID;
    if (s.GEMINI_API_KEY) (document.getElementById('set-gemini-key') as HTMLInputElement).placeholder = s.GEMINI_API_KEY;
    if (s.ANTHROPIC_API_KEY) (document.getElementById('set-claude-key') as HTMLInputElement).placeholder = s.ANTHROPIC_API_KEY;
    if (s.GROQ_API_KEY) (document.getElementById('set-groq-key') as HTMLInputElement).placeholder = s.GROQ_API_KEY;
    if (s.STRAPI_URL) (document.getElementById('set-strapi-url') as HTMLInputElement).placeholder = s.STRAPI_URL;
    if (s.STRAPI_API_TOKEN) (document.getElementById('set-strapi-token') as HTMLInputElement).placeholder = s.STRAPI_API_TOKEN;
    if (s.STRAPI_CONTENT_TYPE) (document.getElementById('set-strapi-type') as HTMLInputElement).placeholder = s.STRAPI_CONTENT_TYPE;
    
    // Load autopublish setting
    const autopublish = localStorage.getItem('strapi_autopublish') === 'true';
    const autopublishToggle = document.getElementById('set-strapi-autopublish') as HTMLInputElement | null;
    if (autopublishToggle) {
      autopublishToggle.checked = autopublish;
    }
  } catch {}
}

async function saveSettings(settings: Record<string, string>): Promise<void> {
  try {
    await apiPost('/settings', settings);
    showToast('Settings saved!', 'success');
  } catch (e: any) {
    showToast(e.message, 'error');
  }
}
