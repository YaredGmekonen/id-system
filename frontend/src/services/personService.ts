import { apiClient } from '../api/client';
import { db, type Person } from '../db/database';

export class PersonService {
  /**
   * Fetch persons with pagination and filters (with Dexie offline fallback)
   */
  async getPersons(filters: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    department?: string;
    status?: string;
    batchFolderId?: number;
  } = {}): Promise<{ persons: Person[]; total: number }> {
    try {
      const res = await apiClient.get<Person[]>('persons', filters);
      if (res.success && res.data) {
        return {
          persons: res.data,
          total: res.pagination?.total || res.data.length,
        };
      }
    } catch {
      // Fallback to local Dexie
    }

    // Local Dexie query
    let query = db.people.toCollection();
    if (filters.batchFolderId) {
      query = db.people.where('batchFolderId').equals(filters.batchFolderId);
    } else if (filters.category && filters.category !== 'All') {
      query = db.people.where('category').equals(filters.category);
    }

    const all = await query.toArray();
    let filtered = all;

    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.fullName?.toLowerCase().includes(term) ||
          p.idNumber?.toLowerCase().includes(term) ||
          p.department?.toLowerCase().includes(term)
      );
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return {
      persons: paginated,
      total: filtered.length,
    };
  }

  /**
   * Add a person (syncs to backend and mirrors to local Dexie)
   */
  async addPerson(person: Omit<Person, 'id'>): Promise<number> {
    try {
      const res = await apiClient.post<Person>('persons', person);
      if (res.success && res.data?.id) {
        await db.people.put({ ...person, id: res.data.id } as Person);
        return res.data.id;
      }
    } catch {
      // Offline fallback
    }

    return (await db.people.add(person as Person)) as number;
  }

  /**
   * Bulk add persons (e.g. from Excel or CSV import)
   */
  async bulkAddPersons(persons: Omit<Person, 'id'>[], batchFolderId?: number): Promise<number> {
    try {
      const res = await apiClient.post('persons/bulk', { persons, batchFolderId });
      if (res.success) {
        await db.people.bulkAdd(persons as Person[]);
        return res.insertedCount || persons.length;
      }
    } catch {
      // Offline fallback
    }

    await db.people.bulkAdd(persons as Person[]);
    return persons.length;
  }

  /**
   * Update a person
   */
  async updatePerson(id: number, changes: Partial<Person>): Promise<void> {
    try {
      await apiClient.put(`persons/${id}`, changes);
    } catch {
      // Proceed with local update
    }
    await db.people.update(id, changes);
  }

  /**
   * Delete a person
   */
  async deletePerson(id: number): Promise<void> {
    try {
      await apiClient.delete(`persons/${id}`);
    } catch {
      // Proceed with local delete
    }
    await db.people.delete(id);
  }
}

export const personService = new PersonService();
