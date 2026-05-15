import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const authRouter = Router();

const CREATE_PENDING_WINDOW_MS = 10 * 60 * 1000;
const CREATE_PENDING_MAX_ATTEMPTS = 5;
const pendingAttempts = new Map<string, number[]>();

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Supabase URL is not set.');
  }

  if (!serviceKey) {
    throw new Error('Supabase service role key is not set.');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const isAdminUser = (user: any) => user?.user_metadata?.role === 'admin';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function checkCreatePendingRateLimit(req: Request, email: string): { allowed: boolean; retryAfterSec?: number } {
  const ip = getClientIp(req);
  const key = `${ip}:${normalizeEmail(email)}`;
  const now = Date.now();

  const entries = pendingAttempts.get(key) || [];
  const recent = entries.filter((time) => now - time < CREATE_PENDING_WINDOW_MS);

  if (recent.length >= CREATE_PENDING_MAX_ATTEMPTS) {
    const oldest = recent[0];
    const retryAfterSec = Math.ceil((CREATE_PENDING_WINDOW_MS - (now - oldest)) / 1000);
    pendingAttempts.set(key, recent);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  pendingAttempts.set(key, recent);
  return { allowed: true };
}

function logAdminAction(action: string, actorEmail: string, targetEmail: string, targetUserId: string) {
  console.info(
    `[auth-admin] action=${action} actor=${actorEmail} targetEmail=${targetEmail} targetUserId=${targetUserId} at=${new Date().toISOString()}`
  );
}

async function requireAdmin(req: Request, res: Response): Promise<any> {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      res.status(401).json({ error: 'Missing authorization token.' });
      return null;
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid session.' });
      return null;
    }

    const user = data.user;
    const adminEmail = process.env.ADMIN_EMAIL || 'pilotadmin@pilotup.io';
    const isApprovedAdmin = user.email === adminEmail || isAdminUser(user);

    if (!isApprovedAdmin) {
      res.status(403).json({ error: 'Admin access required.' });
      return null;
    }

    return { supabaseAdmin, user };
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Authorization failed.' });
    return null;
  }
}

async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!adminEmail || !adminPassword || !supabaseUrl || !serviceKey) return;

  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  const existing = data.users.find((user) => user.email === adminEmail);

  if (existing) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        approved: true,
        role: 'admin',
      },
    });
    return;
  }

  await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { approved: true, role: 'admin' },
  });
}

seedAdminUser().catch((error) => {
  console.error('Failed to seed admin user:', error.message || error);
});

// Route to create a user with a 'pending' status
authRouter.post('/create-pending', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const rate = checkCreatePendingRateLimit(req, normalizedEmail);
  if (!rate.allowed) {
    return res.status(429).json({ error: `Too many attempts. Try again in ${rate.retryAfterSec}s.` });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: listed } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existing = listed.users.find((user) => normalizeEmail(user.email || '') === normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'User already exists.' });
    }

    const { data: { user } } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // User is confirmed, but not approved
      user_metadata: {
        approved: false,
        requestedAt: new Date().toISOString(),
      },
    });

    res.status(201).json({ message: 'User created and awaiting approval.', user });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
        return res.status(409).json({ error: 'User already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Route to get all users (admin only)
authRouter.get('/users', async (req: Request, res: Response) => {
  const guard = await requireAdmin(req, res);
  if (!guard) return;

  try {
    const { supabaseAdmin } = guard;
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    if (error) throw error;

    const normalized = users
      .map((user: any) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        approved: user.user_metadata?.approved === true,
        role: user.user_metadata?.role || 'user',
        approvedAt: user.user_metadata?.approvedAt || null,
        approvedBy: user.user_metadata?.approvedBy || null,
      }))
      .sort((a: any, b: any) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });

    res.json(normalized);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Route to get all pending users
authRouter.get('/pending-users', async (_req: Request, res: Response) => {
    const guard = await requireAdmin(_req, res);
    if (!guard) return;

    try {
      const { supabaseAdmin } = guard;
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  
      if (error) throw error;
  
      const pendingUsers = users.filter((user: any) => !user.user_metadata?.approved);
      res.json(pendingUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Route to approve a user
  authRouter.post('/approve-user', async (req: Request, res: Response) => {
    const guard = await requireAdmin(req, res);
    if (!guard) return;

    const { userId } = req.body;
  
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }
  
    try {
      const { supabaseAdmin, user: adminUser } = guard;
      const { data: existingData, error: existingErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (existingErr || !existingData.user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const currentMeta = existingData.user.user_metadata || {};
      const actorEmail = adminUser.email || 'unknown-admin';

      const { data: { user }, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            ...currentMeta,
            approved: true,
            approvedAt: new Date().toISOString(),
            approvedBy: actorEmail,
          },
        }
      );
  
      if (error) throw error;
  
      logAdminAction('approve-user', actorEmail, user.email || 'unknown', user.id);
      res.json({ message: 'User approved successfully.', user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

// Route to remove a user (admin only)
authRouter.post('/remove-user', async (req: Request, res: Response) => {
  const guard = await requireAdmin(req, res);
  if (!guard) return;

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    const { supabaseAdmin, user: adminUser } = guard;

    if (adminUser.id === userId) {
      return res.status(400).json({ error: 'You cannot remove your own admin account.' });
    }

    const { data: targetData, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetErr || !targetData.user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'pilotadmin@pilotup.io';
    if (targetData.user.email === adminEmail || isAdminUser(targetData.user)) {
      return res.status(400).json({ error: 'Cannot remove admin users.' });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    logAdminAction(
      'remove-user',
      adminUser.email || 'unknown-admin',
      targetData.user.email || 'unknown',
      targetData.user.id
    );

    res.json({ message: 'User removed successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});