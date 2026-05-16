import { showToast } from '../utils';

export function renderSettings(): string {
  return `
    <div class="page" id="page-settings">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Appearance and publishing</p>
      </div>

      <div class="grid-2">
        <div>
          <!-- Appearance -->
          <div class="settings-section">
            <div class="settings-section-title">
              <div class="settings-icon" style="background:var(--bg-card);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg></div>
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

          <!-- Publishing -->
          <div class="settings-section">
            <div class="settings-section-title">
              <div class="settings-icon" style="background:var(--bg-card);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 22s4-1 6-3 3-6 3-6 4 2 6 4 3 6 3 6-4 0-8-2-6-1-10 1z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg></div>
              Publishing
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
          </div>
        </div>

        <div>
          <!-- intentionally empty: settings simplified -->
        </div>
      </div>
    </div>
  `;
}

export function initSettingsPage(): void {
  loadThemeSetting();

  const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement | null;
  themeToggle?.addEventListener('change', () => {
    window.setTheme?.(themeToggle.checked ? 'dark' : 'light');
    localStorage.setItem('blogforge_theme', themeToggle.checked ? 'dark' : 'light');
    showToast('Appearance updated', 'success');
  });

  // Auto-publish toggle
  const autopublishToggle = document.getElementById('set-strapi-autopublish') as HTMLInputElement | null;
  if (autopublishToggle) {
    autopublishToggle.checked = localStorage.getItem('strapi_autopublish') === 'true';
    autopublishToggle.addEventListener('change', () => {
      localStorage.setItem('strapi_autopublish', String(autopublishToggle.checked));
      showToast('Auto-publish preference saved', 'success');
    });
  }
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
