import { getBlogs, saveBlog } from '../store';
import { apiPost } from '../api';
import { showToast, showAuthorPrompt } from '../utils';

export function renderPreview(): string {
  // Check if a blog was selected for preview
  const previewRaw = sessionStorage.getItem('previewBlog');
  let blog: any = null;

  if (previewRaw) {
    try { blog = JSON.parse(previewRaw); } catch {}
  }

  if (!blog) {
    // Check for blog ID in hash
    const hash = window.location.hash;
    const match = hash.match(/preview\/(.+)/);
    if (match) {
      const blogs = getBlogs();
      blog = blogs.find(b => b.id === match[1]);
    }
  }

  if (!blog) {
    return `
      <div class="page">
        <div class="empty-state">
          <div class="empty-state-icon">👀</div>
          <div class="empty-state-title">No blog selected for preview</div>
          <p>Select a blog from the Blog Posts page to preview it.</p>
          <button class="btn btn-primary" style="margin-top:16px" onclick="window.navigateTo('blogs')">View Blog Posts</button>
        </div>
      </div>
    `;
  }

  const isAutoPublish = localStorage.getItem('strapi_autopublish') === 'true';
  const strapiBtnStyle = isAutoPublish ? 'btn-danger' : 'btn-success';
  const strapiBtnText = isAutoPublish ? 'Publish' : 'Save to Strapi';

  return `
    <div class="page" id="page-preview">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:start;">
        <div>
          <h1 class="page-title">Blog Preview</h1>
          <p class="page-subtitle">${blog.provider} &bull; ${blog.mainKeyword}</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn ${strapiBtnStyle}" id="btn-preview-strapi" onclick="window.savePreviewToStrapi('${blog.id}')">${blog.status === 'saved' ? '✓ ' + (isAutoPublish ? 'Published' : 'Saved') : strapiBtnText}</button>
          <button class="btn btn-secondary" onclick="window.copyBlogHTML()">Copy HTML</button>
          <button class="btn btn-primary" onclick="window.navigateTo('blogs')">Back to List</button>
        </div>
      </div>

      ${blog.meta ? `
        <div class="meta-panel" style="margin-bottom:24px;">
          <h3 class="section-title">🔍 SEO Metadata</h3>
          <div class="grid-2" style="gap:12px;">
            <div class="meta-item">
              <div class="meta-item-label">Meta Title (${blog.meta.metaTitle?.length || 0}/60)</div>
              <div class="meta-item-value">${blog.meta.metaTitle || 'Not generated'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-item-label">Meta Description (${blog.meta.metaDescription?.length || 0}/160)</div>
              <div class="meta-item-value">${blog.meta.metaDescription || 'Not generated'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-item-label">OG Title</div>
              <div class="meta-item-value">${blog.meta.ogTitle || 'Not generated'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-item-label">Slug</div>
              <div class="meta-item-value">${blog.meta.slug || 'Not generated'}</div>
            </div>
          </div>
          <div class="meta-item" style="margin-top:12px;">
            <div class="meta-item-label">Excerpt</div>
            <div class="meta-item-value">${blog.meta.excerpt || 'Not generated'}</div>
          </div>
          ${blog.meta.keywords && blog.meta.keywords.length > 0 ? `
            <div class="meta-item" style="margin-top:12px;">
              <div class="meta-item-label">Keywords (${blog.meta.keywords.length})</div>
              <div class="meta-item-value" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;">
                ${blog.meta.keywords.map((kw: string) => `<span style="background:#4f46e5;color:white;padding:6px 12px;border-radius:6px;font-size:0.85rem;white-space:nowrap;">${kw}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="blog-preview" id="blog-preview-content">
        ${blog.content}
      </div>
    </div>
  `;
}

export function initPreviewPage(): void {
  (window as any).copyBlogHTML = () => {
    const content = document.getElementById('blog-preview-content')?.innerHTML || '';
    navigator.clipboard.writeText(content).then(() => {
      alert('HTML copied to clipboard!');
    });
  };

  (window as any).savePreviewToStrapi = async (blogId: string) => {
    const blogs = getBlogs();
    const blog = blogs.find(b => b.id === blogId);
    if (!blog) return;

    const author = await showAuthorPrompt();
    if (!author) return; // User cancelled

    const strapiBtn = document.getElementById('btn-preview-strapi') as HTMLButtonElement;
    if (strapiBtn) {
      strapiBtn.disabled = true;
      strapiBtn.textContent = 'Saving...';
    }

    try {
      const autopublish = localStorage.getItem('strapi_autopublish') === 'true';
      
      const payload: any = {
        title: blog.title,
        content: blog.content,
        mainKeyword: blog.mainKeyword,
        secondaryKeywords: blog.secondaryKeywords,
        excerpt: blog.excerptBasis || '',
        slug: blog.meta?.slug || '',
        author: author,
        keywords: blog.meta?.keywords || [],
        publish: autopublish,
      };

      if (blog.meta) {
        Object.assign(payload, blog.meta);
      }

      // Save to Strapi
      const strapiData = await apiPost('/strapi/publish', payload);

      // Save to Notion
      try {
        const notionPayload = {
          title: blog.title,
          content: blog.content,
          mainKeyword: blog.mainKeyword,
          secondaryKeywords: blog.secondaryKeywords,
          metaTitle: blog.meta?.metaTitle || '',
          metaDescription: blog.meta?.metaDescription || '',
          excerpt: blog.excerptBasis || '',
          slug: blog.meta?.slug || '',
          provider: blog.provider,
          keywords: blog.meta?.keywords?.join(', ') || '',
        };
        await apiPost('/notion/save-blog', notionPayload);
      } catch (notionErr: any) {
        console.warn('Notion save warning:', notionErr.message);
      }

      blog.status = 'saved';
      blog.strapiId = strapiData.strapiId;
      saveBlog(blog);

      if (strapiBtn) {
        strapiBtn.textContent = autopublish ? '✓ Published' : '✓ Saved';
      }
      showToast('Blog saved to Strapi and Notion!', 'success');
      
      // Update sessionStorage if this is the currently previewed blog
      sessionStorage.setItem('previewBlog', JSON.stringify(blog));
    } catch (err: any) {
      showToast(err.message, 'error');
      if (strapiBtn) {
        strapiBtn.disabled = false;
        const autopublish = localStorage.getItem('strapi_autopublish') === 'true';
        strapiBtn.textContent = autopublish ? 'Publish' : 'Save to Strapi';
      }
    }
  };
}
