import { getBlogs } from '../store';

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

  return `
    <div class="page" id="page-preview">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:start;">
        <div>
          <h1 class="page-title">Blog Preview</h1>
          <p class="page-subtitle">${blog.provider} &bull; ${blog.mainKeyword}</p>
        </div>
        <div style="display:flex;gap:8px;">
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
}
