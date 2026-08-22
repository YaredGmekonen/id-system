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
  return id;
}

export async function deletePerson(id: number): Promise<void> {
  await db.people.delete(id);
}

export async function deletePeople(ids: number[]): Promise<void> {
  await db.people.bulkDelete(ids);
}

export async function updatePerson(id: number, changes: Partial<Person>): Promise<void> {
  await db.people.update(id, changes);
}

export async function bulkAddPeople(people: Omit<Person, 'id'>[]): Promise<void> {
  await db.people.bulkAdd(people);
}

export async function addBatchFolder(folder: Omit<BatchFolder, 'id'>): Promise<number> {
  return (await db.batchFolders.add(folder)) as number;
}

export async function updateBatchFolder(id: number, changes: Partial<BatchFolder>): Promise<void> {
  await db.batchFolders.update(id, { ...changes, updatedAt: new Date() });
}

export async function deleteBatchFolder(id: number): Promise<void> {
  await db.batchFolders.delete(id);
}

export async function addTemplate(template: Omit<CardTemplate, 'id'>): Promise<number> {
  return (await db.templates.add(template)) as number;
}

export async function updateTemplate(id: number, changes: Partial<CardTemplate>): Promise<void> {
  await db.templates.update(id, { ...changes, updatedAt: new Date() });
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
