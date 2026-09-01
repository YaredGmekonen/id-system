import { personRepository } from '../repositories/person.repository.js';
import { batchRepository } from '../repositories/batch.repository.js';
import { storageService } from '../storage/storageService.js';
import type { Person, PersonFilterParams, PaginatedResult } from '../types/index.js';
import { NotFoundError } from '../utils/errors.js';

export class PersonService {
  async getPersons(orgId: string, filters: PersonFilterParams): Promise<PaginatedResult<Person>> {
    return personRepository.findPaginated(orgId, filters);
  }

  async getPersonById(orgId: string, id: number): Promise<Person> {
    const person = await personRepository.findById(orgId, id);
    if (!person) throw new NotFoundError('Person', id);
    return person;
  }

  async createPerson(orgId: string, data: Partial<Person>): Promise<Person> {
    // If base64 photo is provided, offload to object storage
    if (data.photoDataUrl && data.photoDataUrl.startsWith('data:image/')) {
      const saved = await storageService.savePersonPhoto(
        orgId,
        data.idNumber || 'new',
        data.photoDataUrl
      );
      data.photoStoragePath = saved.storagePath;
      data.photoUrl = saved.url;
    }

    const created = await personRepository.create(orgId, data);

    // Update batch record count if part of a batch
    if (created.batchFolderId) {
      const batch = await batchRepository.findById(orgId, created.batchFolderId);
      if (batch) {
        await batchRepository.update(orgId, created.batchFolderId, {
          totalRecords: (batch.totalRecords || 0) + 1,
        });
      }
    }

    return created;
  }

  async bulkCreatePersons(
    orgId: string,
    persons: Partial<Person>[],
    batchFolderId?: number
  ): Promise<{ insertedCount: number }> {
    // Process photos asynchronously for storage if data URLs exist
    for (const p of persons) {
      if (p.photoDataUrl && p.photoDataUrl.startsWith('data:image/')) {
        try {
          const saved = await storageService.savePersonPhoto(
            orgId,
            p.idNumber || `rec_${Date.now()}`,
            p.photoDataUrl
          );
          p.photoStoragePath = saved.storagePath;
          p.photoUrl = saved.url;
        } catch {
          // If storage save fails, preserve photoDataUrl as fallback
        }
      }
    }

    const insertedCount = await personRepository.bulkCreate(orgId, persons, batchFolderId);

    // Update batch folder record count
    if (batchFolderId) {
      const batch = await batchRepository.findById(orgId, batchFolderId);
      if (batch) {
        await batchRepository.update(orgId, batchFolderId, {
          totalRecords: (batch.totalRecords || 0) + insertedCount,
        });
      }
    }

    return { insertedCount };
  }

  async updatePerson(orgId: string, id: number, changes: Partial<Person>): Promise<Person> {
    if (changes.photoDataUrl && changes.photoDataUrl.startsWith('data:image/')) {
      const saved = await storageService.savePersonPhoto(
        orgId,
        id,
        changes.photoDataUrl
      );
      changes.photoStoragePath = saved.storagePath;
      changes.photoUrl = saved.url;
    }

    const updated = await personRepository.update(orgId, id, changes);
    if (!updated) throw new NotFoundError('Person', id);
    return updated;
  }

  async deletePerson(orgId: string, id: number): Promise<void> {
    const person = await this.getPersonById(orgId, id);
    await personRepository.delete(orgId, id);

    if (person.batchFolderId) {
      const batch = await batchRepository.findById(orgId, person.batchFolderId);
      if (batch && batch.totalRecords > 0) {
        await batchRepository.update(orgId, person.batchFolderId, {
          totalRecords: Math.max(0, batch.totalRecords - 1),
        });
      }
    }
  }

  async bulkDeletePersons(orgId: string, ids: number[]): Promise<{ deletedCount: number }> {
    const deletedCount = await personRepository.bulkDelete(orgId, ids);
    return { deletedCount };
  }
}

export const personService = new PersonService();
