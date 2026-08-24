import { db, type Person, type CardTemplate, type CanvasElement, type Worker, type UserAccount, type BatchFolder } from './database';
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
    avatar: 'SA',
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

// ===== INITIAL 5 SOURCE BATCHES =====

const INITIAL_BATCH_FOLDERS: Omit<BatchFolder, 'id'>[] = [
  {
    name: 'Grade 10 Engineering Batch A',
    sourceType: 'Excel Import',
    status: 'Ready for Design',
    collectorName: 'Hanna Mengistu',
    totalRecords: 24,
    assignedDesigner: 'Selamawit Bekele',
    notes: 'Imported from central academic roster .xlsx',
    createdAt: new Date('2026-06-15T08:00:00'),
    updatedAt: new Date('2026-06-15T08:00:00'),
  },
  {
    name: 'Metropolitan Field Staff 2026',
    sourceType: 'Manual Intake',
    status: 'In Design',
    collectorName: 'Dawit Tadesse',
    totalRecords: 18,
    assignedDesigner: 'Selamawit Bekele',
    notes: 'Onboarded via District Station #4 kiosk',
    createdAt: new Date('2026-06-18T09:30:00'),
    updatedAt: new Date('2026-06-18T09:30:00'),
  },
  {
    name: 'Security Operations Enclave',
    sourceType: 'Manual Intake',
    status: 'Approved',
    collectorName: 'Selamawit Bekele',
    totalRecords: 14,
    assignedDesigner: 'System Administrator',
    notes: 'High clearance personnel credentials',
    createdAt: new Date('2026-06-20T11:00:00'),
    updatedAt: new Date('2026-06-20T11:00:00'),
  },
  {
    name: 'Archive Digitized Registry Book 04',
    sourceType: 'Archive Digitizer',
    status: 'In Design',
    collectorName: 'Michael Chen',
    totalRecords: 15,
    assignedDesigner: 'Selamawit Bekele',
    notes: '5-up legacy student register scan extraction',
    createdAt: new Date('2026-06-22T14:15:00'),
    updatedAt: new Date('2026-06-22T14:15:00'),
  },
  {
    name: 'Executive Leadership Credential Run',
    sourceType: 'Manual Intake',
    status: 'Printed',
    collectorName: 'Hanna Mengistu',
    totalRecords: 10,
    assignedDesigner: 'System Administrator',
    notes: 'Complete 300 DPI duplex print run completed',
    createdAt: new Date('2026-06-25T16:00:00'),
    updatedAt: new Date('2026-06-25T16:00:00'),
  },
];

// Helper to generate initials avatar graphics
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
    ['#701a75', '#a21caf', '#e879f9'],
    ['#7c2d12', '#c2410c', '#fb923c'],
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

