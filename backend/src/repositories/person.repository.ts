import { db } from '../db/index.js';
import type { Person, PersonFilterParams, PaginatedResult } from '../types/index.js';
import { normalizePagination, buildPaginatedResult } from '../utils/pagination.js';

export class PersonRepository {
  /**
   * Find paginated persons with dynamic filtering, indexed search, and sorting
   */
  async findPaginated(
    orgId: string,
    filters: PersonFilterParams
  ): Promise<PaginatedResult<Person>> {
    const { page, limit, offset, sortBy, sortOrder } = normalizePagination(filters);
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (filters.batchFolderId) {
      conditions.push(`batch_folder_id = $${paramIndex++}`);
      params.push(filters.batchFolderId);
    }

    if (filters.workerId) {
      conditions.push(`worker_id = $${paramIndex++}`);
      params.push(filters.workerId);
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(filters.category);
    }

    if (filters.department) {
      conditions.push(`department = $${paramIndex++}`);
      params.push(filters.department);
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        `(full_name ILIKE $${paramIndex} OR id_number ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
      );
      params.push(term);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Allowed sort columns
    const safeSortCols: Record<string, string> = {
      created_at: 'created_at',
      full_name: 'full_name',
      id_number: 'id_number',
      department: 'department',
      status: 'status',
    };
    const orderCol = safeSortCols[sortBy] || 'created_at';

    // Count query
    const countSql = `SELECT COUNT(*) AS total FROM persons WHERE ${whereClause}`;
    const countRes = await db.query<{ total: string }>(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // Data query
    const dataSql = `
      SELECT 
        id, organization_id as "organizationId", batch_folder_id as "batchFolderId",
        worker_id as "workerId", id_number as "idNumber", full_name as "fullName",
        first_name as "firstName", last_name as "lastName", category, department,
        role, phone, email, blood_group as "bloodGroup", joined_date as "joinedDate",
        gender, school_name as "schoolName", grade, section, roll_number as "rollNumber",
        guardian_name as "guardianName", emergency_phone as "emergencyPhone",
        photo_storage_path as "photoStoragePath", photo_url as "photoUrl",
        photo_data_url as "photoDataUrl", status, fulfillment_status as "fulfillmentStatus",
        payment_status as "paymentStatus", channel, total_amount as "totalAmount",
        location, collected_by as "collectedBy", folder_name as "folderName",
        source_file_name as "sourceFileName", archive_meta as "archiveMeta",
        custom_fields as "customFields", created_at as "createdAt", updated_at as "updatedAt"
      FROM persons
      WHERE ${whereClause}
      ORDER BY ${orderCol} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);
    const dataRes = await db.query<Person>(dataSql, params);

    return buildPaginatedResult(dataRes.rows, total, page, limit);
  }

  /**
   * Find person by ID
   */
  async findById(orgId: string, id: number): Promise<Person | null> {
    const sql = `
      SELECT 
        id, organization_id as "organizationId", batch_folder_id as "batchFolderId",
        worker_id as "workerId", id_number as "idNumber", full_name as "fullName",
        first_name as "firstName", last_name as "lastName", category, department,
        role, phone, email, blood_group as "bloodGroup", joined_date as "joinedDate",
        gender, school_name as "schoolName", grade, section, roll_number as "rollNumber",
        guardian_name as "guardianName", emergency_phone as "emergencyPhone",
        photo_storage_path as "photoStoragePath", photo_url as "photoUrl",
        photo_data_url as "photoDataUrl", status, fulfillment_status as "fulfillmentStatus",
        payment_status as "paymentStatus", channel, total_amount as "totalAmount",
        location, collected_by as "collectedBy", folder_name as "folderName",
        source_file_name as "sourceFileName", archive_meta as "archiveMeta",
        custom_fields as "customFields", created_at as "createdAt", updated_at as "updatedAt"
      FROM persons
      WHERE organization_id = $1 AND id = $2
    `;
    const res = await db.query<Person>(sql, [orgId, id]);
    return res.rows[0] || null;
  }

  /**
   * Find all persons in a batch folder for generation
   */
  async findByBatchFolderId(orgId: string, batchFolderId: number): Promise<Person[]> {
    const sql = `
      SELECT 
        id, organization_id as "organizationId", batch_folder_id as "batchFolderId",
        worker_id as "workerId", id_number as "idNumber", full_name as "fullName",
        first_name as "firstName", last_name as "lastName", category, department,
        role, phone, email, blood_group as "bloodGroup", joined_date as "joinedDate",
        gender, school_name as "schoolName", grade, section, roll_number as "rollNumber",
        guardian_name as "guardianName", emergency_phone as "emergencyPhone",
        photo_storage_path as "photoStoragePath", photo_url as "photoUrl",
        photo_data_url as "photoDataUrl", status, fulfillment_status as "fulfillmentStatus",
        payment_status as "paymentStatus", channel, total_amount as "totalAmount",
        location, collected_by as "collectedBy", folder_name as "folderName",
        source_file_name as "sourceFileName", archive_meta as "archiveMeta",
        custom_fields as "customFields", created_at as "createdAt", updated_at as "updatedAt"
      FROM persons
      WHERE organization_id = $1 AND batch_folder_id = $2
      ORDER BY id ASC
    `;
    const res = await db.query<Person>(sql, [orgId, batchFolderId]);
    return res.rows;
  }

