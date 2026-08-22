import { db, type Person, type CardTemplate, type CanvasElement, type Worker, type UserAccount } from './database';
import { CARD, BRAND } from '../design-tokens';

// ===== INITIAL WORKER ROSTER =====

const INITIAL_WORKERS: Omit<Worker, 'id'>[] = [
  {
    name: 'Hanna Mengistu',
    email: 'hanna.m@idplatform.internal',
    role: 'Lead Registrar',
    avatar: 'HM',
    status: 'Online',
    location: 'District Station #1',
    shiftStartTime: '08:00 AM',
    lastActive: '2 mins ago',
    recordsCollected: 42,
    batteryLevel: 94,
    signalStrength: 'Strong',
    assignedDistrict: 'Central Operations Hub',
    phone: '+1 (555) 890-1234',
    createdAt: new Date('2026-01-10'),
  },
  {
    name: 'Dawit Tadesse',
    email: 'dawit.t@idplatform.internal',
    role: 'Field Enrollment Officer',
    avatar: 'DT',
    status: 'In Field',
    location: 'Commercial Center Station #4',
    shiftStartTime: '08:30 AM',
    lastActive: '5 mins ago',
    recordsCollected: 28,
    batteryLevel: 78,
    signalStrength: 'Good',
    assignedDistrict: 'Metropolitan District',
    phone: '+1 (555) 222-3344',
    createdAt: new Date('2026-01-15'),
  },
  {
    name: 'Selamawit Bekele',
    email: 'selamawit.b@idplatform.internal',
    role: 'Credential Officer & Designer',
    avatar: 'SB',
    status: 'Online',
    location: 'HQ Security Operations',
    shiftStartTime: '09:00 AM',
    lastActive: 'Active Now',
    recordsCollected: 19,
    batteryLevel: 100,
    signalStrength: 'Strong',
    assignedDistrict: 'Headquarters Station',
    phone: '+1 (555) 678-9012',
    createdAt: new Date('2026-02-01'),
  },
  {
    name: 'Michael Chen',
    email: 'michael.c@idplatform.internal',
    role: 'Mobile Enrollment Specialist',
    avatar: 'MC',
    status: 'Offline',
    location: 'Mobile Van Unit #2',
    shiftStartTime: '07:30 AM',
    lastActive: '1 hr ago',
    recordsCollected: 15,
    batteryLevel: 62,
    signalStrength: 'Fair',
    assignedDistrict: 'Regional Outreach',
    phone: '+1 (555) 999-8888',
    createdAt: new Date('2026-02-10'),
  },
];

// ===== INITIAL USERS =====

const INITIAL_USERS: Omit<UserAccount, 'id'>[] = [
  {
    name: 'System Administrator',
    email: 'admin@idplatform.internal',
    role: 'admin',
    status: 'Active',
    lastLogin: 'Just now',
    avatar: 'AK',
    createdAt: new Date('2026-01-01'),
  },
  {
    name: 'Selamawit Bekele',
    email: 'designer@idplatform.internal',
    role: 'designer',
    status: 'Active',
    lastLogin: '10 mins ago',
    avatar: 'SB',
    createdAt: new Date('2026-01-05'),
  },
  {
    name: 'Hanna Mengistu',
    email: 'registrar@idplatform.internal',
    role: 'collector',
    status: 'Active',
    lastLogin: '2 mins ago',
    avatar: 'HM',
    createdAt: new Date('2026-01-10'),
  },
];

// ===== INITIAL 10 PERSONNEL RECORDS =====

