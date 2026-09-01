import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  type Person,
  type CardTemplate,
  type Worker,
  type UserAccount,
  type ArchivePageTemplate,
  type BatchFolder,
} from './database';
import { pushToBackend, pushDeleteToBackend } from '../services/syncEngine';

// ===== PEOPLE HOOKS =====

export function usePeople() {
  return useLiveQuery(() => db.people.toArray()) ?? [];
}

export function usePersonById(id: number | undefined) {
  return useLiveQuery(
    () => (id !== undefined ? db.people.get(id) : undefined),
    [id]
  );
}

// ===== BATCH FOLDERS HOOKS =====

export function useBatchFolders() {
  return useLiveQuery(() => db.batchFolders.toArray()) ?? [];
}

export function useBatchFolderById(id: number | undefined) {
  return useLiveQuery(
    () => (id !== undefined ? db.batchFolders.get(id) : undefined),
    [id]
  );
}

// ===== TEMPLATES HOOKS =====

export function useTemplates() {
  return useLiveQuery(() => db.templates.toArray()) ?? [];
}

export function useTemplateById(id: number | undefined) {
  return useLiveQuery(
    () => (id !== undefined ? db.templates.get(id) : undefined),
    [id]
  );
}

// ===== ARCHIVE TEMPLATES HOOKS =====

export function useArchiveTemplates() {
  return useLiveQuery(() => db.archiveTemplates.toArray()) ?? [];
}

export function useArchiveTemplateById(id: number | undefined) {
  return useLiveQuery(
    () => (id !== undefined ? db.archiveTemplates.get(id) : undefined),
    [id]
  );
}

// ===== WORKERS HOOKS =====

export function useWorkers() {
  return useLiveQuery(() => db.workers.toArray()) ?? [];
}

export function useWorkerById(id: number | undefined) {
  return useLiveQuery(
    () => (id !== undefined ? db.workers.get(id) : undefined),
    [id]
  );
}

// ===== USERS HOOKS =====

export function useUserAccounts() {
  return useLiveQuery(() => db.users.toArray()) ?? [];
}

// ===== MUTATIONS =====

export async function addPerson(person: Omit<Person, 'id'>): Promise<number> {
  const id = (await db.people.add(person)) as number;
  if (person.workerId) {
    const worker = await db.workers.get(person.workerId);
    if (worker) {
      await db.workers.update(person.workerId, {
        recordsCollected: (worker.recordsCollected || 0) + 1,
        lastActive: 'Just now',
      });
    }
  }
  await recordAuditLog(person.collectedBy || 'Collector', 'INTAKE_REGISTERED', `Registered new cardholder: ${person.fullName} (${person.idNumber}) in batch: ${person.department || 'General'}`);

  // Push to backend for real-time cross-client sync
  pushToBackend('persons', { ...person, id });

  return id;
}

export async function deletePerson(id: number): Promise<void> {
  const p = await db.people.get(id);
  await db.people.delete(id);
  if (p) {
    await recordAuditLog('Administrator', 'INTAKE_DELETED', `Deleted record for cardholder: ${p.fullName} (${p.idNumber})`);
  }
  // Push delete to backend
  pushDeleteToBackend('persons', id);
}

export async function deletePeople(ids: number[]): Promise<void> {
  await db.people.bulkDelete(ids);
  await recordAuditLog('Administrator', 'BATCH_RECORDS_DELETED', `Bulk deleted ${ids.length} cardholder records`);
  // Push bulk delete to backend
  pushDeleteToBackend('persons', ids);
}

export async function updatePerson(id: number, changes: Partial<Person>): Promise<void> {
  await db.people.update(id, changes);
  // Push update to backend
  const updated = await db.people.get(id);
  if (updated) pushToBackend('persons', updated);
}

export async function bulkAddPeople(people: Omit<Person, 'id'>[]): Promise<void> {
  await db.people.bulkAdd(people);
  await recordAuditLog('System Registrar', 'BATCH_IMPORTED', `Imported ${people.length} roster cardholder records into system`);
  // Push bulk data to backend
  pushToBackend('persons', people);
}

