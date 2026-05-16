import { getBlogs } from '../store';
import { formatDate } from '../utils';

export function renderDashboard(): string {
  const blogs = getBlogs();
  const totalBlogs = blogs.length;
  const savedToStrapi = blogs.filter(b => b.status === 'saved' || b.status === 'published').length;
  const geminiCount = blogs.filter(b => b.provider === 'gemini').length;
  const claudeCount = blogs.filter(b => b.provider === 'claude').length;

  const recentBlogs = blogs.slice(0, 5);

  return `
    <div class="page" id="page-dashboard">
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Overview of your blog automation pipeline</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Blogs</div>
          <div class="stat-value">${totalBlogs}</div>
          <div class="stat-change">Generated posts</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Saved to Strapi</div>
          <div class="stat-value">${savedToStrapi}</div>
          <div class="stat-change">Draft posts</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Gemini Posts</div>
          <div class="stat-value">${geminiCount}</div>
          <div class="stat-change">via Google AI</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Claude Posts</div>
          <div class="stat-value">${claudeCount}</div>
          <div class="stat-change">via Anthropic</div>
        </div>
      </div>

      <div class="quick-actions">
        <button class="btn btn-primary btn-lg" onclick="window.navigateTo('generate')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          Generate New Blog
        </button>
        <button class="btn btn-secondary" onclick="window.navigateTo('keywords')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Fetch Keywords
        </button>
        <button class="btn btn-secondary" onclick="window.navigateTo('keyword-research')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          Keyword Research
        </button>
        <!-- Configure APIs removed per settings simplification request -->
      </div>

      <div class="section-title">Recent Blog Posts</div>
      ${recentBlogs.length > 0 ? `
        <div class="recent-list">
          ${recentBlogs.map(blog => `
            <div class="recent-item" onclick="window.previewBlog('${blog.id}')">
              <div>
                <div class="recent-item-title">${blog.title}</div>
                <div class="recent-item-meta">${blog.provider} &bull; ${formatDate(blog.generatedAt)}</div>
              </div>
              <span class="badge badge-${(blog.status === 'saved' || blog.status === 'published') ? 'done' : blog.status === 'generated' ? 'pending' : 'draft'}">${blog.status}</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="3" width="12" height="18" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M16 3v5h5" stroke="currentColor" stroke-width="1.2" fill="none"/></svg></div>
          <div class="empty-state-title">No blogs generated yet</div>
          <p>Start by fetching keywords from Notion or generate your first blog post.</p>
        </div>
      `}
    </div>
  `;
}
