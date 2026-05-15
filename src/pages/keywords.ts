import { apiGet } from '../api';
import { showToast } from '../utils';

let cachedKeywords: any[] = [];
let selectedMonthFilter = 'all';

export function renderKeywords(): string {
  const monthOptions = getMonthOptions(cachedKeywords);

  return `
    <div class="page" id="page-keywords">
      <div class="page-header">
        <h1 class="page-title">Keywords</h1>
        <p class="page-subtitle">Synced from your Notion database</p>
      </div>

      <div class="keywords-toolbar">
        <div class="keywords-actions">
          <button class="btn btn-primary" id="btn-fetch-keywords">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Sync from Notion
          </button>
          <button class="btn btn-secondary" id="btn-use-keyword" disabled>
            Use Selected for Generation
          </button>
        </div>
        <div class="keywords-filter">
          <label class="form-label" for="month-filter" style="margin:0;">Month</label>
          <select class="form-select" id="month-filter">
            <option value="all" ${selectedMonthFilter === 'all' ? 'selected' : ''}>All months</option>
            ${monthOptions.map(month => `<option value="${month.value}" ${selectedMonthFilter === month.value ? 'selected' : ''}>${month.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="card" id="keywords-container">
        <div id="keywords-table">
          ${renderKeywordsContent(cachedKeywords, selectedMonthFilter)}
        </div>
      </div>
    </div>
  `;
}

function renderKeywordsContent(keywords: any[], monthFilter: string): string {
  const filteredKeywords = monthFilter === 'all'
    ? keywords
    : keywords.filter(keyword => getMonthValue(keyword.monthKey || keyword.createdAt) === monthFilter);

  if (filteredKeywords.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🔑</div>
        <div class="empty-state-title">No keywords loaded</div>
        <p>Click "Sync from Notion" to fetch your keywords database.</p>
      </div>
    `;
  }

  const grouped = groupKeywordsByMonth(filteredKeywords);

  return `
    ${grouped.map(group => `
      <div class="month-group">
        <div class="month-group-header">
          <span>${group.label}</span>
          <span class="month-group-count">${group.items.length} posts</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Main Keyword</th>
                <th>Secondary Keywords</th>
                <th>Status</th>
                <th>Month</th>
              </tr>
            </thead>
            <tbody>
              ${group.items.map((kw, i) => {
                const statusLabel = kw.blogWritten ? 'Pushed' : 'Not pushed';
                const statusClass = kw.blogWritten ? 'done' : 'pending';
                const monthLabel = formatMonthLabel(getMonthValue(kw.monthKey || kw.createdAt));
                return `
                  <tr>
                    <td><input type="radio" name="keyword-select" value="${kw._index}" class="keyword-radio" /></td>
                    <td><strong>${kw.mainKeyword}</strong></td>
                    <td>${kw.secondaryKeywords || '<span style="color:var(--text-muted)">None</span>'}</td>
                    <td><span class="badge badge-${statusClass}">${statusLabel}</span></td>
                    <td>${monthLabel}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}
  `;
}

export function initKeywordsPage(): void {
  const fetchBtn = document.getElementById('btn-fetch-keywords');
  const useBtn = document.getElementById('btn-use-keyword') as HTMLButtonElement;
  const monthFilter = document.getElementById('month-filter') as HTMLSelectElement | null;

  monthFilter?.addEventListener('change', () => {
    selectedMonthFilter = monthFilter.value;
    document.getElementById('keywords-table')!.innerHTML = renderKeywordsContent(cachedKeywords, selectedMonthFilter);
    attachRadioListeners();
  });

  fetchBtn?.addEventListener('click', async () => {
    fetchBtn.textContent = 'Syncing...';
    (fetchBtn as HTMLButtonElement).disabled = true;
    try {
      const data = await apiGet('/notion/keywords');
      cachedKeywords = (data.keywords || [])
        .slice()
        .sort(compareKeywords)
        .map((keyword: any, index: number) => ({ ...keyword, _index: index }));

      selectedMonthFilter = 'all';
      refreshMonthFilterOptions();
      document.getElementById('month-filter')!.value = 'all';
      document.getElementById('keywords-table')!.innerHTML = renderKeywordsContent(cachedKeywords, selectedMonthFilter);
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

function refreshMonthFilterOptions() {
  const monthFilter = document.getElementById('month-filter') as HTMLSelectElement | null;
  if (!monthFilter) return;

  const monthOptions = getMonthOptions(cachedKeywords);
  monthFilter.innerHTML = `
    <option value="all" ${selectedMonthFilter === 'all' ? 'selected' : ''}>All months</option>
    ${monthOptions.map(month => `<option value="${month.value}" ${selectedMonthFilter === month.value ? 'selected' : ''}>${month.label}</option>`).join('')}
  `;
}

function attachRadioListeners() {
  const useBtn = document.getElementById('btn-use-keyword') as HTMLButtonElement;
  document.querySelectorAll('.keyword-radio').forEach(radio => {
    radio.addEventListener('change', () => {
      if (useBtn) useBtn.disabled = false;
    });
  });
}

function groupKeywordsByMonth(keywords: any[]): Array<{ value: string; label: string; items: any[] }> {
  const grouped = new Map<string, any[]>();

  keywords.forEach(keyword => {
    const monthValue = getMonthValue(keyword.monthKey || keyword.createdAt);
    const bucket = grouped.get(monthValue) || [];
    bucket.push(keyword);
    grouped.set(monthValue, bucket);
  });

  return Array.from(grouped.entries())
    .sort(([leftMonth], [rightMonth]) => compareMonthValues(leftMonth, rightMonth))
    .map(([value, items]) => ({
      value,
      label: formatMonthLabel(value),
      items: items.slice().sort(compareKeywords),
    }));
}

function getMonthOptions(keywords: any[]): Array<{ value: string; label: string }> {
  const months = Array.from(new Set(keywords.map(keyword => getMonthValue(keyword.monthKey || keyword.createdAt)).filter(Boolean)))
    .sort((leftMonth, rightMonth) => compareMonthValues(leftMonth, rightMonth));
  return months.map(value => ({ value, label: formatMonthLabel(value) }));
}

function getMonthValue(dateString: string): string {
  if (!dateString) return 'unknown';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(value: string): string {
  if (value === 'unknown') return 'Unknown month';
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

function compareKeywords(left: any, right: any): number {
  const leftMonth = getMonthValue(left.monthKey || left.createdAt);
  const rightMonth = getMonthValue(right.monthKey || right.createdAt);
  const monthComparison = compareMonthValues(leftMonth, rightMonth);
  if (monthComparison !== 0) return monthComparison;

  const leftTime = new Date(left.createdAt || 0).getTime();
  const rightTime = new Date(right.createdAt || 0).getTime();
  if (rightTime !== leftTime) return rightTime - leftTime;

  const leftTitle = String(left.mainKeyword || '').toLowerCase();
  const rightTitle = String(right.mainKeyword || '').toLowerCase();
  return leftTitle.localeCompare(rightTitle);
}

function compareMonthValues(leftMonth: string, rightMonth: string): number {
  if (leftMonth === rightMonth) return 0;
  if (leftMonth === 'unknown') return 1;
  if (rightMonth === 'unknown') return -1;

  const leftDate = monthValueToDate(leftMonth);
  const rightDate = monthValueToDate(rightMonth);
  return rightDate.getTime() - leftDate.getTime();
}

function monthValueToDate(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}