  /**
   * Create a single person
   */
  async create(orgId: string, data: Partial<Person>): Promise<Person> {
    const sql = `
      INSERT INTO persons (
        organization_id, batch_folder_id, worker_id, id_number, full_name,
        first_name, last_name, category, department, role, phone, email,
        blood_group, joined_date, gender, school_name, grade, section,
        roll_number, guardian_name, emergency_phone, photo_storage_path,
        photo_url, photo_data_url, status, fulfillment_status, payment_status,
        channel, total_amount, location, collected_by, folder_name,
        source_file_name, archive_meta, custom_fields
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34, $35
      )
      RETURNING id, full_name as "fullName", id_number as "idNumber", created_at as "createdAt"
    `;

    const params = [
      orgId,
      data.batchFolderId || null,
      data.workerId || null,
      data.idNumber,
      data.fullName,
      data.firstName || null,
      data.lastName || null,
      data.category || 'Employees',
      data.department || 'General Operations',
      data.role || 'Staff Member',
      data.phone || '',
      data.email || '',
      data.bloodGroup || 'O+',
      data.joinedDate || '',
      data.gender || null,
      data.schoolName || null,
      data.grade || null,
      data.section || null,
      data.rollNumber || null,
      data.guardianName || null,
      data.emergencyPhone || null,
      data.photoStoragePath || null,
      data.photoUrl || null,
      data.photoDataUrl || null,
      data.status || 'Pending',
      data.fulfillmentStatus || 'Unfulfilled',
      data.paymentStatus || 'Pending',
      data.channel || 'Web Platform',
      data.totalAmount || null,
      data.location || null,
      data.collectedBy || null,
      data.folderName || null,
      data.sourceFileName || null,
      data.archiveMeta ? JSON.stringify(data.archiveMeta) : null,
      data.customFields ? JSON.stringify(data.customFields) : '{}',
    ];

    const res = await db.query(sql, params);
    return (await this.findById(orgId, res.rows[0].id))!;
  }

  /**
   * Bulk insert persons (Memory safe chunked multi-row insertion)
   */
  async bulkCreate(
    orgId: string,
    persons: Partial<Person>[],
    batchFolderId?: number
  ): Promise<number> {
    if (!persons.length) return 0;

    let insertedCount = 0;
    const chunkSize = 200;

    for (let i = 0; i < persons.length; i += chunkSize) {
      const chunk = persons.slice(i, i + chunkSize);
      await db.transaction(async client => {
        for (const p of chunk) {
          const sql = `
            INSERT INTO persons (
              organization_id, batch_folder_id, worker_id, id_number, full_name,
              category, department, role, phone, email, blood_group, joined_date,
              photo_storage_path, photo_url, photo_data_url, status, folder_name, source_file_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (organization_id, id_number) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              department = EXCLUDED.department,
              role = EXCLUDED.role,
              photo_url = COALESCE(EXCLUDED.photo_url, persons.photo_url),
              updated_at = CURRENT_TIMESTAMP
          `;
          await client.query(sql, [
            orgId,
            batchFolderId || p.batchFolderId || null,
            p.workerId || null,
            p.idNumber,
            p.fullName,
            p.category || 'Employees',
            p.department || 'General Operations',
            p.role || 'Staff Member',
            p.phone || '',
            p.email || '',
            p.bloodGroup || 'O+',
            p.joinedDate || '',
            p.photoStoragePath || null,
            p.photoUrl || null,
            p.photoDataUrl || null,
            p.status || 'Pending',
            p.folderName || null,
            p.sourceFileName || null,
          ]);
          insertedCount++;
        }
      });
    }

    return insertedCount;
  }

  /**
   * Update person by ID
   */
  async update(orgId: string, id: number, changes: Partial<Person>): Promise<Person | null> {
    const fields: string[] = [];
    const params: any[] = [orgId, id];
    let paramIndex = 3;

    const columnMap: Record<string, string> = {
      fullName: 'full_name',
      firstName: 'first_name',
      lastName: 'last_name',
      idNumber: 'id_number',
      category: 'category',
      department: 'department',
      role: 'role',
      phone: 'phone',
      email: 'email',
      bloodGroup: 'blood_group',
      joinedDate: 'joined_date',
      gender: 'gender',
      schoolName: 'school_name',
      grade: 'grade',
      section: 'section',
      rollNumber: 'roll_number',
      photoStoragePath: 'photo_storage_path',
      photoUrl: 'photo_url',
      photoDataUrl: 'photo_data_url',
      status: 'status',
      fulfillmentStatus: 'fulfillment_status',
      paymentStatus: 'payment_status',
      batchFolderId: 'batch_folder_id',
    };

    for (const [key, val] of Object.entries(changes)) {
      if (columnMap[key] !== undefined && val !== undefined) {
        fields.push(`${columnMap[key]} = $${paramIndex++}`);
        params.push(val);
      }
    }

    if (fields.length === 0) return this.findById(orgId, id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE persons SET ${fields.join(', ')} WHERE organization_id = $1 AND id = $2`;
    await db.query(sql, params);

    return this.findById(orgId, id);
  }

  /**
   * Delete person by ID
   */
  async delete(orgId: string, id: number): Promise<boolean> {
    const res = await db.query(
      'DELETE FROM persons WHERE organization_id = $1 AND id = $2',
      [orgId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Bulk delete persons
   */
  async bulkDelete(orgId: string, ids: number[]): Promise<number> {
    if (!ids.length) return 0;
    const res = await db.query(
      'DELETE FROM persons WHERE organization_id = $1 AND id = ANY($2::bigint[])',
      [orgId, ids]
    );
    return res.rowCount ?? 0;
  }
}

export const personRepository = new PersonRepository();
