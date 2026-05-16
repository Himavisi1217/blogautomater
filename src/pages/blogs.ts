import { getBlogs, deleteBlog, saveBlog } from '../store';
import { formatDate, showToast, showAuthorPrompt } from '../utils';
import { apiPost } from '../api';

export function renderBlogs(): string {
  const blogs = getBlogs();
  const isAutoPublish = localStorage.getItem('strapi_autopublish') === 'true';
  const strapiBtnStyle = isAutoPublish ? 'btn-danger' : 'btn-success';
  const strapiBtnText = isAutoPublish ? 'Publish' : 'Save to Strapi';

  return `
    <div class="page" id="page-blogs">
      <div class="page-header">
        <h1 class="page-title">Blog Posts</h1>
        <p class="page-subtitle">All your generated blog content</p>
      </div>

      ${blogs.length > 0 ? `
        <div class="card">
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Main Keyword</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Generated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${blogs.map(blog => `
                  <tr>
                    <td><strong style="cursor:pointer" onclick="window.previewBlog('${blog.id}')">${blog.title.length > 50 ? blog.title.substring(0, 50) + '...' : blog.title}</strong></td>
                    <td>${blog.mainKeyword}</td>
                    <td><span style="text-transform:capitalize">${blog.provider}</span></td>
                    <td><span class="badge badge-${(blog.status === 'saved' || blog.status === 'published') ? 'done' : 'pending'}">${blog.status}</span></td>
                    <td>${formatDate(blog.generatedAt)}</td>
                    <td>
                      <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="window.previewBlog('${blog.id}')">Preview</button>
                        ${blog.status !== 'saved' && blog.status !== 'published' ? `<button class="btn ${strapiBtnStyle} btn-sm" id="strapi-btn-${blog.id}" onclick="window.saveBlogToStrapi('${blog.id}')">${strapiBtnText}</button>` : (blog.status === 'published' ? `<button class="btn btn-sm" disabled style="opacity:0.9;background:var(--danger);color:#fff;border:1px solid var(--danger);">✓ Published</button>` : `<button class="btn btn-sm" disabled style="opacity:0.9;background:var(--success-bg);color:var(--success);border:1px solid var(--success);">✓ Saved</button>`)}
                        <button class="btn btn-danger btn-sm" onclick="window.deleteBlogPost('${blog.id}')">Delete</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="3" width="12" height="18" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M16 3v5h5" stroke="currentColor" stroke-width="1.2" fill="none"/></svg></div>
          <div class="empty-state-title">No blog posts yet</div>
          <p>Generate your first blog post to see it here.</p>
          <button class="btn btn-primary" style="margin-top:16px" onclick="window.navigateTo('generate')">Generate Blog</button>
        </div>
      `}
    </div>
  `;
}

export function initBlogsPage(): void {
  (window as any).deleteBlogPost = (id: string) => {
    if (confirm('Delete this blog post?')) {
      deleteBlog(id);
      showToast('Blog post deleted', 'info');
      window.navigateTo('blogs');
    }
  };

  (window as any).saveBlogToStrapi = async (id: string) => {
    const blogs = getBlogs();
    const blog = blogs.find(b => b.id === id);
    if (!blog) return;

    const author = await showAuthorPrompt();
    if (!author) return; // User cancelled

    const btn = document.getElementById(`strapi-btn-${id}`) as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }

    try {
      const autopublish = localStorage.getItem('strapi_autopublish') === 'true';

      const payload: any = {
        title: blog.title,
        content: blog.content,
        mainKeyword: blog.mainKeyword,
        secondaryKeywords: blog.secondaryKeywords,
        slug: blog.meta?.slug || '',
        author: author,
        keywords: blog.meta?.keywords || [],
        publish: autopublish,
      };

      if (blog.meta) {
        Object.assign(payload, blog.meta);
      }

      const data = await apiPost('/strapi/publish', payload);
      
      // Save to Notion as well
      try {
        const notionPayload = {
          title: blog.title,
          content: blog.content,
          mainKeyword: blog.mainKeyword,
          secondaryKeywords: blog.secondaryKeywords,
          metaTitle: blog.meta?.metaTitle || '',
          metaDescription: blog.meta?.metaDescription || '',
          slug: blog.meta?.slug || '',
          provider: blog.provider,
          keywords: blog.meta?.keywords?.join(', ') || '',
        };
        await apiPost('/notion/save-blog', notionPayload);
      } catch (notionErr: any) {
        console.warn('Notion save warning:', notionErr.message);
      }

      blog.status = autopublish ? 'published' : 'saved';
      blog.strapiId = data.strapiId;
      saveBlog(blog);

      showToast('Blog saved to Strapi and Notion!', 'success');
      window.navigateTo('blogs'); // Re-render to update button state
    } catch (err: any) {
      showToast(err.message, 'error');
      if (btn) {
        btn.disabled = false;
        const autopublish = localStorage.getItem('strapi_autopublish') === 'true';
        btn.textContent = autopublish ? 'Publish' : 'Save to Strapi';
      }
    }
  };
}