const INITIAL_PEOPLE: Omit<Person, 'id'>[] = [
  {
    fullName: 'Alicia Tran',
    idNumber: 'ID-2026-081',
    category: 'Engineering',
    department: 'Software Engineering',
    role: 'Principal Systems Lead',
    phone: '+1 (555) 001-0022',
    email: 'alicia.tran@idplatform.internal',
    bloodGroup: 'A+',
    joinedDate: '2024-03-01',
    emergencyPhone: '+1 (555) 888-7777',
    photoDataUrl: '',
    status: 'Active',
    fulfillmentStatus: 'Unfulfilled',
    paymentStatus: 'Paid',
    channel: 'Terminal Station',
    totalAmount: '$120',
    workerId: 1,
    collectedBy: 'Hanna Mengistu',
    location: 'District Station #1',
    createdAt: new Date('2026-07-01T08:02:00'),
  },
  {
    fullName: 'Mohamed El-Sayed',
    idNumber: 'ID-2026-082',
    category: 'Operations',
    department: 'Hardware Operations',
    role: 'Firmware Specialist',
    phone: '+1 (555) 002-0033',
    email: 'mo.elsayed@idplatform.internal',
    bloodGroup: 'O+',
    joinedDate: '2024-04-10',
    emergencyPhone: '+1 (555) 999-6666',
    photoDataUrl: '',
    status: 'Active',
    fulfillmentStatus: 'Processing',
    paymentStatus: 'Paid',
    channel: 'Enrollment Kiosk',
    totalAmount: '$75',
    workerId: 2,
    collectedBy: 'Dawit Tadesse',
    location: 'Commercial Center Station #4',
    createdAt: new Date('2026-07-01T08:12:00'),
  },
  {
    fullName: 'Sofia Meyers',
    idNumber: 'ID-2026-083',
    category: 'Leadership',
    department: 'Product Strategy',
    role: 'Executive Director',
    phone: '+1 (555) 003-0044',
    email: 'sofia.meyers@idplatform.internal',
    bloodGroup: 'B+',
    joinedDate: '2023-11-15',
    emergencyPhone: '+1 (555) 444-3333',
    photoDataUrl: '',
    status: 'Active',
    fulfillmentStatus: 'Fulfilled',
    paymentStatus: 'Paid',
    channel: 'HQ Terminal',
    totalAmount: '$275',
    workerId: 3,
    collectedBy: 'Selamawit Bekele',
    location: 'HQ Security Operations',
    createdAt: new Date('2026-07-01T08:40:00'),
  },
  {
    fullName: 'Carlos Ramirez',
    idNumber: 'ID-2026-084',
    category: 'Operations',
    department: 'Field Logistics',
    role: 'Logistics Supervisor',
    phone: '+1 (555) 004-0055',
    email: 'c.ramirez@idplatform.internal',
    bloodGroup: 'AB+',
    joinedDate: '2025-01-12',
    emergencyPhone: '+1 (555) 555-2222',
    photoDataUrl: '',
    status: 'Active',
    fulfillmentStatus: 'Refunded',
    paymentStatus: 'Refunded',
    channel: 'Terminal Station',
    totalAmount: '$210',
    workerId: 1,
    collectedBy: 'Hanna Mengistu',
    location: 'District Station #1',
    createdAt: new Date('2026-07-01T09:02:00'),
  },
  {
    fullName: 'Nina Patel',
    idNumber: 'ID-2026-085',
    category: 'Engineering',
    department: 'Software Engineering',
    role: 'Computer Vision Engineer',
    phone: '+1 (555) 005-0066',
    email: 'nina.patel@idplatform.internal',
    bloodGroup: 'O-',
    joinedDate: '2024-02-20',
    emergencyPhone: '+1 (555) 777-1111',
    photoDataUrl: '',
    status: 'Active',
    fulfillmentStatus: 'Fulfilled',
    paymentStatus: 'Paid',
    channel: 'Enrollment Kiosk',
    totalAmount: '$340',
    workerId: 2,
    collectedBy: 'Dawit Tadesse',
    location: 'Commercial Center Station #4',
    createdAt: new Date('2026-07-01T09:16:00'),
  },
  {
    fullName: 'Ethan Clarke',
    idNumber: 'ID-2026-086',
    category: 'Quality',
    department: 'Quality Assurance',
    role: 'Systems QA Lead',
    phone: '+1 (555) 006-0077',
    email: 'ethan.clarke@idplatform.internal',
    bloodGroup: 'A-',
    joinedDate: '2024-08-05',
    emergencyPhone: '+1 (555) 888-4444',
    photoDataUrl: '',
    status: 'Active',
    fulfillmentStatus: 'On Hold',
    paymentStatus: 'Pending',
    channel: 'Terminal Station',
    totalAmount: '$460',
    workerId: 1,
    collectedBy: 'Hanna Mengistu',
    location: 'District Station #1',
    createdAt: new Date('2026-07-01T09:24:00'),
  },
  {
    fullName: 'Maya Johnson',
    idNumber: 'ID-2026-087',
    category: 'Engineering',
    department: 'Software Engineering',
    role: 'Cloud Architect',
    phone: '+1 (555) 007-0088',
    email: 'maya.johnson@idplatform.internal',
    bloodGroup: 'B-',
    joinedDate: '2023-09-18',
    emergencyPhone: '+1 (555) 222-9999',
    photoDataUrl: '',
    status: 'Active',
    fulfillmentStatus: 'Unfulfilled',
    paymentStatus: 'Paid',
    channel: 'Enrollment Kiosk',
    totalAmount: '$150',
    workerId: 2,
    collectedBy: 'Dawit Tadesse',
    location: 'Commercial Center Station #4',
    createdAt: new Date('2026-07-01T09:35:00'),
  },
  {
    fullName: 'David Kim',
    idNumber: 'ID-2026-088',
    category: 'Security',
    department: 'Operations & Security',
    role: 'Security Operations Lead',
    phone: '+1 (555) 008-0099',
    email: 'david.kim@idplatform.internal',
    bloodGroup: 'O+',
    joinedDate: '2024-06-01',
    emergencyPhone: '+1 (555) 333-7777',
    photoDataUrl: '',
    status: 'Active',
    fulfillmentStatus: 'Processing',
    paymentStatus: 'Paid',
    channel: 'HQ Terminal',
    totalAmount: '$580',
    workerId: 3,
    collectedBy: 'Selamawit Bekele',
    location: 'HQ Security Operations',
    createdAt: new Date('2026-07-01T09:48:00'),
  },
  {
    fullName: 'Elena Rostova',
    idNumber: 'ID-2026-089',
    category: 'Design',
    department: 'Product Design',
    role: 'UX Architecture Specialist',
    phone: '+1 (555) 009-0100',
    email: 'elena.rostova@idplatform.internal',
    bloodGroup: 'A+',
    joinedDate: '2024-11-01',
    emergencyPhone: '+1 (555) 666-8888',
    photoDataUrl: '',
    status: 'Active',
    fulfillmentStatus: 'Fulfilled',
    paymentStatus: 'Paid',
    channel: 'Terminal Station',
    totalAmount: '$190',
    workerId: 1,
    collectedBy: 'Hanna Mengistu',
    location: 'District Station #1',
    createdAt: new Date('2026-07-01T10:05:00'),
  },
  {
    fullName: 'James Wright',
    idNumber: 'ID-2026-090',
    category: 'Operations',
    department: 'Field Operations',
    role: 'Operations Coordinator',
    phone: '+1 (555) 010-0111',
    email: 'james.wright@idplatform.internal',
    bloodGroup: 'AB-',
    joinedDate: '2025-02-14',
    emergencyPhone: '+1 (555) 111-4444',
    photoDataUrl: '',
    status: 'Active',
    fulfillmentStatus: 'Unfulfilled',
    paymentStatus: 'Paid',
    channel: 'Mobile Outreach Unit',
    totalAmount: '$80',
    workerId: 4,
    collectedBy: 'Michael Chen',
    location: 'Mobile Van Unit #2',
    createdAt: new Date('2026-07-01T10:20:00'),
  },
];

