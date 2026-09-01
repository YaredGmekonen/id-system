import { db } from '../db/index.js';
import type { CardTemplate, TemplateVersion, PaginatedResult } from '../types/index.js';
import { normalizePagination, buildPaginatedResult } from '../utils/pagination.js';

export class TemplateRepository {
  async findPaginated(
    orgId: string,
    filters: { page?: number; limit?: number; category?: string }
  ): Promise<PaginatedResult<CardTemplate>> {
    const { page, limit, offset } = normalizePagination(filters);
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (filters.category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(filters.category);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await db.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM card_templates WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const dataSql = `
      SELECT 
        id, organization_id as "organizationId", name, category, orientation,
        theme_id as "themeId", width_px as "widthPx", height_px as "heightPx",
        width_mm as "widthMm", height_mm as "heightMm", background_color as "backgroundColor",
        back_background_color as "backBackgroundColor", is_default as "isDefault",
        current_version_id as "currentVersionId", front_elements as "frontElements",
        back_elements as "backElements", created_at as "createdAt", updated_at as "updatedAt"
      FROM card_templates
      WHERE ${whereClause}
      ORDER BY is_default DESC, created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);
    const dataRes = await db.query<CardTemplate>(dataSql, params);

    return buildPaginatedResult(dataRes.rows, total, page, limit);
  }

  async findById(orgId: string, id: number): Promise<CardTemplate | null> {
    const sql = `
      SELECT 
        id, organization_id as "organizationId", name, category, orientation,
        theme_id as "themeId", width_px as "widthPx", height_px as "heightPx",
        width_mm as "widthMm", height_mm as "heightMm", background_color as "backgroundColor",
        back_background_color as "backBackgroundColor", is_default as "isDefault",
        current_version_id as "currentVersionId", front_elements as "frontElements",
        back_elements as "backElements", created_at as "createdAt", updated_at as "updatedAt"
      FROM card_templates
      WHERE organization_id = $1 AND id = $2
    `;
    const res = await db.query<CardTemplate>(sql, [orgId, id]);
    return res.rows[0] || null;
  }

  async create(orgId: string, data: Partial<CardTemplate>): Promise<CardTemplate> {
    return db.transaction(async client => {
      const sql = `
        INSERT INTO card_templates (
          organization_id, name, category, orientation, theme_id,
          width_px, height_px, width_mm, height_mm, background_color,
          back_background_color, is_default, front_elements, back_elements
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `;

      const res = await client.query(sql, [
        orgId,
        data.name,
        data.category || null,
        data.orientation || 'horizontal',
        data.themeId || null,
        data.widthPx || 1012,
        data.heightPx || 638,
        data.widthMm || 85.6,
        data.heightMm || 54.0,
        data.backgroundColor || '#FFFFFF',
        data.backBackgroundColor || '#F8FAFC',
        data.isDefault || false,
        JSON.stringify(data.frontElements || []),
        JSON.stringify(data.backElements || []),
      ]);

      const templateId = res.rows[0].id;

      // Automatically create Version 1 snapshot
      const verSql = `
        INSERT INTO template_versions (
          template_id, version_number, front_elements, back_elements, change_summary
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      const verRes = await client.query(verSql, [
        templateId,
        1,
        JSON.stringify(data.frontElements || []),
        JSON.stringify(data.backElements || []),
        'Initial template creation',
      ]);

      // Set current_version_id
      await client.query('UPDATE card_templates SET current_version_id = $1 WHERE id = $2', [
        verRes.rows[0].id,
        templateId,
      ]);

      const created = await this.findById(orgId, templateId);
      return created!;
    });
  }

  async update(orgId: string, id: number, changes: Partial<CardTemplate>): Promise<CardTemplate | null> {
    return db.transaction(async client => {
      const fields: string[] = [];
      const params: any[] = [orgId, id];
      let paramIndex = 3;

      if (changes.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        params.push(changes.name);
      }
      if (changes.category !== undefined) {
        fields.push(`category = $${paramIndex++}`);
        params.push(changes.category);
      }
      if (changes.orientation !== undefined) {
        fields.push(`orientation = $${paramIndex++}`);
        params.push(changes.orientation);
      }
      if (changes.backgroundColor !== undefined) {
        fields.push(`background_color = $${paramIndex++}`);
        params.push(changes.backgroundColor);
      }
      if (changes.backBackgroundColor !== undefined) {
        fields.push(`back_background_color = $${paramIndex++}`);
        params.push(changes.backBackgroundColor);
      }
      if (changes.frontElements !== undefined) {
        fields.push(`front_elements = $${paramIndex++}`);
        params.push(JSON.stringify(changes.frontElements));
      }
      if (changes.backElements !== undefined) {
        fields.push(`back_elements = $${paramIndex++}`);
        params.push(JSON.stringify(changes.backElements));
      }

      if (fields.length === 0) return this.findById(orgId, id);

      fields.push('updated_at = CURRENT_TIMESTAMP');
      const sql = `UPDATE card_templates SET ${fields.join(', ')} WHERE organization_id = $1 AND id = $2`;
      await client.query(sql, params);

      // If elements changed, record a new version snapshot
      if (changes.frontElements || changes.backElements) {
        const lastVerRes = await (client as any).query(
          'SELECT COALESCE(MAX(version_number), 0) AS max_ver FROM template_versions WHERE template_id = $1',
          [id]
        );
        const nextVer = Number(lastVerRes.rows?.[0]?.max_ver || 0) + 1;

        const currentTemplate = await this.findById(orgId, id);
        if (currentTemplate) {
          const verRes = await client.query(
            `INSERT INTO template_versions (template_id, version_number, front_elements, back_elements, change_summary)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [
              id,
              nextVer,
              JSON.stringify(currentTemplate.frontElements),
              JSON.stringify(currentTemplate.backElements),
              `Updated to version ${nextVer}`,
            ]
          );

          await client.query('UPDATE card_templates SET current_version_id = $1 WHERE id = $2', [
            verRes.rows[0].id,
            id,
          ]);
        }
      }

      return this.findById(orgId, id);
    });
  }

  async findVersions(templateId: number): Promise<TemplateVersion[]> {
    const sql = `
      SELECT 
        id, template_id as "templateId", version_number as "versionNumber",
        front_elements as "frontElements", back_elements as "backElements",
        change_summary as "changeSummary", created_by as "createdBy",
        created_at as "createdAt"
      FROM template_versions
      WHERE template_id = $1
      ORDER BY version_number DESC
    `;
    const res = await db.query<TemplateVersion>(sql, [templateId]);
    return res.rows;
  }

  async delete(orgId: string, id: number): Promise<boolean> {
    const res = await db.query(
      'DELETE FROM card_templates WHERE organization_id = $1 AND id = $2',
      [orgId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const templateRepository = new TemplateRepository();
