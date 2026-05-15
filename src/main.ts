import './style.css';
import { renderDashboard } from './pages/dashboard';
import { renderKeywords, initKeywordsPage } from './pages/keywords';
import { renderGenerate, initGeneratePage } from './pages/generate';
import { renderBlogs, initBlogsPage } from './pages/blogs';
import { renderPreview, initPreviewPage } from './pages/preview';
import { renderSettings, initSettingsPage } from './pages/settings';
import { renderKeywordResearch, initKeywordResearchPage } from './pages/keyword-research';
import { renderLogin, initLoginPage } from './pages/login';
import { renderUsers, initUsersPage } from './pages/users';
import { supabase } from './lib/supabase';
import { getBlogs } from './store';

type ThemeMode = 'light' | 'dark';
const THEME_STORAGE_KEY = 'blogforge_theme';

// Declare global navigation functions
declare global {
  interface Window {
    navigateTo: (page: string) => void;
    previewBlog: (id: string) => void;
    setTheme?: (theme: ThemeMode) => void;
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
  login: { render: renderLogin, init: initLoginPage },
  users: { render: renderUsers, init: initUsersPage },
};

function navigateTo(page: string): void {
  const mainContent = document.getElementById('main-content')!;
  const pageConfig = pages[page];

  document.body.classList.toggle('auth-mode', page === 'login');

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

async function getApprovedSessionPage(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const user = session?.user;

  if (!user) return 'login';

  const isAdmin = user.email === (import.meta.env.VITE_ADMIN_EMAIL || 'pilotadmin@pilotup.io') || user.user_metadata?.role === 'admin';
  const approved = user.user_metadata?.approved === true || isAdmin;
  return approved ? 'dashboard' : 'login';
}

async function getAuthorizedPage(requested: string): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const user = session?.user;

  if (!user) return 'login';

  const isAdmin = user.email === (import.meta.env.VITE_ADMIN_EMAIL || 'pilotadmin@pilotup.io') || user.user_metadata?.role === 'admin';
  const approved = user.user_metadata?.approved === true || isAdmin;
  if (!approved) return 'login';

  if (requested === 'users' && !isAdmin) {
    return 'dashboard';
  }

  return requested || 'dashboard';
}

function getInitialTheme(): ThemeMode {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement | null;
  if (themeToggle) {
    themeToggle.checked = theme === 'dark';
  }
}

// Global navigation function
window.navigateTo = navigateTo;
window.setTheme = applyTheme;

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

async function logout(): Promise<void> {
  await supabase.auth.signOut();
  navigateTo('login');
}

// Initialize
function init(): void {
  applyTheme(getInitialTheme());

  // Nav click handlers
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = (item as HTMLElement).dataset.page;
      if (page) navigateTo(page);
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout().catch(() => {
      navigateTo('login');
    });
  });

  // Handle hash navigation with auth guard
  const hash = window.location.hash.replace('#', '');
  getAuthorizedPage(hash)
    .then((authPage) => {
      navigateTo(authPage);
    })
    .catch(() => {
      navigateTo('login');
    });

  window.addEventListener('hashchange', () => {
    const requested = window.location.hash.replace('#', '');
    getAuthorizedPage(requested)
      .then((authPage) => {
        navigateTo(authPage);
      })
      .catch(() => {
        navigateTo('login');
      });
  });

  // Check server
  checkHealth();
  setInterval(checkHealth, 30000);
}

init();