// Full 81 Enterprise Personnel Database
const BASE_PEOPLE_DATA = [
  { name: 'Alicia Tran', role: 'Principal Systems Lead', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 001-0022', email: 'alicia.tran@idplatform.internal', blood: 'A+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Mohamed El-Sayed', role: 'Firmware Specialist', dept: 'Hardware Operations', cat: 'Operations', phone: '+1 (555) 002-0033', email: 'mo.elsayed@idplatform.internal', blood: 'O+', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Sofia Meyers', role: 'Executive Director', dept: 'Product Strategy', cat: 'Leadership', phone: '+1 (555) 003-0044', email: 'sofia.meyers@idplatform.internal', blood: 'B+', fulfillment: 'Fulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Carlos Ramirez', role: 'Logistics Supervisor', dept: 'Field Logistics', cat: 'Operations', phone: '+1 (555) 004-0055', email: 'c.ramirez@idplatform.internal', blood: 'AB+', fulfillment: 'Refunded', payment: 'Refunded', status: 'Active' },
  { name: 'Nina Patel', role: 'Computer Vision Engineer', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 005-0066', email: 'nina.patel@idplatform.internal', blood: 'O-', fulfillment: 'Fulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Ethan Clarke', role: 'Systems QA Lead', dept: 'Quality Assurance', cat: 'Quality', phone: '+1 (555) 006-0077', email: 'ethan.clarke@idplatform.internal', blood: 'A-', fulfillment: 'On Hold', payment: 'Pending', status: 'Active' },
  { name: 'Maya Johnson', role: 'Cloud Architect', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 007-0088', email: 'maya.johnson@idplatform.internal', blood: 'B-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'David Kim', role: 'Security Operations Lead', dept: 'Operations & Security', cat: 'Security', phone: '+1 (555) 008-0099', email: 'david.kim@idplatform.internal', blood: 'O+', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Elena Rostova', role: 'UX Architecture Specialist', dept: 'Product Design', cat: 'Design', phone: '+1 (555) 009-0100', email: 'elena.rostova@idplatform.internal', blood: 'A+', fulfillment: 'Fulfilled', payment: 'Paid', status: 'Active' },
  { name: 'James Wright', role: 'Operations Coordinator', dept: 'Field Operations', cat: 'Operations', phone: '+1 (555) 010-0111', email: 'james.wright@idplatform.internal', blood: 'AB-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Liya Tesfaye', role: 'Intake Registrar', dept: 'Enrollment Unit', cat: 'Operations', phone: '+251 911 201 101', email: 'liya.t@idplatform.internal', blood: 'A+', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Samuel Bekele', role: 'Senior Enclave Admin', dept: 'IT Infrastructure', cat: 'Engineering', phone: '+251 911 201 102', email: 'samuel.b@idplatform.internal', blood: 'O+', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Amara Okafor', role: 'Embedded Systems Lead', dept: 'Hardware Engineering', cat: 'Engineering', phone: '+234 802 334 501', email: 'amara.o@idplatform.internal', blood: 'B+', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Lucas Silva', role: 'Industrial Designer', dept: 'Product Design', cat: 'Design', phone: '+55 11 98765 4321', email: 'lucas.s@idplatform.internal', blood: 'AB+', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Chloe Dubois', role: 'Quality Compliance Officer', dept: 'Regulatory Affairs', cat: 'Quality', phone: '+33 1 42 68 55 00', email: 'chloe.d@idplatform.internal', blood: 'O-', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Tariq Mansour', role: 'Network Security Architect', dept: 'Cybersecurity', cat: 'Security', phone: '+971 4 390 1111', email: 'tariq.m@idplatform.internal', blood: 'A-', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Yuto Takahashi', role: 'Robotics Automation Lead', dept: 'Manufacturing Tech', cat: 'Engineering', phone: '+81 3 5555 0143', email: 'yuto.t@idplatform.internal', blood: 'B-', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Freja Lindstrom', role: 'Field Operations Specialist', dept: 'Field Operations', cat: 'Operations', phone: '+46 8 123 4567', email: 'freja.l@idplatform.internal', blood: 'AB-', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Mateo Fernandez', role: 'Logistics Dispatcher', dept: 'Supply Chain', cat: 'Operations', phone: '+34 91 123 4567', email: 'mateo.f@idplatform.internal', blood: 'O+', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Zara Al-Mansoor', role: 'Identity Verification Analyst', dept: 'Credential Issuance', cat: 'Security', phone: '+966 11 234 5678', email: 'zara.m@idplatform.internal', blood: 'A+', fulfillment: 'Processing', payment: 'Paid', status: 'Active' },
  { name: 'Kwame Mensah', role: 'Hardware Test Engineer', dept: 'Hardware Engineering', cat: 'Engineering', phone: '+233 24 123 4567', email: 'kwame.m@idplatform.internal', blood: 'B+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Ananya Sharma', role: 'AI Perception Specialist', dept: 'Software Engineering', cat: 'Engineering', phone: '+91 22 2345 6789', email: 'ananya.s@idplatform.internal', blood: 'O+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Oliver Bennett', role: 'Full-Stack Developer', dept: 'Software Engineering', cat: 'Engineering', phone: '+44 20 7946 0912', email: 'oliver.b@idplatform.internal', blood: 'A-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Astrid Nielsen', role: 'Production Planner', dept: 'Manufacturing Tech', cat: 'Operations', phone: '+45 32 12 34 56', email: 'astrid.n@idplatform.internal', blood: 'AB+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Gabriel Santos', role: 'Field Intake Specialist', dept: 'Enrollment Unit', cat: 'Operations', phone: '+55 21 98765 1234', email: 'gabriel.s@idplatform.internal', blood: 'O-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Fatoumata Diallo', role: 'Biometric Operations Lead', dept: 'Credential Issuance', cat: 'Security', phone: '+221 33 821 0000', email: 'fatou.d@idplatform.internal', blood: 'B-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Kenji Sato', role: 'Firmware QA Engineer', dept: 'Quality Assurance', cat: 'Quality', phone: '+81 6 6234 5678', email: 'kenji.s@idplatform.internal', blood: 'A+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Isabella Rossi', role: 'Visual Design Lead', dept: 'Product Design', cat: 'Design', phone: '+39 06 698 1234', email: 'isabella.r@idplatform.internal', blood: 'O+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Nikolai Volkov', role: 'Security Enclave Specialist', dept: 'IT Infrastructure', cat: 'Security', phone: '+7 495 123 4567', email: 'nikolai.v@idplatform.internal', blood: 'B+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Layla Haddad', role: 'Regional Registrar', dept: 'Enrollment Unit', cat: 'Operations', phone: '+961 1 234 567', email: 'layla.h@idplatform.internal', blood: 'AB-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Daniel Abebe', role: 'Staff Software Architect', dept: 'Software Engineering', cat: 'Engineering', phone: '+251 911 303 404', email: 'daniel.a@idplatform.internal', blood: 'O+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Beth Assefa', role: 'Credential Verification Officer', dept: 'Credential Issuance', cat: 'Security', phone: '+251 911 404 505', email: 'beth.a@idplatform.internal', blood: 'A+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Chen Wei', role: 'Optical Sensor Engineer', dept: 'Hardware Engineering', cat: 'Engineering', phone: '+86 21 5432 1000', email: 'chen.w@idplatform.internal', blood: 'B+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Miriam Yohannes', role: 'Records Administrator', dept: 'Enrollment Unit', cat: 'Operations', phone: '+251 911 505 606', email: 'miriam.y@idplatform.internal', blood: 'AB+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Marcus Vance', role: 'Site Reliability Engineer', dept: 'IT Infrastructure', cat: 'Engineering', phone: '+1 (555) 303-4455', email: 'marcus.v@idplatform.internal', blood: 'O-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Priya Patel', role: 'Data Privacy Officer', dept: 'Regulatory Affairs', cat: 'Quality', phone: '+44 20 8946 1234', email: 'priya.p@idplatform.internal', blood: 'A-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Henrik Larsson', role: 'Automation Specialist', dept: 'Manufacturing Tech', cat: 'Engineering', phone: '+46 8 234 5678', email: 'henrik.l@idplatform.internal', blood: 'B-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Naomi Osaka', role: 'Design Systems Architect', dept: 'Product Design', cat: 'Design', phone: '+81 3 4567 8901', email: 'naomi.o@idplatform.internal', blood: 'O+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Arthur Pendelton', role: 'Field Station Lead', dept: 'Field Operations', cat: 'Operations', phone: '+1 (555) 404-5566', email: 'arthur.p@idplatform.internal', blood: 'A+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Grace Hopper', role: 'Principal Compiler Architect', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 505-6677', email: 'grace.h@idplatform.internal', blood: 'AB+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Alan Turing', role: 'Cryptographic Lead', dept: 'Cybersecurity', cat: 'Security', phone: '+44 1625 123456', email: 'alan.t@idplatform.internal', blood: 'O+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Ada Lovelace', role: 'Algorithm Design Lead', dept: 'Software Engineering', cat: 'Engineering', phone: '+44 20 7123 4567', email: 'ada.l@idplatform.internal', blood: 'A+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Linus Torvalds', role: 'Kernel Systems Lead', dept: 'IT Infrastructure', cat: 'Engineering', phone: '+358 9 123 4567', email: 'linus.t@idplatform.internal', blood: 'B+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Dennis Ritchie', role: 'Systems Architecture Lead', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 606-7788', email: 'dennis.r@idplatform.internal', blood: 'O-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Ken Thompson', role: 'Enclave Security Engineer', dept: 'Cybersecurity', cat: 'Security', phone: '+1 (555) 707-8899', email: 'ken.t@idplatform.internal', blood: 'AB-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Margaret Hamilton', role: 'Safety Critical Software Lead', dept: 'Quality Assurance', cat: 'Quality', phone: '+1 (555) 808-9900', email: 'margaret.h@idplatform.internal', blood: 'A-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Radia Perlman', role: 'Routing Protocol Specialist', dept: 'IT Infrastructure', cat: 'Engineering', phone: '+1 (555) 909-0011', email: 'radia.p@idplatform.internal', blood: 'B-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Barbara Liskov', role: 'Distributed Systems Lead', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 010-1122', email: 'barbara.l@idplatform.internal', blood: 'O+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Claude Shannon', role: 'Information Theory Fellow', dept: 'Research & Development', cat: 'Engineering', phone: '+1 (555) 121-2233', email: 'claude.s@idplatform.internal', blood: 'A+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Tim Berners-Lee', role: 'Open Standards Architect', dept: 'Software Engineering', cat: 'Engineering', phone: '+44 20 7234 5678', email: 'tim.bl@idplatform.internal', blood: 'B+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Vint Cerf', role: 'Interconnect Architect', dept: 'IT Infrastructure', cat: 'Engineering', phone: '+1 (555) 232-3344', email: 'vint.c@idplatform.internal', blood: 'O+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Donald Knuth', role: 'Typography & Layout Fellow', dept: 'Product Design', cat: 'Design', phone: '+1 (555) 343-4455', email: 'donald.k@idplatform.internal', blood: 'AB+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Leslie Lamport', role: 'Consensus Systems Architect', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 454-5566', email: 'leslie.l@idplatform.internal', blood: 'O-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'John von Neumann', role: 'Computational Fellow', dept: 'Research & Development', cat: 'Engineering', phone: '+1 (555) 565-6677', email: 'john.vn@idplatform.internal', blood: 'A-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Hedy Lamarr', role: 'Spread Spectrum Specialist', dept: 'Hardware Engineering', cat: 'Engineering', phone: '+1 (555) 676-7788', email: 'hedy.l@idplatform.internal', blood: 'B-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Katherine Johnson', role: 'Trajectory & Compute Lead', dept: 'Research & Development', cat: 'Engineering', phone: '+1 (555) 787-8899', email: 'katherine.j@idplatform.internal', blood: 'AB-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Dorothy Vaughan', role: 'Compute Operations Manager', dept: 'Field Operations', cat: 'Operations', phone: '+1 (555) 898-9900', email: 'dorothy.v@idplatform.internal', blood: 'O+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Mary Jackson', role: 'Aerospace Engineering Lead', dept: 'Hardware Engineering', cat: 'Engineering', phone: '+1 (555) 909-0012', email: 'mary.j@idplatform.internal', blood: 'A+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'George Boole', role: 'Logic Optimization Fellow', dept: 'Research & Development', cat: 'Engineering', phone: '+44 28 9012 3456', email: 'george.b@idplatform.internal', blood: 'B+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'James Gosling', role: 'Runtime Architecture Lead', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 012-3456', email: 'james.g@idplatform.internal', blood: 'O-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Bjarne Stroustrup', role: 'High-Performance Engine Lead', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 123-4567', email: 'bjarne.s@idplatform.internal', blood: 'AB+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Guido van Rossum', role: 'Language Ecosystem Architect', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 234-5678', email: 'guido.vr@idplatform.internal', blood: 'A-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Brendan Eich', role: 'Client Engine Architect', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 345-6789', email: 'brendan.e@idplatform.internal', blood: 'B-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Anders Hejlsberg', role: 'Type Safety Lead', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 456-7890', email: 'anders.h@idplatform.internal', blood: 'O+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Rob Pike', role: 'Concurrency Systems Lead', dept: 'Software Engineering', cat: 'Engineering', phone: '+1 (555) 567-8901', email: 'rob.p@idplatform.internal', blood: 'A+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Brian Kernighan', role: 'Technical Communications Lead', dept: 'Product Design', cat: 'Design', phone: '+1 (555) 678-9012', email: 'brian.k@idplatform.internal', blood: 'B+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Butler Lampson', role: 'System Architecture Fellow', dept: 'IT Infrastructure', cat: 'Engineering', phone: '+1 (555) 789-0123', email: 'butler.l@idplatform.internal', blood: 'O-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Fred Brooks', role: 'Software Engineering Fellow', dept: 'Product Strategy', cat: 'Leadership', phone: '+1 (555) 890-1235', email: 'fred.b@idplatform.internal', blood: 'AB-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Edsger Dijkstra', role: 'Graph & Verification Fellow', dept: 'Research & Development', cat: 'Engineering', phone: '+31 20 123 4567', email: 'edsger.d@idplatform.internal', blood: 'A-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Tony Hoare', role: 'Formal Verification Fellow', dept: 'Quality Assurance', cat: 'Quality', phone: '+44 1865 123456', email: 'tony.h@idplatform.internal', blood: 'B-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Shafi Goldwasser', role: 'Zero-Knowledge Security Lead', dept: 'Cybersecurity', cat: 'Security', phone: '+1 (555) 901-2345', email: 'shafi.g@idplatform.internal', blood: 'O+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Silvio Micali', role: 'Verifiable Computation Lead', dept: 'Cybersecurity', cat: 'Security', phone: '+1 (555) 012-3457', email: 'silvio.m@idplatform.internal', blood: 'A+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Ron Rivest', role: 'Public Key Cryptography Lead', dept: 'Cybersecurity', cat: 'Security', phone: '+1 (555) 123-4568', email: 'ron.r@idplatform.internal', blood: 'B+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Adi Shamir', role: 'Secret Sharing Specialist', dept: 'Cybersecurity', cat: 'Security', phone: '+972 8 934 1234', email: 'adi.s@idplatform.internal', blood: 'AB+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Leonard Adleman', role: 'DNA & Bio-Compute Specialist', dept: 'Research & Development', cat: 'Engineering', phone: '+1 (555) 234-5679', email: 'leonard.a@idplatform.internal', blood: 'O-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Whitfield Diffie', role: 'Key Exchange Architect', dept: 'Cybersecurity', cat: 'Security', phone: '+1 (555) 345-6780', email: 'whitfield.d@idplatform.internal', blood: 'A-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Martin Hellman', role: 'Information Security Fellow', dept: 'Cybersecurity', cat: 'Security', phone: '+1 (555) 456-7891', email: 'martin.h@idplatform.internal', blood: 'B-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Ralph Merkle', role: 'Cryptographic Tree Architect', dept: 'Cybersecurity', cat: 'Security', phone: '+1 (555) 567-8902', email: 'ralph.m@idplatform.internal', blood: 'AB-', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Leslie Valiant', role: 'Machine Learning Fellow', dept: 'Research & Development', cat: 'Engineering', phone: '+1 (555) 678-9013', email: 'leslie.v@idplatform.internal', blood: 'O+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Judea Pearl', role: 'Causal Inference Fellow', dept: 'Research & Development', cat: 'Engineering', phone: '+1 (555) 789-0124', email: 'judea.p@idplatform.internal', blood: 'A+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
  { name: 'Geoffrey Hinton', role: 'Neural Architecture Fellow', dept: 'Research & Development', cat: 'Engineering', phone: '+1 (416) 978-0001', email: 'geoffrey.h@idplatform.internal', blood: 'B+', fulfillment: 'Unfulfilled', payment: 'Paid', status: 'Active' },
];

function buildFullPeopleRoster(): Omit<Person, 'id'>[] {
  return BASE_PEOPLE_DATA.map((p, idx) => {
    const idNum = `ID-2026-${String(idx + 1).padStart(3, '0')}`;
    const folderId = (idx % 5) + 1;
    const folderNames = [
      'Grade 10 Engineering Batch A',
      'Metropolitan Field Staff 2026',
      'Security Operations Enclave',
      'Archive Digitized Registry Book 04',
      'Executive Leadership Credential Run',
    ];

    return {
      fullName: p.name,
      idNumber: idNum,
      category: p.cat,
      department: p.dept,
      role: p.role,
      phone: p.phone,
      email: p.email,
      bloodGroup: p.blood,
      joinedDate: `2024-${String((idx % 12) + 1).padStart(2, '0')}-15`,
      emergencyPhone: '+1 (555) 999-0000',
      photoDataUrl: '',
      status: p.status as any,
      fulfillmentStatus: p.fulfillment as any,
      paymentStatus: p.payment as any,
      channel: 'Terminal Station',
      totalAmount: `$${100 + (idx * 5) % 400}`,
      workerId: (idx % 4) + 1,
      collectedBy: ['Hanna Mengistu', 'Dawit Tadesse', 'Selamawit Bekele', 'Michael Chen'][idx % 4],
      location: ['District Station #1', 'Commercial Center Station #4', 'HQ Security Operations', 'Mobile Van Unit #2'][idx % 4],
      batchFolderId: folderId,
      folderName: folderNames[folderId - 1],
      createdAt: new Date(Date.now() - (81 - idx) * 3600 * 1000 * 4),
    };
  });
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

function createModernEmeraldTemplate(): Omit<CardTemplate, 'id'> {
  const W = CARD.WIDTH_PX;
  const H = CARD.HEIGHT_PX;

  const frontElements: CanvasElement[] = [
    {
      id: 'em-banner', type: 'rect',
      x: 0, y: 0, width: W, height: 100,
      fill: '#064E3B', opacity: 1, visible: true, locked: false, name: 'Emerald Top Bar',
    },
    {
      id: 'em-title', type: 'text',
      x: 40, y: 28, width: 600,
      text: 'SILICON LABS TECH PLC', fontSize: 22, fontFamily: 'Space Grotesk',
      fontStyle: 'bold', fill: '#ECFDF5', align: 'left',
      opacity: 1, visible: true, locked: false, name: 'Header Title',
    },
    {
      id: 'em-sub', type: 'text',
      x: 40, y: 60, width: 600,
      text: 'ENTERPRISE IDENTITY PASS', fontSize: 12, fontFamily: 'IBM Plex Mono',
      fontStyle: 'bold', fill: '#10B981', align: 'left',
      opacity: 1, visible: true, locked: false, name: 'Sub Title',
    },
    {
      id: 'em-photo', type: 'photo',
      x: 50, y: 140, width: 220, height: 280,
      dataField: '{{photo}}',
      fill: '#D1FAE5', opacity: 1, visible: true, locked: false, name: 'Photo Frame',
    },
    {
      id: 'em-name', type: 'dataField',
      x: 310, y: 145, width: 660,
      text: '{{full_name}}', fontSize: 34, fontFamily: 'Space Grotesk',
      fontStyle: 'bold', fill: '#064E3B', align: 'left',
      dataField: '{{full_name}}',
      opacity: 1, visible: true, locked: false, name: 'Full Name',
    },
    {
      id: 'em-role', type: 'dataField',
      x: 310, y: 195, width: 660,
      text: '{{role}}', fontSize: 20, fontFamily: 'Space Grotesk',
      fontStyle: 'bold', fill: '#059669', align: 'left',
      dataField: '{{role}}',
      opacity: 1, visible: true, locked: false, name: 'Role Title',
    },
    {
      id: 'em-dept', type: 'dataField',
      x: 310, y: 240, width: 660,
      text: '{{department}}', fontSize: 16, fontFamily: 'IBM Plex Sans',
      fontStyle: 'normal', fill: '#4B5563', align: 'left',
      dataField: '{{department}}',
      opacity: 1, visible: true, locked: false, name: 'Department',
    },
    {
      id: 'em-id', type: 'dataField',
      x: 310, y: 290, width: 300,
      text: 'ID: {{id_number}}', fontSize: 15, fontFamily: 'IBM Plex Mono',
      fontStyle: 'bold', fill: '#064E3B', align: 'left',
      dataField: '{{id_number}}',
      opacity: 1, visible: true, locked: false, name: 'ID Number',
    },
    {
      id: 'em-qr', type: 'qr',
      x: 780, y: 280, width: 140, height: 140,
      dataField: '{{qr_code}}',
      opacity: 1, visible: true, locked: false, name: 'QR Matrix',
    },
    {
      id: 'em-bot-bar', type: 'rect',
      x: 0, y: H - 14, width: W, height: 14,
      fill: '#10B981', opacity: 1, visible: true, locked: false, name: 'Bottom Accent Bar',
    },
  ];

  const backElements: CanvasElement[] = [
    {
      id: 'em-back-hdr', type: 'rect',
      x: 0, y: 0, width: W, height: 70,
      fill: '#064E3B', opacity: 1, visible: true, locked: false, name: 'Back Header',
    },
    {
      id: 'em-back-terms', type: 'text',
      x: 60, y: 150, width: W - 120,
      text: '1. Official Silicon Labs Credential. Surrender upon termination.\n2. Must be worn visibly in secure zones at all times.\n3. Report lost cards immediately to security.',
      fontSize: 14, fontFamily: 'IBM Plex Sans', fontStyle: 'normal', fill: '#374151', align: 'left',
      opacity: 1, visible: true, locked: false, name: 'Back Terms',
    },
  ];

  return {
    name: 'Modern Slate & Emerald Pass',
    category: 'Corporate',
    orientation: 'horizontal',
    backgroundColor: '#FFFFFF',
    backBackgroundColor: '#F9FAFB',
    frontElements,
    backElements,
    isDefault: false,
  };
}

// Seed the Dexie DB with full 81 records, 5 batches, and 2 templates
export async function seedDatabase(): Promise<void> {
  const workerCount = await db.workers.count();
  if (workerCount === 0) {
    await db.workers.bulkAdd(INITIAL_WORKERS as Worker[]);
  }

  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.bulkAdd(INITIAL_USERS as UserAccount[]);
  }

  const batchCount = await db.batchFolders.count();
  if (batchCount === 0) {
    await db.batchFolders.bulkAdd(INITIAL_BATCH_FOLDERS as BatchFolder[]);
  }

  const peopleCount = await db.people.count();
  if (peopleCount < 81) {
    await db.people.clear();
    const fullRoster = buildFullPeopleRoster();
    const peopleWithAvatars = fullRoster.map((p, idx) => ({
      ...p,
      photoDataUrl: generateAvatarDataUrl(p.fullName, idx),
    }));
    await db.people.bulkAdd(peopleWithAvatars as Person[]);
  }

  const templateCount = await db.templates.count();
  if (templateCount < 2) {
    await db.templates.clear();
    await db.templates.bulkAdd([
      createCorporateTemplate() as CardTemplate,
      createModernEmeraldTemplate() as CardTemplate,
    ]);
  }
}