export async function addBatchFolder(folder: Omit<BatchFolder, 'id'>): Promise<number> {
  const id = (await db.batchFolders.add(folder)) as number;
  await recordAuditLog(folder.collectorName || 'Registrar', 'BATCH_CREATED', `Created new batch folder: ${folder.name} (${folder.sourceType})`);
  // Push to backend for real-time sync
  pushToBackend('batchFolders', { ...folder, id });
  return id;
}

export async function updateBatchFolder(id: number, changes: Partial<BatchFolder>): Promise<void> {
  await db.batchFolders.update(id, { ...changes, updatedAt: new Date() });
  // Push update to backend
  const updated = await db.batchFolders.get(id);
  if (updated) pushToBackend('batchFolders', updated);
}

export async function deleteBatchFolder(id: number): Promise<void> {
  const f = await db.batchFolders.get(id);
  await db.batchFolders.delete(id);
  if (f) {
    await recordAuditLog('Administrator', 'BATCH_DELETED', `Deleted batch folder: ${f.name}`);
  }
  // Push delete to backend
  pushDeleteToBackend('batchFolders', id);
}

export async function addTemplate(template: Omit<CardTemplate, 'id'>): Promise<number> {
  const id = (await db.templates.add(template)) as number;
  await recordAuditLog('Designer', 'TEMPLATE_CREATED', `Created custom master template: ${template.name} (${template.orientation || 'horizontal'})`);
  return id;
}

export async function updateTemplate(id: number, changes: Partial<CardTemplate>): Promise<void> {
  await (db.templates as any).update(id, { ...changes, updatedAt: new Date() });
  await recordAuditLog('Designer', 'TEMPLATE_UPDATED', `Updated master template (ID: ${id})`);
}

export async function deleteTemplate(id: number): Promise<void> {
  await db.templates.delete(id);
}

export async function addArchiveTemplate(template: Omit<ArchivePageTemplate, 'id'>): Promise<number> {
  return (await db.archiveTemplates.add(template)) as number;
}

export async function updateArchiveTemplate(id: number, changes: Partial<ArchivePageTemplate>): Promise<void> {
  await db.archiveTemplates.update(id, { ...changes, updatedAt: new Date() });
}

export async function deleteArchiveTemplate(id: number): Promise<void> {
  await db.archiveTemplates.delete(id);
}

// ===== WORKERS & USER ACCOUNTS MUTATIONS =====
export async function addWorker(worker: Omit<Worker, 'id'>): Promise<number> {
  return (await db.workers.add(worker)) as number;
}

export async function updateWorker(id: number, changes: Partial<Worker>): Promise<void> {
  await db.workers.update(id, changes);
}

export async function deleteWorker(id: number): Promise<void> {
  await db.workers.delete(id);
}

export async function addUserAccount(user: Omit<UserAccount, 'id'>): Promise<number> {
  return (await db.users.add(user)) as number;
}

export async function updateUserAccount(id: number, changes: Partial<UserAccount>): Promise<void> {
  await db.users.update(id, changes);
}

export async function deleteUserAccount(id: number): Promise<void> {
  await db.users.delete(id);
}

// ===== PRINT JOBS HOOKS & MUTATIONS =====
export function usePrintJobs() {
  return useLiveQuery(() => db.printJobs.orderBy('createdAt').reverse().toArray()) ?? [];
}

export async function addPrintJob(job: Omit<import('./database').PrintJob, 'id'>): Promise<number> {
  const id = (await db.printJobs.add(job)) as number;
  await recordAuditLog(job.operatorName || 'System', 'PRINT_EXPORTED', `Exported ${job.totalCards} cards (${job.totalSheets} sheets, ${job.paperSize}) for batch: ${job.batchName}`);
  return id;
}

export async function deletePrintJob(id: number): Promise<void> {
  await db.printJobs.delete(id);
}

// ===== AUDIT LOGS HOOKS & MUTATIONS =====
export function useAuditLogs() {
  return useLiveQuery(() => db.auditLogs.orderBy('createdAt').reverse().toArray()) ?? [];
}

export async function recordAuditLog(actor: string, action: string, details: string, ip: string = '127.0.0.1'): Promise<number> {
  try {
    return (await db.auditLogs.add({
      actor,
      action,
      details,
      ip,
      createdAt: new Date(),
    })) as number;
  } catch {
    return 0;
  }
}

export async function clearAuditLogs(): Promise<void> {
  await db.auditLogs.clear();
}
