import { Router } from 'express';
import type { Request, Response } from 'express';
import { localDb } from '../db/localStore.js';

export const syncRouter = Router();

// GET /api/v1/sync/all — Return complete central database state for fast universal sync
// Returns data with BOTH snake_case (as stored) and camelCase (for frontend convenience)
syncRouter.get('/all', (_req: Request, res: Response) => {
  const users = localDb.get('users') || [];
  const workers = localDb.get('workers') || [];
  const batchFolders = (localDb.get('batch_folders') || []).map((bf: any) => ({
    // Return both formats so frontend can map easily
    id: bf.id,
    name: bf.name,
    sourceType: bf.source_type || bf.sourceType || 'Manual Intake',
    source_type: bf.source_type || bf.sourceType || 'Manual Intake',
    status: bf.status || 'Ready for Design',
    collectorName: bf.collector_name || bf.collectorName || 'Field Officer',
    collector_name: bf.collector_name || bf.collectorName || 'Field Officer',
    totalRecords: bf.total_records || bf.totalRecords || 0,
    total_records: bf.total_records || bf.totalRecords || 0,
    assignedDesigner: bf.assigned_designer || bf.assignedDesigner || null,
    notes: bf.notes || null,
    createdAt: bf.created_at || bf.createdAt || new Date().toISOString(),
    created_at: bf.created_at || bf.createdAt || new Date().toISOString(),
    updatedAt: bf.updated_at || bf.updatedAt || new Date().toISOString(),
    updated_at: bf.updated_at || bf.updatedAt || new Date().toISOString(),
  }));
  const persons = (localDb.get('persons') || []).map((p: any) => ({
    id: p.id,
    fullName: p.full_name || p.fullName || 'Unknown',
    full_name: p.full_name || p.fullName || 'Unknown',
    firstName: p.first_name || p.firstName || '',
    lastName: p.last_name || p.lastName || '',
    idNumber: p.id_number || p.idNumber || '',
    id_number: p.id_number || p.idNumber || '',
    category: p.category || 'Standard',
    department: p.department || '',
    role: p.role || 'Member',
    phone: p.phone || '',
    email: p.email || '',
    bloodGroup: p.blood_group || p.bloodGroup || '',
    joinedDate: p.joined_date || p.joinedDate || '',
    gender: p.gender || '',
    schoolName: p.school_name || p.schoolName || '',
    grade: p.grade || '',
    section: p.section || '',
    rollNumber: p.roll_number || p.rollNumber || '',
    guardianName: p.guardian_name || p.guardianName || '',
    photoDataUrl: p.photo_data_url || p.photoDataUrl || '',
    status: p.status || 'Active',
    fulfillmentStatus: p.fulfillment_status || p.fulfillmentStatus || 'Unfulfilled',
    paymentStatus: p.payment_status || p.paymentStatus || 'Paid',
    channel: p.channel || '',
    totalAmount: p.total_amount || p.totalAmount || '',
    workerId: p.worker_id || p.workerId || null,
    collectedBy: p.collected_by || p.collectedBy || '',
    location: p.location || '',
    batchFolderId: p.batch_folder_id || p.batchFolderId || null,
    folderName: p.folder_name || p.folderName || '',
    sourceFileName: p.source_file_name || p.sourceFileName || '',
    createdAt: p.created_at || p.createdAt || new Date().toISOString(),
    created_at: p.created_at || p.createdAt || new Date().toISOString(),
    updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
  }));
  const cardTemplates = localDb.get('card_templates') || [];
  const auditLogs = localDb.get('audit_logs') || [];

  return res.json({
    success: true,
    data: {
      users,
      workers,
      batchFolders,
      persons,
      cardTemplates,
      auditLogs,
      timestamp: Date.now(),
    },
  });
});

