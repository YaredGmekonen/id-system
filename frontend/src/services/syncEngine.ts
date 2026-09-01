/**
 * ============================================================================
 * SyncEngine — Real-Time Bidirectional Sync Between Dexie & Backend
 * ============================================================================
 *
 * Problem: Each browser tab has its own IndexedDB (Dexie). When a collector
 * adds a person, the admin's Dexie doesn't know about it.
 *
 * Solution: Pull from the backend every 3 seconds → merge into local Dexie.
 * All mutations also push to backend immediately (write-through in hooks.ts).
 */

import { apiClient } from '../api/client';
import { db } from '../db/database';
import type { Person, BatchFolder } from '../db/database';
import { broadcastDbChange } from './dbSync';

let syncInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;
let lastSyncTimestamp = 0;

const SYNC_INTERVAL_MS = 3000; // 3 seconds for near real-time

/**
 * Pull all data from backend and merge into local Dexie
 */
export async function syncNow(): Promise<void> {
  if (isSyncing) return; // Prevent overlapping syncs
  isSyncing = true;

  try {
    // Check if backend is reachable first (fast timeout)
    const isOnline = await apiClient.isBackendAvailable();
    if (!isOnline) {
      isSyncing = false;
      return;
    }

    const res = await apiClient.get('sync/all');
    if (!res.success || !res.data) {
      isSyncing = false;
      return;
    }

    const serverData = res.data;
    const now = Date.now();

    // ---- Merge Persons ----
    if (Array.isArray(serverData.persons) && serverData.persons.length > 0) {
      await mergePersons(serverData.persons);
    }

    // ---- Merge Batch Folders ----
    if (Array.isArray(serverData.batchFolders) && serverData.batchFolders.length > 0) {
      await mergeBatchFolders(serverData.batchFolders);
    }

    // ---- Merge Users ----
    if (Array.isArray(serverData.users) && serverData.users.length > 0) {
      await mergeUsers(serverData.users);
    }

    // ---- Merge Workers ----
    if (Array.isArray(serverData.workers) && serverData.workers.length > 0) {
      await mergeWorkers(serverData.workers);
    }

    lastSyncTimestamp = now;

    // Broadcast so other tabs using BroadcastChannel also update
    broadcastDbChange('persons');
    broadcastDbChange('batchFolders');
    broadcastDbChange('users');
    broadcastDbChange('workers');
  } catch (err) {
    // Silently fail — offline is OK
    console.debug('[SyncEngine] Sync pull failed (offline?):', (err as Error).message);
  } finally {
    isSyncing = false;
  }
}

/**
 * Merge server persons into local Dexie
 */
async function mergePersons(serverPersons: any[]): Promise<void> {
  const localPersons = await db.people.toArray();
  const localById = new Map(localPersons.map(p => [String(p.id), p]));
  const serverIds = new Set<string>();

  for (const sp of serverPersons) {
    const id = Number(sp.id);
    if (!id || isNaN(id)) continue;
    serverIds.add(String(id));

    const mapped: Partial<Person> = {
      id,
      fullName: sp.fullName || sp.full_name || 'Unknown',
      firstName: sp.firstName || sp.first_name || '',
      lastName: sp.lastName || sp.last_name || '',
      idNumber: sp.idNumber || sp.id_number || '',
      category: sp.category || 'Standard',
      department: sp.department || '',
      role: sp.role || 'Member',
      phone: sp.phone || '',
      email: sp.email || '',
      bloodGroup: sp.bloodGroup || sp.blood_group || '',
      joinedDate: sp.joinedDate || sp.joined_date || '',
      gender: sp.gender || '',
      schoolName: sp.schoolName || sp.school_name || '',
      grade: sp.grade || '',
      section: sp.section || '',
      rollNumber: sp.rollNumber || sp.roll_number || '',
      guardianName: sp.guardianName || sp.guardian_name || '',
      photoDataUrl: sp.photoDataUrl || sp.photo_data_url || '',
      status: sp.status || 'Active',
      fulfillmentStatus: sp.fulfillmentStatus || sp.fulfillment_status || 'Unfulfilled',
      paymentStatus: sp.paymentStatus || sp.payment_status || 'Paid',
      channel: sp.channel || '',
      totalAmount: sp.totalAmount || sp.total_amount || '',
      workerId: sp.workerId || sp.worker_id || undefined,
      collectedBy: sp.collectedBy || sp.collected_by || '',
      location: sp.location || '',
      batchFolderId: sp.batchFolderId || sp.batch_folder_id || undefined,
      folderName: sp.folderName || sp.folder_name || '',
      sourceFileName: sp.sourceFileName || sp.source_file_name || '',
      createdAt: sp.createdAt ? new Date(sp.createdAt) : (sp.created_at ? new Date(sp.created_at) : new Date()),
    };

    const existing = localById.get(String(id));
    if (existing) {
      // Update existing record
      await db.people.update(id, mapped);
    } else {
      // Insert new record
      try {
        await db.people.put(mapped as Person);
      } catch {
        // If put fails (e.g. constraint), skip
      }
    }
  }
}

/**
 * Merge server batch folders into local Dexie
 */
