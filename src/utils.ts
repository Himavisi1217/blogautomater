export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = document.getElementById('toast-container')!;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export function truncate(text: string, max: number): string {
  return text.length > max ? text.substring(0, max) + '...' : text;
}

export function showAuthorPrompt(): Promise<string | null> {
  return new Promise((resolve) => {
    // Check if modal already exists
    let modal = document.getElementById('author-prompt-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'author-prompt-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card auth-card">
          <h3 style="margin: 0 0 12px 0;">Select Author</h3>
          <p style="margin: 0 0 16px 0; color: var(--text-muted);">Who is the author of this blog post?</p>
          <select id="author-prompt-select" class="form-control" style="width: 100%; margin-bottom: 20px;">
            <option value="Himavisi Ekanayake">Himavisi Ekanayake</option>
            <option value="Nigel Jacob">Nigel Jacob</option>
            <option value="Hesara Yasith">Hesara Yasith</option>
            <option value="Vihanga Fernando">Vihanga Fernando</option>
            <option value="Kavindu Ashain">Kavindu Ashain</option>
          </select>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button id="author-prompt-cancel" class="btn btn-secondary">Cancel</button>
            <button id="author-prompt-confirm" class="btn btn-primary">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const select = document.getElementById('author-prompt-select') as HTMLSelectElement;
    const cancelBtn = document.getElementById('author-prompt-cancel') as HTMLButtonElement;
    const confirmBtn = document.getElementById('author-prompt-confirm') as HTMLButtonElement;

    const cleanup = () => {
      if (modal) {
        modal.classList.remove('show');
      }
      cancelBtn.onclick = null;
      confirmBtn.onclick = null;
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(null);
    };

    confirmBtn.onclick = () => {
      cleanup();
      resolve(select.value);
    };

    // Show modal with app styles/animation
    modal.classList.add('show');
  });
}