// POST /api/v1/sync/push — Bulk push/upsert changes from any client to the central server
syncRouter.post('/push', (req: Request, res: Response) => {
  const { batchFolders, persons, users, workers, templates } = req.body || {};

  // 1. Merge Batch Folders
  if (Array.isArray(batchFolders) && batchFolders.length > 0) {
    let currentBatches = localDb.get('batch_folders') || [];
    for (const bf of batchFolders) {
      const bfId = String(bf.id || '');
      const bfName = (bf.name || '').toLowerCase();
      const idx = currentBatches.findIndex((b: any) =>
        (bfId && String(b.id) === bfId) ||
        (bfName && b.name && b.name.toLowerCase() === bfName)
      );
      if (idx >= 0) {
        // Update existing — preserve existing fields and merge new ones
        currentBatches[idx] = {
          ...currentBatches[idx],
          name: bf.name || currentBatches[idx].name,
          source_type: bf.sourceType || bf.source_type || currentBatches[idx].source_type,
          total_records: bf.totalRecords ?? bf.total_records ?? currentBatches[idx].total_records,
          completed_records: bf.completedRecords || bf.completed_records || currentBatches[idx].completed_records || 0,
          status: bf.status || currentBatches[idx].status,
          collector_name: bf.collectorName || bf.collector_name || currentBatches[idx].collector_name,
          assigned_designer: bf.assignedDesigner || bf.assigned_designer || currentBatches[idx].assigned_designer,
          notes: bf.notes ?? currentBatches[idx].notes,
          updated_at: new Date().toISOString(),
        };
      } else {
        currentBatches.unshift({
          id: bf.id || Date.now(),
          organization_id: bf.organization_id || '00000000-0000-0000-0000-000000000001',
          name: bf.name || 'New Batch',
          source_type: bf.sourceType || bf.source_type || 'Manual Intake',
          total_records: bf.totalRecords || bf.total_records || 0,
          completed_records: bf.completedRecords || bf.completed_records || 0,
          status: bf.status || 'Ready for Design',
          collector_name: bf.collectorName || bf.collector_name || 'Field Registrar',
          assigned_designer: bf.assignedDesigner || bf.assigned_designer || null,
          notes: bf.notes || null,
          created_at: bf.createdAt || bf.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
    localDb.set('batch_folders', currentBatches);
  }

  // 2. Merge Persons
  if (Array.isArray(persons) && persons.length > 0) {
    let currentPersons = localDb.get('persons') || [];
    for (const p of persons) {
      const pId = String(p.id || '');
      const pIdNumber = String(p.idNumber || p.id_number || '').toLowerCase();
      const idx = currentPersons.findIndex((cp: any) =>
        (pId && String(cp.id) === pId) ||
        (pIdNumber && String(cp.id_number || cp.idNumber || '').toLowerCase() === pIdNumber)
      );
      if (idx >= 0) {
        // Update existing person
        currentPersons[idx] = {
          ...currentPersons[idx],
          full_name: p.fullName || p.full_name || currentPersons[idx].full_name,
          first_name: p.firstName || p.first_name || currentPersons[idx].first_name,
          last_name: p.lastName || p.last_name || currentPersons[idx].last_name,
          category: p.category || currentPersons[idx].category,
          department: p.department || currentPersons[idx].department,
          role: p.role || currentPersons[idx].role,
          phone: p.phone || currentPersons[idx].phone,
          email: p.email || currentPersons[idx].email,
          blood_group: p.bloodGroup || p.blood_group || currentPersons[idx].blood_group,
          gender: p.gender || currentPersons[idx].gender,
          school_name: p.schoolName || p.school_name || currentPersons[idx].school_name,
          grade: p.grade || currentPersons[idx].grade,
          section: p.section || currentPersons[idx].section,
          roll_number: p.rollNumber || p.roll_number || currentPersons[idx].roll_number,
          guardian_name: p.guardianName || p.guardian_name || currentPersons[idx].guardian_name,
          photo_data_url: p.photoDataUrl || p.photo_data_url || currentPersons[idx].photo_data_url,
          status: p.status || currentPersons[idx].status,
          fulfillment_status: p.fulfillmentStatus || p.fulfillment_status || currentPersons[idx].fulfillment_status,
          batch_folder_id: p.batchFolderId ?? p.batch_folder_id ?? currentPersons[idx].batch_folder_id,
          folder_name: p.folderName || p.folder_name || currentPersons[idx].folder_name,
          collected_by: p.collectedBy || p.collected_by || currentPersons[idx].collected_by,
          location: p.location || currentPersons[idx].location,
          updated_at: new Date().toISOString(),
        };
      } else {
        currentPersons.unshift({
          id: p.id || Date.now(),
          organization_id: p.organization_id || '00000000-0000-0000-0000-000000000001',
          batch_folder_id: p.batchFolderId || p.batch_folder_id || null,
          worker_id: p.workerId || p.worker_id || null,
          id_number: p.idNumber || p.id_number || `ID-${Date.now()}`,
          full_name: p.fullName || p.full_name || 'Cardholder',
          first_name: p.firstName || p.first_name || '',
          last_name: p.lastName || p.last_name || '',
          category: p.category || 'Standard',
          department: p.department || '',
          role: p.role || 'Member',
          phone: p.phone || '',
          email: p.email || '',
          blood_group: p.bloodGroup || p.blood_group || '',
          joined_date: p.joinedDate || p.joined_date || new Date().toISOString().split('T')[0],
          gender: p.gender || 'Other',
          school_name: p.schoolName || p.school_name || '',
          grade: p.grade || '',
          section: p.section || '',
          roll_number: p.rollNumber || p.roll_number || '',
          guardian_name: p.guardianName || p.guardian_name || '',
          photo_data_url: p.photoDataUrl || p.photo_data_url || '',
          status: p.status || 'Active',
          fulfillment_status: p.fulfillmentStatus || p.fulfillment_status || 'Unfulfilled',
          payment_status: p.paymentStatus || p.payment_status || 'Paid',
          channel: p.channel || 'Field Station',
          total_amount: p.totalAmount || p.total_amount || '',
          collected_by: p.collectedBy || p.collected_by || '',
          location: p.location || '',
          folder_name: p.folderName || p.folder_name || '',
          source_file_name: p.sourceFileName || p.source_file_name || '',
          created_at: p.createdAt || p.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
    localDb.set('persons', currentPersons);
  }

  // 3. Merge Users
  if (Array.isArray(users) && users.length > 0) {
    let currentUsers = localDb.get('users') || [];
    for (const u of users) {
      const cleanEmail = (u.email || '').toLowerCase().trim();
      const idx = currentUsers.findIndex((cu: any) => (cu.email || '').toLowerCase().trim() === cleanEmail);
      if (idx >= 0) {
        currentUsers[idx] = { ...currentUsers[idx], ...u, updated_at: new Date().toISOString() };
      } else {
        currentUsers.unshift({
          id: String(u.id || Date.now()),
          organization_id: '00000000-0000-0000-0000-000000000001',
          name: u.name,
          email: cleanEmail,
          password: u.password || 'password123',
          role: u.role || 'collector',
          status: u.status || 'Active',
          avatar: u.avatar || u.name?.substring(0, 2).toUpperCase() || 'US',
          last_login_at: u.lastLogin || 'Never',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
    localDb.set('users', currentUsers);
  }

  return res.json({
    success: true,
    message: 'Central database synchronized successfully',
    timestamp: Date.now(),
  });
});

// POST /api/v1/sync/delete — Handle delete operations pushed from frontend clients
syncRouter.post('/delete', (req: Request, res: Response) => {
  const { entity, ids } = req.body || {};

  if (!entity || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'Missing entity or ids', statusCode: 400 },
    });
  }

  const idStrings = ids.map(String);

  switch (entity) {
    case 'persons': {
      let persons = localDb.get('persons') || [];
      persons = persons.filter((p: any) => !idStrings.includes(String(p.id)));
      localDb.set('persons', persons);
      break;
    }
    case 'batchFolders':
    case 'batch_folders': {
      let batches = localDb.get('batch_folders') || [];
      batches = batches.filter((b: any) => !idStrings.includes(String(b.id)));
      localDb.set('batch_folders', batches);
      break;
    }
    case 'users': {
      let users = localDb.get('users') || [];
      users = users.filter((u: any) => !idStrings.includes(String(u.id)));
      localDb.set('users', users);
      break;
    }
    case 'workers': {
      let workers = localDb.get('workers') || [];
      workers = workers.filter((w: any) => !idStrings.includes(String(w.id)));
      localDb.set('workers', workers);
      break;
    }
    default:
      return res.status(400).json({
        success: false,
        error: { message: `Unknown entity: ${entity}`, statusCode: 400 },
      });
  }

  return res.json({
    success: true,
    message: `Deleted ${ids.length} ${entity} record(s) from central database`,
    timestamp: Date.now(),
  });
});
