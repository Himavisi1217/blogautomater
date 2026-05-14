import { apiPost } from '../api';
import { saveBlog, generateId } from '../store';
import { showToast } from '../utils';

export function renderGenerate(): string {
  // Check if a keyword was pre-selected
  const selectedRaw = sessionStorage.getItem('selectedKeyword');
  let mainKw = '', secKw = '', tone = 'conversational', words = 1500;
  if (selectedRaw) {
    try {
      const sel = JSON.parse(selectedRaw);
      mainKw = sel.mainKeyword || '';
      secKw = sel.secondaryKeywords || '';
      tone = sel.tone || 'conversational';
      words = sel.wordCount || 1500;
      sessionStorage.removeItem('selectedKeyword');
    } catch {}
  }

  return `
    <div class="page" id="page-generate">
      <div class="page-header">
        <h1 class="page-title">Generate Blog Post</h1>
        <p class="page-subtitle">Create SEO-optimized content with AI</p>
      </div>

      <div id="gen-progress" class="gen-progress" style="display:none;">
        <div class="spinner"></div>
        <span class="gen-progress-text" id="gen-status">Generating your blog post...</span>
      </div>

      <div class="grid-2">
        <div>
          <div class="card">
            <h3 class="section-title">📝 Content Settings</h3>

            <div class="form-group">
              <label class="form-label">Main Keyword *</label>
              <input type="text" class="form-input" id="gen-main-keyword" value="${mainKw}" placeholder="e.g. best coffee shops in Colombo" />
            </div>

            <div class="form-group">
              <label class="form-label">Secondary Keywords</label>
              <input type="text" class="form-input" id="gen-secondary-keywords" value="${secKw}" placeholder="coffee culture, cafe reviews, colombo dining (comma separated)" />
              <div class="form-hint">3-4 related keywords with similar meaning</div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Tone</label>
                <select class="form-select" id="gen-tone">
                  <option value="conversational" ${tone === 'conversational' ? 'selected' : ''}>Conversational</option>
                  <option value="professional" ${tone === 'professional' ? 'selected' : ''}>Professional</option>
                  <option value="informative" ${tone === 'informative' ? 'selected' : ''}>Informative</option>
                  <option value="casual" ${tone === 'casual' ? 'selected' : ''}>Casual</option>
                  <option value="authoritative" ${tone === 'authoritative' ? 'selected' : ''}>Authoritative</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Word Count</label>
                <input type="number" class="form-input" id="gen-word-count" value="${words}" min="500" max="5000" step="100" />
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:20px;">
            <h3 class="section-title">🤖 AI Provider</h3>
            <div class="provider-cards">
              <div class="provider-card selected" data-provider="gemini" id="provider-gemini">
                <div class="provider-icon">💎</div>
                <div class="provider-name">Gemini</div>
                <div class="provider-desc">Google AI, fast generation</div>
              </div>
              <div class="provider-card" data-provider="claude" id="provider-claude">
                <div class="provider-icon">🧠</div>
                <div class="provider-name">Claude</div>
                <div class="provider-desc">via AgentRouter</div>
              </div>
              <div class="provider-card" data-provider="groq" id="provider-groq">
                <div class="provider-icon">⚡</div>
                <div class="provider-name">Groq</div>
                <div class="provider-desc">Llama 3.3, ultra fast</div>
              </div>
            </div>

            <button class="btn btn-primary btn-lg" id="btn-generate" style="width:100%;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Generate Blog Post
            </button>
          </div>
        </div>

        <div>
          <div class="card" id="gen-result-card" style="display:none;">
            <h3 class="section-title">✅ Generated Successfully</h3>
            <div id="gen-result-title" style="font-size:1.1rem;font-weight:600;margin-bottom:12px;"></div>
            <div id="gen-result-preview" style="max-height:300px;overflow-y:auto;font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;padding:12px;background:var(--bg-input);border-radius:var(--radius-sm);"></div>

            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-primary" id="btn-gen-meta">Generate SEO Meta</button>
              <button class="btn btn-secondary" id="btn-gen-preview">Full Preview</button>
              <button class="btn btn-success" id="btn-gen-strapi">Save to Strapi</button>
            </div>

            <div class="meta-panel" id="meta-panel" style="display:none;">
              <h3 class="section-title" style="margin-bottom:16px;">🔍 SEO Metadata</h3>
              <div id="meta-content"></div>
            </div>
          </div>

          <div class="card" id="gen-tips-card">
            <h3 class="section-title">💡 Generation Tips</h3>
            <ul style="color:var(--text-secondary);font-size:0.9rem;padding-left:20px;">
              <li style="margin-bottom:8px;">Use specific, long-tail keywords for better results</li>
              <li style="margin-bottom:8px;">Add 3-4 secondary keywords that are synonyms or related terms</li>
              <li style="margin-bottom:8px;">Conversational tone works best for most blog posts</li>
              <li style="margin-bottom:8px;">1500 words is the sweet spot for SEO</li>
              <li style="margin-bottom:8px;">Generated content avoids AI patterns and dashes automatically</li>
              <li>All posts include proper H1, H2, H3 heading structure</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

let currentBlog: any = null;
let selectedProvider = 'gemini';

export function initGeneratePage(): void {
  // Provider selection
  document.querySelectorAll('.provider-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.provider-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedProvider = (card as HTMLElement).dataset.provider || 'gemini';
    });
  });

  // Generate button
  document.getElementById('btn-generate')?.addEventListener('click', handleGenerate);
  document.getElementById('btn-gen-meta')?.addEventListener('click', handleGenerateMeta);
  document.getElementById('btn-gen-preview')?.addEventListener('click', () => {
    if (currentBlog) {
      sessionStorage.setItem('previewBlog', JSON.stringify(currentBlog));
      window.navigateTo('preview');
    }
  });
  document.getElementById('btn-gen-strapi')?.addEventListener('click', handleSaveToStrapi);
}

async function handleGenerate(): Promise<void> {
  const mainKeyword = (document.getElementById('gen-main-keyword') as HTMLInputElement).value.trim();
  const secondaryKeywords = (document.getElementById('gen-secondary-keywords') as HTMLInputElement).value.trim();
  const tone = (document.getElementById('gen-tone') as HTMLSelectElement).value;
  const wordCount = parseInt((document.getElementById('gen-word-count') as HTMLInputElement).value) || 1500;

  if (!mainKeyword) {
    showToast('Please enter a main keyword', 'error');
    return;
  }

  const progress = document.getElementById('gen-progress')!;
  const genBtn = document.getElementById('btn-generate') as HTMLButtonElement;
  const statusText = document.getElementById('gen-status')!;

  progress.style.display = 'flex';
  genBtn.disabled = true;
  statusText.textContent = `Generating with ${selectedProvider}... This may take 30-60 seconds.`;

  try {
    const data = await apiPost('/generate/blog', {
      mainKeyword,
      secondaryKeywords,
      tone,
      wordCount,
      provider: selectedProvider,
    });

    currentBlog = {
      id: generateId(),
      ...data.blog,
      status: 'generated' as const,
    };

    saveBlog(currentBlog);

    // Show result
    document.getElementById('gen-result-card')!.style.display = 'block';
    document.getElementById('gen-tips-card')!.style.display = 'none';
    document.getElementById('gen-result-title')!.textContent = currentBlog.title;

    // Strip HTML for preview
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentBlog.content;
    document.getElementById('gen-result-preview')!.textContent = tempDiv.textContent?.substring(0, 500) + '...' || '';

    showToast('Blog generated successfully!', 'success');
    statusText.textContent = 'Generation complete!';
    setTimeout(() => { progress.style.display = 'none'; }, 2000);
  } catch (err: any) {
    showToast(err.message, 'error');
    progress.style.display = 'none';
  } finally {
    genBtn.disabled = false;
  }
}

async function handleGenerateMeta(): Promise<void> {
  if (!currentBlog) return;

  const metaBtn = document.getElementById('btn-gen-meta') as HTMLButtonElement;
  metaBtn.disabled = true;
  metaBtn.textContent = 'Generating...';

  try {
    const data = await apiPost('/generate/meta', {
      mainKeyword: currentBlog.mainKeyword,
      blogTitle: currentBlog.title,
      blogExcerpt: currentBlog.excerptBasis || '',
      provider: selectedProvider,
    });

    currentBlog.meta = data.meta;
    saveBlog(currentBlog);

    const metaPanel = document.getElementById('meta-panel')!;
    metaPanel.style.display = 'block';
    document.getElementById('meta-content')!.innerHTML = `
      <div class="meta-item">
        <div class="meta-item-label">Meta Title <span class="char-count ${(data.meta.metaTitle?.length || 0) > 60 ? 'over' : ''}">(${data.meta.metaTitle?.length || 0}/60)</span></div>
        <div class="meta-item-value">${data.meta.metaTitle || ''}</div>
      </div>
      <div class="meta-item">
        <div class="meta-item-label">Meta Description <span class="char-count ${(data.meta.metaDescription?.length || 0) > 160 ? 'over' : ''}">(${data.meta.metaDescription?.length || 0}/160)</span></div>
        <div class="meta-item-value">${data.meta.metaDescription || ''}</div>
      </div>
      <div class="meta-item">
        <div class="meta-item-label">OG Title</div>
        <div class="meta-item-value">${data.meta.ogTitle || ''}</div>
      </div>
      <div class="meta-item">
        <div class="meta-item-label">OG Description</div>
        <div class="meta-item-value">${data.meta.ogDescription || ''}</div>
      </div>
      <div class="meta-item">
        <div class="meta-item-label">Excerpt</div>
        <div class="meta-item-value">${data.meta.excerpt || ''}</div>
      </div>
      <div class="meta-item">
        <div class="meta-item-label">Slug</div>
        <div class="meta-item-value">${data.meta.slug || ''}</div>
      </div>
    `;

    showToast('SEO metadata generated!', 'success');
  } catch (err: any) {
    showToast(err.message, 'error');
  } finally {
    metaBtn.disabled = false;
    metaBtn.textContent = 'Generate SEO Meta';
  }
}

async function handleSaveToStrapi(): Promise<void> {
  if (!currentBlog) return;

  const strapiBtn = document.getElementById('btn-gen-strapi') as HTMLButtonElement;
  strapiBtn.disabled = true;
  strapiBtn.textContent = 'Saving...';

  try {
    const payload: any = {
      title: currentBlog.title,
      content: currentBlog.content,
      mainKeyword: currentBlog.mainKeyword,
      secondaryKeywords: currentBlog.secondaryKeywords,
    };

    if (currentBlog.meta) {
      Object.assign(payload, currentBlog.meta);
    }

    const data = await apiPost('/strapi/publish', payload);

    currentBlog.status = 'saved';
    currentBlog.strapiId = data.strapiId;
    saveBlog(currentBlog);

    showToast('Blog saved as draft in Strapi!', 'success');
    strapiBtn.textContent = '✓ Saved to Strapi';
  } catch (err: any) {
    showToast(err.message, 'error');
    strapiBtn.disabled = false;
    strapiBtn.textContent = 'Save to Strapi';
  }
}
