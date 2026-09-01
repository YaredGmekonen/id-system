import { Router } from 'express';
import type { Request, Response } from 'express';
import { localDb } from '../db/localStore.js';

export const usersRouter = Router();

/**
 * Find a user index by ID first, then fall back to email lookup.
 * This resolves the mismatch between Dexie auto-increment IDs (15, 16, ...)
 * and JSON store IDs ("1", "2", ...).
 */
function findUserIndex(users: any[], id: string, email?: string): number {
  // 1. Try exact ID match
  let idx = users.findIndex(u => String(u.id) === String(id));
  if (idx >= 0) return idx;

  // 2. Try email match (sent via query param or body)
  if (email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    idx = users.findIndex(u => (u.email || '').toLowerCase() === normalizedEmail);
  }
  return idx;
}

// GET /api/v1/users — list all users
usersRouter.get('/', (req: Request, res: Response) => {
  const users = localDb.get('users') || [];
  return res.json(users);
});

// GET /api/v1/users/check?email=... — check if an account is registered
usersRouter.get('/check', (req: Request, res: Response) => {
  const email = req.query.email as string | undefined;
  if (!email) {
    return res.status(400).json({ success: false, error: { message: 'Email parameter is required' } });
  }

  const users = localDb.get('users') || [];
  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = users.find((u: any) => (u.email || '').toLowerCase() === normalizedEmail);

  if (existingUser) {
    return res.json({
      success: true,
      exists: true,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        status: existingUser.status,
        avatar: existingUser.avatar,
      },
    });
  }

  return res.json({
    success: true,
    exists: false,
  });
});

// POST /api/v1/users — create new user account
usersRouter.post('/', (req: Request, res: Response) => {
  const { name, email, role, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, error: { message: 'Name and email are required' } });
  }

  const users = localDb.get('users') || [];
  const normalizedEmail = String(email).trim().toLowerCase();

  // Check if user with same email exists
  const existingIdx = users.findIndex(u => (u.email || '').toLowerCase() === normalizedEmail);
  if (existingIdx >= 0) {
    return res.status(409).json({ success: false, error: { message: `User with email "${normalizedEmail}" already exists` } });
  }

  const avatar = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'US';
  const finalPassword = password ? String(password).trim() : 'password123';
  const userRole = role || 'collector';

  const newUser = {
    id: String(Date.now()),
    organization_id: '00000000-0000-0000-0000-000000000001',
    name: name.trim(),
    email: normalizedEmail,
    password: finalPassword,
    role: userRole,
    status: 'Active',
    avatar,
    last_login_at: 'Never',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  users.unshift(newUser);
  localDb.set('users', users);

  // Synchronize with workers table if collector or designer
  if (userRole === 'collector' || userRole === 'designer') {
    const workers = localDb.get('workers') || [];
    const newWorker = {
      id: Date.now(),
      organization_id: '00000000-0000-0000-0000-000000000001',
      name: name.trim(),
      email: normalizedEmail,
      role: userRole === 'collector' ? 'Lead Biometrics Registrar' : 'Credential Designer',
      avatar,
      status: 'Online',
      location: 'HQ Operations Hub',
      shift_start_time: '08:30 AM',
      last_active: 'Just now',
      records_collected: 0,
      battery_level: 100,
      signal_strength: 'Strong',
      assigned_district: 'HQ Operations Hub',
      phone: '+251 900 000 000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    workers.unshift(newWorker);
    localDb.set('workers', workers);
  }

  return res.status(201).json({ success: true, data: newUser, message: 'User created successfully' });
});

// PUT /api/v1/users/:id — update user account
usersRouter.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, role, password, status } = req.body;
  const users = localDb.get('users') || [];

  const index = findUserIndex(users, id, email);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { message: `User ${id} not found` } });
  }

  const updatedUser = {
    ...users[index],
    name: name ? name.trim() : users[index].name,
    email: email ? String(email).trim().toLowerCase() : users[index].email,
    role: role || users[index].role,
    password: password ? String(password).trim() : users[index].password,
    status: status || users[index].status,
    updated_at: new Date().toISOString(),
  };

  users[index] = updatedUser;
  localDb.set('users', users);

  return res.json({ success: true, data: updatedUser, message: 'User updated successfully' });
});

// PATCH /api/v1/users/:id/status — activate / suspend user account
usersRouter.patch('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, email } = req.body;
  const users = localDb.get('users') || [];

  const index = findUserIndex(users, id, email);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { message: `User ${id} not found` } });
  }

  users[index].status = status || 'Active';
  users[index].updated_at = new Date().toISOString();
  localDb.set('users', users);

  return res.json({ success: true, data: users[index], message: `User status updated to ${status}` });
});

// DELETE /api/v1/users/:id — delete user account
usersRouter.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const email = req.query.email as string | undefined;
  let users = localDb.get('users') || [];

  // Find by ID first, then email fallback
  const index = findUserIndex(users, id, email);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { message: `User ${id} not found` } });
  }

  const removedEmail = (users[index].email || '').toLowerCase();
  users.splice(index, 1);
  localDb.set('users', users);

  // Also remove matching worker
  if (removedEmail) {
    let workers = localDb.get('workers') || [];
    workers = workers.filter(w => (w.email || '').toLowerCase() !== removedEmail);
    localDb.set('workers', workers);
  }

  return res.json({ success: true, message: 'User deleted successfully' });
});
