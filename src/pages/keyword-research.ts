import { apiGet, apiPost } from '../api';
import { showToast } from '../utils';

const STORAGE_KEY = 'blogforge_keyword_research';

interface KeywordGroup {
  primary: string;
  secondary: string[];
  sources?: string[];
  score?: number;
  indexed?: boolean;
  indexResultCount?: number;
  intent?: string;
  competitor?: string;
}

let lastPack: KeywordGroup[] = [];
let activeTab = 'discover';

function loadSaved(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) lastPack = JSON.parse(raw);
  } catch {
    lastPack = [];
  }
}

function savePack(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lastPack));
}

function sourceBadges(sources?: string[]): string {
  if (!sources?.length) return '';
  return sources
    .map((s) => `<span class="kr-source kr-${s}">${s}</span>`)
    .join('');
}

function renderPackTable(pack: KeywordGroup[]): string {
  if (!pack.length) {
    return `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No keyword pack yet</div><p>Run discovery to fetch live suggestions from Google, Bing, and DuckDuckGo.</p></div>`;
  }

  return `
    <div class="table-wrapper">
      <table class="data-table kr-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Primary Keyword</th>
            <th>Secondary (×3)</th>
            <th>Sources</th>
            <th>Index</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${pack
            .map(
              (g, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${escapeHtml(g.primary)}</strong>
                ${g.intent ? `<span class="badge badge-pending" style="margin-left:6px;font-size:0.7rem;">${g.intent}</span>` : ''}
                ${g.competitor ? `<div class="kr-meta">via ${escapeHtml(g.competitor)}</div>` : ''}
              </td>
              <td class="kr-secondary">${(g.secondary || []).map((s) => `<span>${escapeHtml(s)}</span>`).join('')}</td>
              <td>${sourceBadges(g.sources)}</td>
              <td>${
                g.indexed === undefined
                  ? '<span style="color:var(--text-muted)">—</span>'
                  : g.indexed
                    ? `<span class="badge badge-done">Indexed</span>`
                    : `<span class="badge badge-pending">Not found</span>`
              }</td>
              <td><button class="btn btn-secondary btn-sm kr-use-one" data-i="${i}">Use</button></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderKeywordResearch(): string {
  loadSaved();
  return `
    <div class="page" id="page-keyword-research">
      <div class="page-header">
        <h1 class="page-title">Keyword Research</h1>
        <p class="page-subtitle">Live SERP data for pilotup.io — AI employees MVP (Google, Bing, DuckDuckGo)</p>
      </div>

      <div class="kr-tabs">
        <button class="kr-tab ${activeTab === 'discover' ? 'active' : ''}" data-tab="discover">Discover Pack</button>
        <button class="kr-tab ${activeTab === 'competitors' ? 'active' : ''}" data-tab="competitors">Competitors</button>
        <button class="kr-tab ${activeTab === 'search' ? 'active' : ''}" data-tab="search">Live Search</button>
      </div>

      <div id="kr-panel-discover" class="kr-panel" style="display:${activeTab === 'discover' ? 'block' : 'none'}">
        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:16px;font-size:1rem;">Generate 30 primary + 3 secondary keywords</h3>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group">
              <label class="form-label">Core topic</label>
              <input type="text" class="form-input" id="kr-topic" value="ai employees" />
            </div>
            <div class="form-group">
              <label class="form-label">Target domain</label>
              <input type="text" class="form-input" id="kr-domain" value="pilotup.io" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Extra seed phrases (comma-separated)</label>
            <input type="text" class="form-input" id="kr-seeds" placeholder="virtual ai staff, autonomous business agents" />
          </div>
          <div class="form-group">
            <label class="form-label">Competitor domains (comma-separated)</label>
            <input type="text" class="form-input" id="kr-competitors" value="sintra.ai, artisan.co, relevanceai.com, crewai.com" />
          </div>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:0.85rem;color:var(--text-secondary);">
            <input type="checkbox" id="kr-use-ai" checked /> Cluster with Claude (AgentRouter) — only uses fetched candidates
          </label>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:0.85rem;color:var(--text-secondary);">
            <input type="checkbox" id="kr-probe-index" checked /> Probe index status (DuckDuckGo site: search)
          </label>
          <button class="btn btn-primary" id="btn-kr-discover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            Discover Keywords
          </button>
          <p class="form-hint" style="margin-top:12px;">Fetches real autocomplete data — no invented keywords. Takes 1–3 minutes.</p>
        </div>

        <div id="kr-discover-meta" class="kr-meta-bar" style="display:none;"></div>

        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" id="btn-kr-export-notion" disabled>Export to Notion</button>
          <button class="btn btn-secondary btn-sm" id="btn-kr-download" disabled>Download JSON</button>
        </div>

        <div class="card" id="kr-pack-container">${renderPackTable(lastPack)}</div>
      </div>

      <div id="kr-panel-competitors" class="kr-panel" style="display:${activeTab === 'competitors' ? 'block' : 'none'}">
        <div class="card">
          <div class="form-group">
            <label class="form-label">Topic to analyze on competitor sites</label>
            <input type="text" class="form-input" id="kr-comp-topic" value="ai employees" />
          </div>
          <div class="form-group">
            <label class="form-label">Competitor domains</label>
            <textarea class="form-input" id="kr-comp-list" rows="3">sintra.ai
artisan.co
relevanceai.com
crewai.com
multion.ai</textarea>
          </div>
          <button class="btn btn-primary" id="btn-kr-competitors">Analyze Competitors</button>
          <div id="kr-comp-results" style="margin-top:20px;"></div>
        </div>
      </div>

      <div id="kr-panel-search" class="kr-panel" style="display:${activeTab === 'search' ? 'block' : 'none'}">
        <div class="card">
          <div class="form-group">
            <label class="form-label">Search query</label>
            <div style="display:flex;gap:8px;">
              <input type="text" class="form-input" id="kr-search-q" placeholder="ai employees for small business" style="flex:1;" />
              <button class="btn btn-primary" id="btn-kr-search">Search</button>
            </div>
          </div>
          <div id="kr-search-results"></div>
        </div>
      </div>
    </div>
  `;
}

export function initKeywordResearchPage(): void {
  loadSaved();
  bindTabs();
  bindDiscover();
  bindCompetitors();
  bindSearch();
  bindPackActions();
}

function bindTabs(): void {
  document.querySelectorAll('.kr-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeTab = (tab as HTMLElement).dataset.tab || 'discover';
      document.querySelectorAll('.kr-tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.kr-panel').forEach((p) => {
        (p as HTMLElement).style.display = 'none';
      });
      const panel = document.getElementById(`kr-panel-${activeTab}`);
      if (panel) panel.style.display = 'block';
    });
  });
}

function bindDiscover(): void {
  document.getElementById('btn-kr-discover')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-kr-discover') as HTMLButtonElement;
    const topic = (document.getElementById('kr-topic') as HTMLInputElement).value.trim();
    const domain = (document.getElementById('kr-domain') as HTMLInputElement).value.trim();
    const seedsRaw = (document.getElementById('kr-seeds') as HTMLInputElement).value;
    const compRaw = (document.getElementById('kr-competitors') as HTMLInputElement).value;
    const useAI = (document.getElementById('kr-use-ai') as HTMLInputElement).checked;
    const probeIndex = (document.getElementById('kr-probe-index') as HTMLInputElement).checked;

    btn.disabled = true;
    btn.textContent = 'Fetching live SERP data…';

    try {
      const data = await apiPost('/keyword-research/discover', {
        topic,
        domain,
        brandFocus: 'AI employees MVP — PilotUP',
        extraSeeds: seedsRaw.split(',').map((s) => s.trim()).filter(Boolean),
        competitors: compRaw.split(',').map((s) => s.trim()).filter(Boolean),
        useAI,
        probeIndex,
      });

      lastPack = data.keywords || [];
      savePack();

      const meta = document.getElementById('kr-discover-meta')!;
      meta.style.display = 'block';
      meta.innerHTML = `
        <span>${data.totalCandidates} candidates</span>
        <span>Google: ${data.sourceBreakdown?.google || 0}</span>
        <span>Bing: ${data.sourceBreakdown?.bing || 0}</span>
        <span>DDG: ${data.sourceBreakdown?.duckduckgo || 0}</span>
        <span>Competitor: ${data.sourceBreakdown?.competitor || 0}</span>
        <span>${data.usedAI ? 'Claude clustered' : 'Rule-based pack'}</span>
      `;

      document.getElementById('kr-pack-container')!.innerHTML = renderPackTable(lastPack);
      (document.getElementById('btn-kr-export-notion') as HTMLButtonElement).disabled = false;
      (document.getElementById('btn-kr-download') as HTMLButtonElement).disabled = false;

      bindPackActions();
      showToast(`Loaded ${lastPack.length} keyword groups from live search data`, 'success');
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Discover Keywords';
    }
  });
}

function bindCompetitors(): void {
  document.getElementById('btn-kr-competitors')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-kr-competitors') as HTMLButtonElement;
    const topic = (document.getElementById('kr-comp-topic') as HTMLInputElement).value.trim();
    const competitors = (document.getElementById('kr-comp-list') as HTMLTextAreaElement).value
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    btn.disabled = true;
    btn.textContent = 'Analyzing…';

    try {
      const data = await apiPost('/keyword-research/competitors', { topic, competitors });
      const el = document.getElementById('kr-comp-results')!;
      const kws = data.keywords || [];
      el.innerHTML = `
        <p class="form-hint" style="margin-bottom:12px;">${kws.length} competitor-related phrases from live suggest APIs</p>
        <div class="kr-chip-list">
          ${kws
            .slice(0, 80)
            .map(
              (k: { keyword: string; competitor?: string; sources: string[] }) =>
                `<span class="kr-chip" title="${k.sources?.join(', ')}">${escapeHtml(k.keyword)}${k.competitor ? ` · ${k.competitor}` : ''}</span>`
            )
            .join('')}
        </div>
      `;
      showToast(`Found ${kws.length} competitor keywords`, 'success');
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Analyze Competitors';
    }
  });
}

function bindSearch(): void {
  const run = async () => {
    const q = (document.getElementById('kr-search-q') as HTMLInputElement).value.trim();
    if (!q) return;
    const el = document.getElementById('kr-search-results')!;
    el.innerHTML = '<p style="color:var(--text-muted)">Searching…</p>';
    try {
      const data = await apiGet(`/keyword-research/suggest?q=${encodeURIComponent(q)}`);
      const items = data.suggestions || [];
      const bySource: Record<string, string[]> = { google: [], bing: [], duckduckgo: [] };
      for (const s of items) {
        bySource[s.source]?.push(s.keyword);
      }
      el.innerHTML = ['google', 'bing', 'duckduckgo']
        .map(
          (src) => `
        <div class="kr-search-block">
          <h4>${src.charAt(0).toUpperCase() + src.slice(1)}</h4>
          <div class="kr-chip-list">${(bySource[src] || []).map((k: string) => `<span class="kr-chip">${escapeHtml(k)}</span>`).join('') || '<span style="color:var(--text-muted)">No results</span>'}</div>
        </div>
      `
        )
        .join('');
    } catch (e: unknown) {
      el.innerHTML = `<p style="color:var(--danger)">${escapeHtml((e as Error).message)}</p>`;
    }
  };
  document.getElementById('btn-kr-search')?.addEventListener('click', run);
  document.getElementById('kr-search-q')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') run();
  });
}

let packActionsBound = false;

function bindPackActions(): void {
  document.querySelectorAll('.kr-use-one').forEach((btn) => {
    const el = btn as HTMLButtonElement;
    const clone = el.cloneNode(true) as HTMLButtonElement;
    el.replaceWith(clone);
    clone.addEventListener('click', () => {
      const i = parseInt(clone.dataset.i || '0', 10);
      const g = lastPack[i];
      if (!g) return;
      sessionStorage.setItem(
        'selectedKeyword',
        JSON.stringify({
          mainKeyword: g.primary,
          secondaryKeywords: (g.secondary || []).join(', '),
          tone: 'conversational',
          wordCount: 1500,
          priority: 'high',
        })
      );
      showToast('Keyword sent to Generate page', 'success');
      window.navigateTo('generate');
    });
  });

  if (packActionsBound) return;
  packActionsBound = true;

  document.getElementById('btn-kr-export-notion')?.addEventListener('click', async () => {
    if (!lastPack.length) return;
    const btn = document.getElementById('btn-kr-export-notion') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Exporting…';
    try {
      const data = await apiPost('/keyword-research/export-notion', {
        keywords: lastPack.map((g) => ({ primary: g.primary, secondary: g.secondary })),
      });
      showToast(`Exported ${data.created} keywords to Notion`, 'success');
      if (data.failed) showToast(`${data.failed} failed — check Notion property names`, 'error');
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Export to Notion';
    }
  });

  document.getElementById('btn-kr-download')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(lastPack, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pilotup-keywords-${Date.now()}.json`;
    a.click();
    showToast('Downloaded keyword pack', 'success');
  });
}
