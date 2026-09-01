import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'platform_db.json');

export interface PlatformDbSchema {
  organizations: any[];
  users: any[];
  workers: any[];
  batch_folders: any[];
  persons: any[];
  card_templates: any[];
  template_versions: any[];
  generation_jobs: any[];
  audit_logs: any[];
  print_jobs: any[];
}

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

const INITIAL_DATA: PlatformDbSchema = {
  organizations: [
    {
      id: DEFAULT_ORG_ID,
      name: 'SiliconLabs Tech PLC',
      slug: 'siliconlabs',
      license_code: 'ETH-SEC-2026-9921',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  users: [
    {
      id: '1',
      organization_id: DEFAULT_ORG_ID,
      name: 'Abenezer Kaleab',
      email: 'admin@siliconlabs.internal',
      password: 'password123',
      role: 'admin',
      status: 'Active',
      avatar: 'AK',
      last_login_at: 'Just now',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      organization_id: DEFAULT_ORG_ID,
      name: 'Yoni',
      email: 'yoni@gmail.com',
      password: 'password123',
      role: 'designer',
      status: 'Active',
      avatar: 'YO',
      last_login_at: 'Never',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      organization_id: DEFAULT_ORG_ID,
      name: 'Msker',
      email: 'msker@gmail.com',
      password: 'password123',
      role: 'collector',
      status: 'Active',
      avatar: 'MS',
      last_login_at: 'Never',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      organization_id: DEFAULT_ORG_ID,
      name: 'Selamawit Bekele',
      email: 'designer@siliconlabs.internal',
      password: 'password123',
      role: 'designer',
      status: 'Active',
      avatar: 'SB',
      last_login_at: '10m ago',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      organization_id: DEFAULT_ORG_ID,
      name: 'Hanna Mengistu',
      email: 'registrar@siliconlabs.internal',
      password: 'password123',
      role: 'collector',
      status: 'Active',
      avatar: 'HM',
      last_login_at: '2h ago',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  workers: [
    {
      id: 1,
      organization_id: DEFAULT_ORG_ID,
      name: 'Hanna Mengistu',
      email: 'registrar@siliconlabs.internal',
      role: 'Lead Biometrics Registrar',
      avatar: 'HM',
      status: 'Online',
      location: 'District Station #1',
      shift_start_time: '08:00 AM',
      last_active: 'Just now',
      records_collected: 142,
      battery_level: 94,
      signal_strength: 'Strong',
      assigned_district: 'District 1 — Central',
      phone: '+251 911 234 567',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      organization_id: DEFAULT_ORG_ID,
      name: 'Selamawit Bekele',
      email: 'designer@siliconlabs.internal',
      role: 'Credential Designer',
      avatar: 'SB',
      status: 'Online',
      location: 'HQ Security Operations',
      shift_start_time: '08:30 AM',
      last_active: 'Just now',
      records_collected: 88,
      battery_level: 100,
      signal_strength: 'Strong',
      assigned_district: 'HQ Operations Hub',
      phone: '+251 922 345 678',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      organization_id: DEFAULT_ORG_ID,
      name: 'Yoni',
      email: 'yoni@gmail.com',
      role: 'Credential Designer',
      avatar: 'YO',
      status: 'Online',
      location: 'Design Studio Lab',
      shift_start_time: '09:00 AM',
      last_active: 'Just now',
      records_collected: 24,
      battery_level: 98,
      signal_strength: 'Strong',
      assigned_district: 'HQ Operations Hub',
      phone: '+251 933 456 789',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 4,
      organization_id: DEFAULT_ORG_ID,
      name: 'Msker',
      email: 'msker@gmail.com',
      role: 'Lead Biometrics Registrar',
      avatar: 'MS',
      status: 'Online',
      location: 'Mobile Field Intake #2',
      shift_start_time: '08:45 AM',
      last_active: '5m ago',
      records_collected: 19,
      battery_level: 88,
      signal_strength: 'Moderate',
      assigned_district: 'District 2 — Eastern',
      phone: '+251 944 567 890',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  batch_folders: [
    {
      id: 1,
      organization_id: DEFAULT_ORG_ID,
      name: 'Grade 10 - Section A',
      source_type: 'Excel Import',
      total_records: 48,
      completed_records: 48,
      status: 'Ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      organization_id: DEFAULT_ORG_ID,
      name: 'Executive & Staff 2026',
      source_type: 'Manual Intake',
      total_records: 12,
      completed_records: 12,
      status: 'Ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  persons: [],
  card_templates: [],
  template_versions: [],
  generation_jobs: [],
  audit_logs: [
    {
      id: 1,
      organization_id: DEFAULT_ORG_ID,
      actor: 'Abenezer Kaleab',
      action: 'SYSTEM_BOOT',
      details: 'Enterprise platform database initialized with zero-configuration persistent storage',
      ip: '127.0.0.1',
      created_at: new Date().toISOString(),
    },
  ],
  print_jobs: [],
};

class LocalFileDb {
  private data: PlatformDbSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): PlatformDbSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all arrays exist
        return {
          organizations: parsed.organizations || INITIAL_DATA.organizations,
          users: parsed.users || INITIAL_DATA.users,
          workers: parsed.workers || INITIAL_DATA.workers,
          batch_folders: parsed.batch_folders || INITIAL_DATA.batch_folders,
          persons: parsed.persons || INITIAL_DATA.persons,
          card_templates: parsed.card_templates || INITIAL_DATA.card_templates,
          template_versions: parsed.template_versions || INITIAL_DATA.template_versions,
          generation_jobs: parsed.generation_jobs || INITIAL_DATA.generation_jobs,
          audit_logs: parsed.audit_logs || INITIAL_DATA.audit_logs,
          print_jobs: parsed.print_jobs || INITIAL_DATA.print_jobs,
        };
      }
    } catch (err) {
      console.error('[LocalFileDb] Error loading database file, initializing defaults:', err);
    }
    this.persist(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  public persist(dataToSave?: PlatformDbSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const toWrite = dataToSave || this.data;
      fs.writeFileSync(DATA_FILE, JSON.stringify(toWrite, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LocalFileDb] Error saving to disk:', err);
    }
  }

  public schedulePersist() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persist();
      this.saveTimeout = null;
    }, 100);
  }

  public get<K extends keyof PlatformDbSchema>(table: K): PlatformDbSchema[K] {
    return this.data[table];
  }

  public set<K extends keyof PlatformDbSchema>(table: K, records: PlatformDbSchema[K]) {
    this.data[table] = records;
    this.schedulePersist();
  }

  public reload() {
    this.data = this.load();
  }
}

export const localDb = new LocalFileDb();
