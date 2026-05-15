import './style.css';
import { renderDashboard } from './pages/dashboard';
import { renderKeywords, initKeywordsPage } from './pages/keywords';
import { renderGenerate, initGeneratePage } from './pages/generate';
import { renderBlogs, initBlogsPage } from './pages/blogs';
import { renderPreview, initPreviewPage } from './pages/preview';
import { renderSettings, initSettingsPage } from './pages/settings';
import { renderKeywordResearch, initKeywordResearchPage } from './pages/keyword-research';
import { getBlogs } from './store';

// Declare global navigation functions
declare global {
  interface Window {
    navigateTo: (page: string) => void;
    previewBlog: (id: string) => void;
  }
}

const pages: Record<string, { render: () => string; init?: () => void }> = {
  dashboard: { render: renderDashboard },
  keywords: { render: renderKeywords, init: initKeywordsPage },
  'keyword-research': { render: renderKeywordResearch, init: initKeywordResearchPage },
  generate: { render: renderGenerate, init: initGeneratePage },
  blogs: { render: renderBlogs, init: initBlogsPage },
  preview: { render: renderPreview, init: initPreviewPage },
  settings: { render: renderSettings, init: initSettingsPage },
};

function navigateTo(page: string): void {
  const mainContent = document.getElementById('main-content')!;
  const pageConfig = pages[page];

  if (!pageConfig) {
    mainContent.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Page not found</div></div>';
    return;
  }

  mainContent.innerHTML = pageConfig.render();
  pageConfig.init?.();

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', (item as HTMLElement).dataset.page === page);
  });

  // Update hash without triggering hashchange
  history.pushState(null, '', `#${page}`);
}

// Global navigation function
window.navigateTo = navigateTo;

// Global preview function
window.previewBlog = (id: string) => {
  const blogs = getBlogs();
  const blog = blogs.find(b => b.id === id);
  if (blog) {
    sessionStorage.setItem('previewBlog', JSON.stringify(blog));
    navigateTo('preview');
  }
};

// Check server health
async function checkHealth(): Promise<void> {
  const statusDot = document.querySelector('.status-dot')!;
  const statusText = document.querySelector('.status-text')!;
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Server Online';
    } else {
      throw new Error();
    }
  } catch {
    statusDot.classList.add('error');
    statusText.textContent = 'Server Offline';
  }
}

// Initialize
function init(): void {
  // Nav click handlers
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = (item as HTMLElement).dataset.page;
      if (page) navigateTo(page);
    });
  });

  // Handle hash navigation
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);

  window.addEventListener('hashchange', () => {
    const page = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(page);
  });

  // Check server
  checkHealth();
  setInterval(checkHealth, 30000);
}

init();
