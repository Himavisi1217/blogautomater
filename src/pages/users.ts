import { apiGet, apiPost } from '../api';
import { supabase } from '../lib/supabase';
import { showToast } from '../utils';

export function renderUsers(): string {
  return `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">User Management</h1>
        <p class="page-subtitle">Admin-only panel to review, approve, and remove users.</p>
      </div>
      <div id="users-list" class="grid-1"></div>
    </div>
  `;
}

export function initUsersPage(): void {
  const list = document.getElementById('users-list');
  if (!list) return;

  const loadUsers = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        throw new Error('You must be signed in as admin.');
      }

      const users = await apiGet('/auth/users', { Authorization: `Bearer ${token}` });
      if (!Array.isArray(users) || users.length === 0) {
        list.innerHTML = '<div class="card">No users found.</div>';
        return;
      }

      list.innerHTML = users.map((user: any) => `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <div style="font-weight:600;">${user.email || 'No email'}</div>
              <span class="badge ${user.approved ? 'badge-done' : 'badge-pending'}">${user.approved ? 'Approved' : 'Pending'}</span>
              <span class="badge ${user.role === 'admin' ? 'badge-generating' : 'badge-draft'}">${user.role}</span>
            </div>
            <div style="color:var(--text-secondary);font-size:0.85rem;">ID: ${user.id}</div>
            <div style="color:var(--text-muted);font-size:0.8rem;">Created: ${user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}</div>
            ${user.approvedAt ? `<div style="color:var(--text-muted);font-size:0.8rem;">Approved: ${new Date(user.approvedAt).toLocaleString()} by ${user.approvedBy || 'N/A'}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            ${!user.approved ? `<button class="btn btn-primary approve-user-btn" data-user-id="${user.id}">Approve</button>` : ''}
            ${user.role !== 'admin' ? `<button class="btn btn-danger remove-user-btn" data-user-id="${user.id}">Remove</button>` : ''}
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.approve-user-btn').forEach((button) => {
        button.addEventListener('click', async () => {
          const userId = (button as HTMLButtonElement).dataset.userId;
          if (!userId) return;

          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;

            if (!token) {
              throw new Error('You must be signed in as admin.');
            }

            await apiPost('/auth/approve-user', { userId }, { Authorization: `Bearer ${token}` });
            showToast('User approved!', 'success');
            loadUsers();
          } catch (error: any) {
            showToast(error.message || 'Failed to approve user', 'error');
          }
        });
      });

      document.querySelectorAll('.remove-user-btn').forEach((button) => {
        button.addEventListener('click', async () => {
          const userId = (button as HTMLButtonElement).dataset.userId;
          if (!userId) return;

          const confirmed = window.confirm('Remove this user permanently?');
          if (!confirmed) return;

          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;

            if (!token) {
              throw new Error('You must be signed in as admin.');
            }

            await apiPost('/auth/remove-user', { userId }, { Authorization: `Bearer ${token}` });
            showToast('User removed!', 'success');
            loadUsers();
          } catch (error: any) {
            showToast(error.message || 'Failed to remove user', 'error');
          }
        });
      });
    } catch (error: any) {
      list.innerHTML = `<div class="card">${error.message || 'Failed to load users'}</div>`;
    }
  };

  loadUsers();
}