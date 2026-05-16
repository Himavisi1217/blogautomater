import { getBlogs, saveBlog } from '../store';
import { apiPost } from '../api';
import { showToast, showAuthorPrompt } from '../utils';
import 'quill/dist/quill.snow.css';

let quill: any = null;

export function renderEditor(): string {
  return `
    <div class="page" id="page-editor">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:start;">
        <div>
          <h1 class="page-title">Edit Blog Post</h1>
          <p class="page-subtitle">Make manual edits before saving or publishing</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary" id="btn-editor-cancel">Cancel</button>
          <button class="btn btn-success" id="btn-editor-save">Save Draft</button>
          <button class="btn btn-primary" id="btn-editor-publish">Publish</button>
        </div>
      </div>

      <div class="grid-2" style="gap:20px;">
        <div>
          <div class="card">
            <div class="form-group">
              <label class="form-label">Title</label>
              <input id="editor-title" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Main Keyword</label>
              <input id="editor-main-keyword" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Secondary Keywords (comma separated)</label>
              <input id="editor-secondary-keywords" class="form-input" />
            </div>

            <div class="form-group">
              <label class="form-label">Excerpt</label>
              <textarea id="editor-excerpt" class="form-input" rows="3"></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Slug</label>
              <input id="editor-slug" class="form-input" />
            </div>
          </div>
        </div>

        <div>
          <div class="card">
            <label class="form-label">Content</label>
            <div id="editor-content" style="min-height:420px;padding:0;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);overflow:auto;"></div>
          </div>

          <div style="margin-top:12px;display:flex;gap:8px;">
            <button class="btn btn-secondary" id="btn-editor-copy-html">Copy HTML</button>
            <button class="btn" id="btn-editor-toggle-text">Toggle Plain Text</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

let currentBlog: any = null;
let plainTextMode = false;

export function initEditor(): void {
  // Load blog from sessionStorage or from hash id
  const previewRaw = sessionStorage.getItem('previewBlog');
  if (previewRaw) {
    try { currentBlog = JSON.parse(previewRaw); } catch { currentBlog = null; }
  }

  if (!currentBlog) {
    const hash = window.location.hash;
    const match = hash.match(/editor\/(.+)/);
    if (match) {
      const blogs = getBlogs();
      currentBlog = blogs.find(b => b.id === match[1]);
    }
  }

  // Populate fields
  const titleEl = document.getElementById('editor-title') as HTMLInputElement;
  const contentEl = document.getElementById('editor-content') as HTMLElement;
  const mainKwEl = document.getElementById('editor-main-keyword') as HTMLInputElement;
  const secKwEl = document.getElementById('editor-secondary-keywords') as HTMLInputElement;
  const excerptEl = document.getElementById('editor-excerpt') as HTMLTextAreaElement;
  const slugEl = document.getElementById('editor-slug') as HTMLInputElement;

  if (currentBlog) {
    titleEl.value = currentBlog.title || '';
    contentEl.innerHTML = currentBlog.content || '';
    mainKwEl.value = currentBlog.mainKeyword || '';
    secKwEl.value = Array.isArray(currentBlog.secondaryKeywords) ? currentBlog.secondaryKeywords.join(', ') : (currentBlog.secondaryKeywords || '');
    excerptEl.value = currentBlog.meta?.excerpt || currentBlog.excerptBasis || '';
    slugEl.value = currentBlog.meta?.slug || '';
  }

  // Initialize Quill editor if available
  // Try to dynamically import Quill and initialize; fallback to contentEditable
  import('quill').then((QuillModule: any) => {
    const Quill = QuillModule.default || QuillModule;
    quill = new Quill('#editor-content', {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ header: [1, 2, 3, false] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean'],
        ],
      },
    });

    if (currentBlog && currentBlog.content) {
      quill.root.innerHTML = currentBlog.content;
    }
  }).catch((e) => {
    console.warn('Quill not available, falling back to contentEditable', e);
    contentEl.contentEditable = 'true';
    if (currentBlog && currentBlog.content) contentEl.innerHTML = currentBlog.content;
  });

  (document.getElementById('btn-editor-cancel') as HTMLButtonElement).addEventListener('click', () => {
    // Return to preview
    if (currentBlog) sessionStorage.setItem('previewBlog', JSON.stringify(currentBlog));
    window.navigateTo('preview');
  });

  (document.getElementById('btn-editor-copy-html') as HTMLButtonElement).addEventListener('click', () => {
    const html = quill ? quill.root.innerHTML : (document.getElementById('editor-content') as HTMLElement).innerHTML || '';
    navigator.clipboard.writeText(html).then(() => showToast('HTML copied to clipboard', 'success'));
  });

  (document.getElementById('btn-editor-toggle-text') as HTMLButtonElement).addEventListener('click', () => {
    const el = document.getElementById('editor-content') as HTMLElement;
    if (!plainTextMode) {
      el.textContent = el.innerText || el.textContent || '';
      plainTextMode = true;
    } else {
      // no-op: user can paste HTML back
      plainTextMode = false;
    }
  });

  const saveHandler = async (publish = false) => {
    if (!currentBlog) {
      showToast('No blog loaded to save', 'error');
      return;
    }

    const author = await showAuthorPrompt();
    if (!author) return;

    const title = (document.getElementById('editor-title') as HTMLInputElement).value.trim();
    const content = (quill ? (quill.root.innerHTML || '') : (document.getElementById('editor-content') as HTMLElement).innerHTML || '').trim();
    const mainKeyword = (document.getElementById('editor-main-keyword') as HTMLInputElement).value.trim();
    const secondaryKeywords = (document.getElementById('editor-secondary-keywords') as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean);
    const excerpt = (document.getElementById('editor-excerpt') as HTMLTextAreaElement).value.trim();
    const slug = (document.getElementById('editor-slug') as HTMLInputElement).value.trim();

    const saveBtn = publish ? document.getElementById('btn-editor-publish') as HTMLButtonElement : document.getElementById('btn-editor-save') as HTMLButtonElement;
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = publish ? 'Publishing...' : 'Saving...'; }

    try {
      const payload: any = {
        title: title || currentBlog.title || 'Untitled',
        content: content || currentBlog.content || '',
        mainKeyword,
        secondaryKeywords,
        excerpt: excerpt || currentBlog.meta?.excerpt || '',
        slug: slug || currentBlog.meta?.slug || '',
        author,
        keywords: currentBlog.meta?.keywords || [],
        publish,
      };

      if (currentBlog.meta) Object.assign(payload, currentBlog.meta);

      const res = await apiPost('/strapi/publish', payload);

      currentBlog.title = payload.title;
      currentBlog.content = payload.content;
      currentBlog.mainKeyword = payload.mainKeyword;
      currentBlog.secondaryKeywords = payload.secondaryKeywords;
      currentBlog.meta = currentBlog.meta || {};
      currentBlog.meta.excerpt = payload.excerpt;
      currentBlog.meta.slug = payload.slug;
      currentBlog.status = publish ? 'published' : 'saved';
      currentBlog.strapiId = res.strapiId || res.strapiId;

      saveBlog(currentBlog);
      sessionStorage.setItem('previewBlog', JSON.stringify(currentBlog));

      showToast(publish ? 'Published successfully!' : 'Saved as draft!', 'success');
      window.navigateTo('preview');
    } catch (err: any) {
      showToast(err.message || 'Save failed', 'error');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = publish ? 'Publish' : 'Save Draft'; }
    }
  };

  (document.getElementById('btn-editor-save') as HTMLButtonElement).addEventListener('click', () => saveHandler(false));
  (document.getElementById('btn-editor-publish') as HTMLButtonElement).addEventListener('click', () => saveHandler(true));
}

export default {};
