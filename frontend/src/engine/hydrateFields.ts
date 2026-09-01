import type { Person } from '../db/database';

/**
 * Replaces data-field placeholders (e.g. {{full_name}}, {{id_number}}) with
 * actual values from a Person record.
 *
 * This is the SINGLE shared implementation used by all render engines
 * (renderCard.ts, renderStudioCard.ts) to avoid divergence.
 */
export function hydrateText(text: string, person: Person): string {
  if (!text) return '';

  const parts = (person.fullName || '').trim().split(/\s+/);
  const firstName = person.firstName || parts[0] || '';
  const lastName = person.lastName || parts.slice(1).join(' ') || '';
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://id-system-theta.vercel.app';
  const verifyUrl = `${origin}/verify/${person.idNumber || person.id || 'ID-2026-081'}`;

  return text
    .replace(/\{\{verify_url\}\}/gi, verifyUrl)
    .replace(/\{\{full_name\}\}/gi, person.fullName || '')
    .replace(/\{\{name\}\}/gi, person.fullName || '')
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{last_name\}\}/gi, lastName)
    .replace(/\{\{id_number\}\}/gi, person.idNumber || '')
    .replace(/\{\{id\}\}/gi, person.idNumber || '')
    .replace(/\{\{department\}\}/gi, person.department || '')
    .replace(/\{\{role\}\}/gi, person.role || '')
    .replace(/\{\{phone\}\}/gi, person.phone || '')
    .replace(/\{\{email\}\}/gi, person.email || '')
    .replace(/\{\{blood_group\}\}/gi, person.bloodGroup || 'O+')
    .replace(/\{\{joined_date\}\}/gi, person.joinedDate || '')
    .replace(/\{\{status\}\}/gi, person.status || 'Active')
    .replace(/\{\{gender\}\}/gi, person.gender || '')
    .replace(/\{\{school_name\}\}/gi, person.schoolName || '')
    .replace(/\{\{grade\}\}/gi, person.grade || '')
    .replace(/\{\{section\}\}/gi, person.section || '')
    .replace(/\{\{roll_number\}\}/gi, person.rollNumber || '')
    .replace(/\{\{guardian_name\}\}/gi, person.guardianName || '')
    .replace(/\{\{emergency_phone\}\}/gi, person.emergencyPhone || '')
    .replace(/\{\{qr_code\}\}/gi, verifyUrl)
    .replace(/\{\{category\}\}/gi, person.category || '');
}

/**
 * Builds the default QR payload for a person (verification URL).
 */
export function getDefaultQrPayload(person: Person): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://id-system-theta.vercel.app';
  return `${origin}/verify/${person.idNumber || person.id || 'ID-2026-081'}`;
}

/**
 * Resolves the actual QR code value for an element+person combination.
 */
export function resolveQrPayload(
  element: { qrPayload?: string; dataField?: string },
  person: Person
): string {
  if (element.qrPayload) return hydrateText(element.qrPayload, person);
  if (element.dataField) return hydrateText(element.dataField, person);
  return getDefaultQrPayload(person);
}

/**
 * Resolves the actual barcode value for an element+person combination.
 */
export function resolveBarcodePayload(
  element: { barcodeValue?: string; dataField?: string },
  person: Person
): string {
  if (element.barcodeValue) return hydrateText(element.barcodeValue, person);
  if (element.dataField) return hydrateText(element.dataField, person);
  return person.idNumber || '00000000';
}
