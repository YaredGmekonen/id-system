import { db, type Person, type CardTemplate, type CanvasElement, type Worker, type UserAccount, type BatchFolder } from './database';
import { CARD, BRAND } from '../design-tokens';

// ===== INITIAL SYSTEM USERS =====

const INITIAL_USERS: Omit<UserAccount, 'id'>[] = [
  {
    name: 'Abenezer Kaleab',
    email: 'admin@siliconlabs.internal',
    password: 'admin123',
    role: 'admin',
    status: 'Active',
    lastLogin: 'Just now',
    avatar: 'AK',
    createdAt: new Date(),
  },
];

// Helper to generate initials avatar graphics for sample data
function generateAvatarDataUrl(name: string, index: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;

  const palettes = [
    ['#14213D', '#1F315B', '#0F8B8D'],
    ['#14171A', '#2A2F35', '#657786'],
    ['#B23A2E', '#8C2B22', '#C98A2C'],
    ['#0F8B8D', '#0B6869', '#14213D'],
    ['#1e3a8a', '#2563eb', '#60a5fa'],
    ['#064e3b', '#059669', '#34d399'],
  ];

  const [bgDark, bgMid, accent] = palettes[index % palettes.length];

  const gradient = ctx.createLinearGradient(0, 0, 300, 300);
  gradient.addColorStop(0, bgDark);
  gradient.addColorStop(0.6, bgMid);
  gradient.addColorStop(1, accent);
  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.arc(150, 150, 140, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(242, 243, 241, 0.4)';
  ctx.lineWidth = 6;
  ctx.stroke();

  const initials = name
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  ctx.fillStyle = '#F2F3F1';
  ctx.font = 'bold 96px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials || 'ID', 150, 155);

  return canvas.toDataURL('image/png');
}

/**
 * Completely wipes all local IndexedDB data to start as a fresh, clean real project.
 */
export async function wipeAllData(): Promise<void> {
  await db.people.clear();
  await db.batchFolders.clear();
  await db.templates.clear();
  await db.archiveTemplates.clear();
  await db.workers.clear();
  await db.users.clear();

  // Create default clean admin profile
  await db.users.bulkAdd(INITIAL_USERS as UserAccount[]);
  localStorage.setItem('sl_real_mode_cleared', 'true');
}

/**
 * Initializes the database in Real Project Mode.
 * Ensures zero mock data: starts with an empty roster, empty batch folders, and empty custom templates.
 */
export async function seedDatabase(): Promise<void> {
  // Check if we need to perform the one-time transition to clean Real Project Mode
  const isRealModeCleared = localStorage.getItem('sl_real_mode_cleared');
  if (isRealModeCleared !== 'true') {
    await wipeAllData();
    return;
  }

  // Ensure default system user exists
  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.bulkAdd(INITIAL_USERS as UserAccount[]);
  }
}

/**
 * Optional utility to load sample test records (only if explicitly called by user).
 */
export async function loadSampleTestPack(): Promise<void> {
  const SAMPLE_PEOPLE: Omit<Person, 'id'>[] = [
    {
      fullName: 'Yared Mekonen',
      firstName: 'Yared',
      lastName: 'Mekonen',
      idNumber: 'SL-2026-001',
      category: 'Employees',
      department: 'Software Engineering',
      role: 'Principal Systems Lead',
      phone: '+251 911 000 111',
      email: 'yared.m@siliconlabs.internal',
      bloodGroup: 'O+',
      joinedDate: '2026-01-15',
      gender: 'Male',
      photoDataUrl: generateAvatarDataUrl('Yared Mekonen', 0),
      status: 'Active',
      fulfillmentStatus: 'Fulfilled',
      paymentStatus: 'Paid',
      channel: 'Direct Registration',
      totalAmount: 'Free',
      workerId: 1,
      collectedBy: 'System Administrator',
      location: 'Addis Ababa HQ',
      folderName: 'Core Engineering Staff',
      sourceFileName: 'Internal Registration',
      createdAt: new Date(),
    },
    {
      fullName: 'Selamawit Bekele',
      firstName: 'Selamawit',
      lastName: 'Bekele',
      idNumber: 'SL-2026-002',
      category: 'Employees',
      department: 'Product Design',
      role: 'Lead UI/UX Architect',
      phone: '+251 911 000 222',
      email: 'selamawit.b@siliconlabs.internal',
      bloodGroup: 'A+',
      joinedDate: '2026-02-01',
      gender: 'Female',
      photoDataUrl: generateAvatarDataUrl('Selamawit Bekele', 1),
      status: 'Active',
      fulfillmentStatus: 'Processing',
      paymentStatus: 'Paid',
      channel: 'Direct Registration',
      totalAmount: 'Free',
      workerId: 1,
      collectedBy: 'System Administrator',
      location: 'Addis Ababa HQ',
      folderName: 'Core Engineering Staff',
      sourceFileName: 'Internal Registration',
      createdAt: new Date(),
    },
  ];

  await db.people.bulkAdd(SAMPLE_PEOPLE as Person[]);
}
