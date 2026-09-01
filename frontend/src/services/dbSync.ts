import apiClient from '../api/client';
import { db } from '../db/database';
import type { UserAccount } from '../db/database';

const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('idplatform_sync') : null;

export function broadcastDbChange(entity: string) {
  if (syncChannel) {
    syncChannel.postMessage({ type: 'DB_CHANGED', entity, timestamp: Date.now() });
  }
}

/**
 * Check if a user account or Google email is registered in local Dexie or Central Server
 */
export async function checkAccountExistence(email: string): Promise<{
  exists: boolean;
  user?: {
    id?: number | string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return { exists: false };

  // 1. Check local Dexie first
  try {
    const localUser = await db.users.filter(u => (u.email || '').toLowerCase().trim() === cleanEmail).first();
    if (localUser) {
      return {
        exists: true,
        user: {
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          role: localUser.role,
          status: localUser.status || 'Active',
        },
      };
    }
  } catch {}

  // 2. Check Central Server API
  try {
    const res = await apiClient.get(`/users/check?email=${encodeURIComponent(cleanEmail)}`);
    if (res.data && res.data.exists) {
      return {
        exists: true,
        user: res.data.user,
      };
    }
  } catch {}

  return { exists: false };
}


/**
 * Syncs user accounts bidirectionally with the centralized backend database
 */
export async function syncUsersWithBackend(): Promise<UserAccount[]> {
  try {
    const res = await apiClient.get('/users');
    if (res.data && Array.isArray(res.data)) {
      const serverUsers = res.data;
      const allLocal = await db.users.toArray();
      const processedEmails = new Set<string>();

      for (const su of serverUsers) {
        const cleanEmail = (su.email || '').toLowerCase().trim();
        if (!cleanEmail) continue;
        processedEmails.add(cleanEmail);

        // Find all matching local records
        const matches = allLocal.filter(u => (u.email || '').toLowerCase().trim() === cleanEmail);
        if (matches.length > 0) {
          // Update the first match
          const first = matches[0];
          if (first.id) {
            await db.users.update(first.id, {
              name: su.name,
              role: su.role,
              status: su.status || 'Active',
              avatar: su.avatar || su.name.substring(0, 2).toUpperCase(),
              password: su.password || first.password || 'password123',
              lastLogin: su.last_login_at || su.lastLogin || first.lastLogin || 'Never',
            });
          }
          // Delete any extra duplicate records with this email
          for (let i = 1; i < matches.length; i++) {
            if (matches[i].id) {
              await db.users.delete(matches[i].id);
            }
          }
        } else {
          // Insert new record
          await db.users.add({
            name: su.name,
            email: cleanEmail,
            password: su.password || 'password123',
            role: su.role,
            status: su.status || 'Active',
            avatar: su.avatar || su.name.substring(0, 2).toUpperCase(),
            lastLogin: su.last_login_at || su.lastLogin || 'Never',
            createdAt: su.created_at ? new Date(su.created_at) : new Date(),
          });
        }
      }
    }
  } catch (err) {
    console.warn('[dbSync] Server sync offline, running in local Dexie mode:', err);
  }

  return db.users.toArray();
}

/**
 * Create user on both Central Server API and local Dexie
 */
export async function createUniversalUser(userData: {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'designer' | 'collector';
}): Promise<UserAccount> {
  const avatar = userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'US';
  const finalPassword = userData.password ? userData.password.trim() : 'password123';
  const cleanEmail = userData.email.trim().toLowerCase();

  // 1. Post to Central Server API
  try {
    await apiClient.post('/users', {
      name: userData.name.trim(),
      email: cleanEmail,
      password: finalPassword,
      role: userData.role,
    });
  } catch (err) {
    console.warn('[createUniversalUser] Server post failed, saved to local cache:', err);
  }

  // 2. Add / Update in local Dexie
  const existing = await db.users.filter(u => u.email.toLowerCase() === cleanEmail).first();
  let createdId: number = existing?.id || Date.now();
  if (existing && existing.id) {
    await db.users.update(existing.id, {
      name: userData.name.trim(),
      role: userData.role,
      password: finalPassword,
      status: 'Active',
      avatar,
    });
    createdId = existing.id;
  } else {
    const addResult = await db.users.add({
      name: userData.name.trim(),
      email: cleanEmail,
      password: finalPassword,
      role: userData.role,
      status: 'Active',
      avatar,
      lastLogin: 'Never',
      createdAt: new Date(),
    });
    createdId = Number(addResult);
  }

  // 3. Sync worker table
  if (userData.role === 'collector' || userData.role === 'designer') {
    const existingWorker = await db.workers.filter(w => w.email.toLowerCase() === cleanEmail).first();
    if (!existingWorker) {
      await db.workers.add({
        name: userData.name.trim(),
        email: cleanEmail,
        role: userData.role === 'collector' ? 'Lead Biometrics Registrar' : 'Credential Designer',
        avatar,
        status: 'Online',
        location: 'HQ Operations Hub',
        shiftStartTime: '08:30 AM',
        lastActive: 'Just now',
        recordsCollected: 0,
        batteryLevel: 100,
        signalStrength: 'Strong',
        assignedDistrict: 'HQ Operations Hub',
        phone: '+1 (555) 0123',
        createdAt: new Date(),
      });
    }
  }

  broadcastDbChange('users');

  return {
    id: createdId,
    name: userData.name.trim(),
    email: cleanEmail,
    password: finalPassword,
    role: userData.role,
    status: 'Active',
    avatar,
    lastLogin: 'Never',
    createdAt: new Date(),
  };
}

/**
 * Update user on Central Server API and local Dexie
 */
export async function updateUniversalUser(
  id: number,
  userData: {
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'designer' | 'collector';
    status: 'Active' | 'Suspended';
  }
): Promise<void> {
  const cleanEmail = userData.email.trim().toLowerCase();
  const avatar = userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // 1. Update in local Dexie
  await db.users.update(id, {
    name: userData.name.trim(),
    email: cleanEmail,
    password: userData.password ? userData.password.trim() : 'password123',
    role: userData.role,
    status: userData.status,
    avatar,
  });

  // 2. Update on Central Server API
  try {
    await apiClient.put(`/users/${id}`, {
      name: userData.name.trim(),
      email: cleanEmail,
      password: userData.password ? userData.password.trim() : 'password123',
      role: userData.role,
      status: userData.status,
    });
  } catch (err) {
    console.warn('[updateUniversalUser] Server update failed:', err);
  }

  broadcastDbChange('users');
}

/**
 * Toggle user status on Central Server API and local Dexie
 */
export async function toggleUniversalUserStatus(id: number, nextStatus: 'Active' | 'Suspended'): Promise<void> {
  // Get the user's email before updating so we can send it for server-side fallback lookup
  const user = await db.users.get(id);
  const email = user?.email || '';

  await db.users.update(id, { status: nextStatus });
  try {
    await apiClient.patch(`/users/${id}/status`, { status: nextStatus, email });
  } catch (err) {
    console.warn('[toggleUniversalUserStatus] Server status update failed (local update still applied):', err);
  }
  broadcastDbChange('users');
}

/**
 * Delete user on Central Server API and local Dexie
 */
export async function deleteUniversalUser(id: number, email?: string): Promise<void> {
  // Get email from Dexie if not passed
  if (!email) {
    const user = await db.users.get(id);
    email = user?.email;
  }

  await db.users.delete(id);
  if (email) {
    const worker = await db.workers.filter(w => w.email.toLowerCase() === email!.toLowerCase()).first();
    if (worker?.id) {
      await db.workers.delete(worker.id);
    }
  }
  try {
    const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
    await apiClient.delete(`/users/${id}${emailParam}`);
  } catch (err) {
    console.warn('[deleteUniversalUser] Server delete failed (local delete still applied):', err);
  }
  broadcastDbChange('users');
}
