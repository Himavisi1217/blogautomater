import { apiGet } from '../api';
import { showToast } from '../utils';

let cachedKeywords: any[] = [];

export function renderKeywords(): string {
  return `
    <div class="page" id="page-keywords">
      <div class="page-header">
        <h1 class="page-title">Keywords</h1>
        <p class="page-subtitle">Synced from your Notion database</p>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:24px;align-items:center;">
        <button class="btn btn-primary" id="btn-fetch-keywords">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
          Sync from Notion
        </button>
        <button class="btn btn-secondary" id="btn-use-keyword" disabled>
          Use Selected for Generation
        </button>
      </div>

      <div class="card" id="keywords-container">
        <div id="keywords-table">
          ${cachedKeywords.length > 0 ? renderKeywordsTable(cachedKeywords) : `
            <div class="empty-state">
              <div class="empty-state-icon">🔑</div>
              <div class="empty-state-title">No keywords loaded</div>
              <p>Click "Sync from Notion" to fetch your keywords database.</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderKeywordsTable(keywords: any[]): string {
  return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th></th>
            <th>Main Keyword</th>
            <th>Secondary Keywords</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Tone</th>
            <th>Words</th>
          </tr>
        </thead>
        <tbody>
          ${keywords.map((kw, i) => `
            <tr>
              <td><input type="radio" name="keyword-select" value="${i}" class="keyword-radio" /></td>
              <td><strong>${kw.mainKeyword}</strong></td>
              <td>${kw.secondaryKeywords || '<span style="color:var(--text-muted)">None</span>'}</td>
              <td><span class="badge badge-${kw.status === 'done' ? 'done' : kw.status === 'generating' ? 'generating' : 'pending'}">${kw.status || 'pending'}</span></td>
              <td>${kw.priority || 'medium'}</td>
              <td>${kw.tone || 'conversational'}</td>
              <td>${kw.wordCount || 1500}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function initKeywordsPage(): void {
  const fetchBtn = document.getElementById('btn-fetch-keywords');
  const useBtn = document.getElementById('btn-use-keyword') as HTMLButtonElement;

  fetchBtn?.addEventListener('click', async () => {
    fetchBtn.textContent = 'Syncing...';
    (fetchBtn as HTMLButtonElement).disabled = true;
    try {
      const data = await apiGet('/notion/keywords');
      cachedKeywords = data.keywords;
      document.getElementById('keywords-table')!.innerHTML = renderKeywordsTable(cachedKeywords);
      showToast(`Fetched ${data.total} keywords from Notion`, 'success');
      attachRadioListeners();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      fetchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> Sync from Notion`;
      (fetchBtn as HTMLButtonElement).disabled = false;
    }
  });

  useBtn?.addEventListener('click', () => {
    const selected = document.querySelector('input[name="keyword-select"]:checked') as HTMLInputElement;
    if (selected && cachedKeywords[parseInt(selected.value)]) {
      const kw = cachedKeywords[parseInt(selected.value)];
      // Store selected keyword and navigate to generate page
      sessionStorage.setItem('selectedKeyword', JSON.stringify(kw));
      window.navigateTo('generate');
    }
  });

  attachRadioListeners();
}

function attachRadioListeners() {
  const useBtn = document.getElementById('btn-use-keyword') as HTMLButtonElement;
  document.querySelectorAll('.keyword-radio').forEach(radio => {
    radio.addEventListener('change', () => {
      if (useBtn) useBtn.disabled = false;
    });
  });
}
