import { supabase } from '../lib/supabase';
import { apiPost } from '../api';

export function renderLogin(): string {
  return `
    <div class="auth-center-wrap">
      <div class="auth-card auth-card--compact auth-card--flat">
        <div class="auth-mark">
          <div class="auth-mark-icon">
            <img src="/Logo-primary.png" alt="PilotUp logo" />
          </div>
        </div>

        <h1 class="auth-title auth-title--center">Welcome to PilotUP Bloger.</h1>
        <p class="auth-sub auth-sub--center">Log in to your PilotUP account</p>

        <form id="login-form" class="auth-form">
          <div class="form-group auth-group">
            <div class="auth-field-header">
              <label for="email" class="form-label auth-label">Email</label>
            </div>
            <input
              type="email"
              id="email"
              class="form-input auth-input auth-input--large"
              required
              placeholder="Enter your email address..."
              autocomplete="email"
            />
          </div>

          <div class="form-group auth-group">
            <div class="auth-field-header">
              <label for="password" class="form-label auth-label">Password</label>
            </div>
            <input
              type="password"
              id="password"
              class="form-input auth-input auth-input--large"
              required
              placeholder="********"
              autocomplete="current-password"
            />
          </div>

          <button type="submit" class="btn btn-primary auth-submit auth-submit--continue">Continue →</button>
          <div id="login-message" class="auth-message auth-message--center"></div>
        </form>
      </div>
    </div>
  `;
}

export function initLoginPage(): void {
  const form = document.getElementById('login-form');
  const message = document.getElementById('login-message');
  const adminEmail = 'pilotadmin@pilotup.io';

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    if (message) {
      message.textContent = 'Checking credentials...';
      message.className = 'auth-message';
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          await apiPost('/auth/create-pending', { email, password });
          if (message) {
            message.textContent = 'Your account was created and is waiting for approval.';
            message.className = 'auth-message info';
          }
        } else {
          throw error;
        }
      } else if (data.user) {
        const isAdmin = data.user.email === adminEmail || data.user.user_metadata?.role === 'admin';
        const isApproved = data.user.user_metadata?.approved === true || isAdmin;

        if (isApproved) {
          if (isAdmin) {
            try {
              await supabase.auth.updateUser({
                data: { approved: true, role: 'admin' },
              });
            } catch {}
          }
          window.location.hash = '#dashboard';
          window.location.reload();
        } else {
          await supabase.auth.signOut();
          if (message) {
            message.textContent = 'Your account is pending approval.';
            message.className = 'auth-message info';
          }
        }
      }
    } catch (error: any) {
      const text = error.message || 'Something went wrong.';
      if (message) {
        message.textContent = text;
        message.className = 'auth-message error';
      }
    }
  });
}