// Generate high-end stylized avatar graphics
function generateAvatarDataUrl(name: string, role: string, index: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;

  const palettes = [
    ['#14213D', '#1F315B', '#0F8B8D'], // Navy & Teal
    ['#14171A', '#2A2F35', '#657786'], // Ink Monochrome
    ['#B23A2E', '#8C2B22', '#C98A2C'], // Stamp & Ochre
    ['#0F8B8D', '#0B6869', '#14213D'], // Teal & Navy
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

  // Initials
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
  ctx.fillStyle = '#F2F3F1';
  ctx.font = 'bold 96px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 150, 155);

  return canvas.toDataURL('image/png');
}

// ===== STARTER TEMPLATES =====

function createCorporateTemplate(): Omit<CardTemplate, 'id'> {
  const W = CARD.WIDTH_PX;
  const H = CARD.HEIGHT_PX;

  const frontElements: CanvasElement[] = [
    {
      id: 'hdr-banner', type: 'rect',
      x: 0, y: 0, width: W, height: 110,
      fill: '#14213D', opacity: 1, visible: true, locked: false, name: 'Brand Header',
    },
    {
      id: 'hdr-title', type: 'text',
      x: 40, y: 28, width: 600,
      text: BRAND.COMPANY_NAME, fontSize: 24, fontFamily: 'Space Grotesk',
      fontStyle: 'bold', fill: '#F2F3F1', align: 'left',
      opacity: 1, visible: true, locked: false, name: 'Company Title',
    },
    {
      id: 'hdr-sub', type: 'text',
      x: 40, y: 64, width: 600,
      text: BRAND.TAGLINE, fontSize: 13, fontFamily: 'IBM Plex Mono',
      fontStyle: 'normal', fill: '#0F8B8D', align: 'left',
      opacity: 1, visible: true, locked: false, name: 'Tagline',
    },
    {
      id: 'card-photo', type: 'photo',
      x: 50, y: 150, width: 220, height: 280,
      dataField: '{{photo}}',
      fill: '#E1E3DF', opacity: 1, visible: true, locked: false, name: 'Employee Photo',
    },
    {
      id: 'card-name', type: 'dataField',
      x: 310, y: 150, width: 660,
      text: '{{full_name}}', fontSize: 36, fontFamily: 'Space Grotesk',
      fontStyle: 'bold', fill: '#14171A', align: 'left',
      dataField: '{{full_name}}',
      opacity: 1, visible: true, locked: false, name: 'Full Name',
    },
    {
      id: 'card-role', type: 'dataField',
      x: 310, y: 200, width: 660,
      text: '{{role}}', fontSize: 22, fontFamily: 'Space Grotesk',
      fontStyle: 'bold', fill: '#0F8B8D', align: 'left',
      dataField: '{{role}}',
      opacity: 1, visible: true, locked: false, name: 'Role Title',
    },
    {
      id: 'card-dept', type: 'dataField',
      x: 310, y: 245, width: 660,
      text: '{{department}}', fontSize: 18, fontFamily: 'IBM Plex Sans',
      fontStyle: 'normal', fill: '#657786', align: 'left',
      dataField: '{{department}}',
      opacity: 1, visible: true, locked: false, name: 'Department',
    },
    {
      id: 'card-id', type: 'dataField',
      x: 310, y: 300, width: 300,
      text: 'ID: {{id_number}}', fontSize: 16, fontFamily: 'IBM Plex Mono',
      fontStyle: 'normal', fill: '#14171A', align: 'left',
      dataField: '{{id_number}}',
      opacity: 1, visible: true, locked: false, name: 'ID Number',
    },
    {
      id: 'card-phone', type: 'dataField',
      x: 310, y: 335, width: 300,
      text: 'Phone: {{phone}}', fontSize: 15, fontFamily: 'IBM Plex Sans',
      fontStyle: 'normal', fill: '#657786', align: 'left',
      dataField: '{{phone}}',
      opacity: 1, visible: true, locked: false, name: 'Phone',
    },
    {
      id: 'card-qr', type: 'qr',
      x: 780, y: 280, width: 140, height: 140,
      dataField: '{{qr_code}}',
      opacity: 1, visible: true, locked: false, name: 'Dynamic QR Code',
    },
    {
      id: 'card-barcode', type: 'barcode',
      x: 50, y: 530, width: 320, height: 50,
      dataField: '{{barcode}}',
      opacity: 1, visible: true, locked: false, name: 'Code 128 Barcode',
    },
    {
      id: 'card-bot-bar', type: 'rect',
      x: 0, y: H - 12, width: W, height: 12,
      fill: '#0F8B8D', opacity: 1, visible: true, locked: false, name: 'Footer Line',
    },
  ];

  const backElements: CanvasElement[] = [
    {
      id: 'back-top-bar', type: 'rect',
      x: 0, y: 0, width: W, height: 80,
      fill: '#14213D', opacity: 1, visible: true, locked: false, name: 'Back Header',
    },
    {
      id: 'back-title', type: 'text',
      x: 0, y: 28, width: W,
      text: `${BRAND.COMPANY_NAME} — OFFICIAL CREDENTIAL`, fontSize: 18, fontFamily: 'Space Grotesk',
      fontStyle: 'bold', fill: '#F2F3F1', align: 'center',
      opacity: 1, visible: true, locked: false, name: 'Back Title',
    },
    {
      id: 'back-mag', type: 'rect',
      x: 0, y: 110, width: W, height: 70,
      fill: '#14171A', opacity: 1, visible: true, locked: false, name: 'Magnetic Stripe',
    },
    {
      id: 'back-terms', type: 'text',
      x: 60, y: 220, width: W - 120,
      text: '1. This credential card remains the property of the issuing organization.\n2. Must be presented upon request to security operations.\n3. If found, surrender immediately to administration.',
      fontSize: 14, fontFamily: 'IBM Plex Sans', fontStyle: 'normal', fill: '#657786', align: 'left',
      opacity: 1, visible: true, locked: false, name: 'Terms Text',
    },
    {
      id: 'back-contact', type: 'text',
      x: 60, y: 380, width: W - 120,
      text: `Support Desk: ${BRAND.PHONE}  •  ${BRAND.EMAIL}\n${BRAND.LOCATION}`,
      fontSize: 14, fontFamily: 'IBM Plex Mono', fontStyle: 'normal', fill: '#14171A', align: 'left',
      opacity: 1, visible: true, locked: false, name: 'Contact Info',
    },
  ];

  return {
    name: 'Executive Navy & Teal',
    category: 'Corporate',
    orientation: 'horizontal',
    backgroundColor: '#FFFFFF',
    backBackgroundColor: '#F2F3F1',
    frontElements,
    backElements,
    isDefault: true,
  };
}

// Seed the Dexie DB
export async function seedDatabase(): Promise<void> {
  const workerCount = await db.workers.count();
  if (workerCount === 0) {
    await db.workers.bulkAdd(INITIAL_WORKERS as Worker[]);
  }

  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.bulkAdd(INITIAL_USERS as UserAccount[]);
  }

  const peopleCount = await db.people.count();
  if (peopleCount === 0) {
    const peopleWithAvatars = INITIAL_PEOPLE.map((p, idx) => ({
      ...p,
      photoDataUrl: generateAvatarDataUrl(p.fullName, p.role, idx),
    }));
    await db.people.bulkAdd(peopleWithAvatars as Person[]);
  }

  const templateCount = await db.templates.count();
  if (templateCount === 0) {
    await db.templates.add(createCorporateTemplate() as CardTemplate);
  }
}