async function mergeBatchFolders(serverFolders: any[]): Promise<void> {
  const localFolders = await db.batchFolders.toArray();
  const localById = new Map(localFolders.map(f => [String(f.id), f]));

  for (const sf of serverFolders) {
    const id = Number(sf.id);
    if (!id || isNaN(id)) continue;

    const mapped: Partial<BatchFolder> = {
      id,
      name: sf.name || 'Unnamed Batch',
      sourceType: sf.sourceType || sf.source_type || 'Manual Intake',
      status: sf.status || 'Ready for Design',
      collectorName: sf.collectorName || sf.collector_name || 'Field Officer',
      totalRecords: sf.totalRecords || sf.total_records || 0,
      assignedDesigner: sf.assignedDesigner || sf.assigned_designer || undefined,
      notes: sf.notes || undefined,
      createdAt: sf.createdAt ? new Date(sf.createdAt) : (sf.created_at ? new Date(sf.created_at) : new Date()),
      updatedAt: sf.updatedAt ? new Date(sf.updatedAt) : (sf.updated_at ? new Date(sf.updated_at) : new Date()),
    };

    const existing = localById.get(String(id));
    if (existing) {
      await db.batchFolders.update(id, mapped);
    } else {
      try {
        await db.batchFolders.put(mapped as BatchFolder);
      } catch {
        // Skip on conflict
      }
    }
  }
}

/**
 * Merge server users into local Dexie
 */
async function mergeUsers(serverUsers: any[]): Promise<void> {
  for (const su of serverUsers) {
    const cleanEmail = (su.email || '').toLowerCase().trim();
    if (!cleanEmail) continue;

    const existing = await db.users.filter(u => u.email.toLowerCase().trim() === cleanEmail).first();
    const userData = {
      name: su.name,
      email: cleanEmail,
      password: su.password || existing?.password || 'password123',
      role: su.role || 'collector',
      status: su.status || 'Active',
      avatar: su.avatar || su.name?.substring(0, 2).toUpperCase() || 'US',
      lastLogin: su.last_login_at || su.lastLogin || existing?.lastLogin || 'Never',
      createdAt: su.created_at ? new Date(su.created_at) : (existing?.createdAt || new Date()),
    };

    if (existing && existing.id) {
      await db.users.update(existing.id, userData);
    } else {
      try {
        await db.users.add(userData as any);
      } catch {
        // Skip duplicates
      }
    }
  }
}

/**
 * Merge server workers into local Dexie
 */
async function mergeWorkers(serverWorkers: any[]): Promise<void> {
  for (const sw of serverWorkers) {
    const id = Number(sw.id);
    if (!id || isNaN(id)) continue;

    const existing = await db.workers.get(id);
    const workerData = {
      id,
      name: sw.name || 'Worker',
      email: sw.email || '',
      role: sw.role || '',
      avatar: sw.avatar || '',
      status: sw.status || 'Online',
      location: sw.location || '',
      shiftStartTime: sw.shiftStartTime || sw.shift_start_time || '',
      lastActive: sw.lastActive || sw.last_active || '',
      recordsCollected: sw.recordsCollected || sw.records_collected || 0,
      batteryLevel: sw.batteryLevel || sw.battery_level || 100,
      signalStrength: sw.signalStrength || sw.signal_strength || 'Strong',
      assignedDistrict: sw.assignedDistrict || sw.assigned_district || '',
      phone: sw.phone || '',
      createdAt: sw.created_at ? new Date(sw.created_at) : (existing?.createdAt || new Date()),
    };

    if (existing) {
      await db.workers.update(id, workerData);
    } else {
      try {
        await db.workers.put(workerData as any);
      } catch {
        // Skip
      }
    }
  }
}

/**
 * Push a single entity change to the backend sync endpoint
 */
export async function pushToBackend(entity: string, data: any): Promise<void> {
  try {
    const payload: Record<string, any[]> = {};
    payload[entity] = Array.isArray(data) ? data : [data];
    await apiClient.post('sync/push', payload);
  } catch {
    // Offline — silently fail, data is already in local Dexie
    console.debug(`[SyncEngine] Push failed for ${entity} (offline?)`);
  }
}

/**
 * Push a delete operation to the backend
 */
export async function pushDeleteToBackend(entity: string, id: number | number[]): Promise<void> {
  try {
    const ids = Array.isArray(id) ? id : [id];
    await apiClient.post('sync/delete', { entity, ids });
  } catch {
    console.debug(`[SyncEngine] Delete push failed for ${entity} (offline?)`);
  }
}

/**
 * Start the background sync loop
 */
export function startSync(): void {
  if (syncInterval) return; // Already running

  console.log('[SyncEngine] Starting real-time sync (every 3s)');

  // Do an immediate sync on start
  syncNow();

  syncInterval = setInterval(() => {
    syncNow();
  }, SYNC_INTERVAL_MS);
}

/**
 * Stop the background sync loop
 */
export function stopSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[SyncEngine] Sync stopped');
  }
}

/**
 * Get the last sync timestamp
 */
export function getLastSyncTime(): number {
  return lastSyncTimestamp;
}
