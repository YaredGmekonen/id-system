import { type DetectedCropBox } from './faceDetector';
import { type DigitizedStudent, type MatchedRecord, type CroppedPhoto } from './archiveDigitizer';
import { callGeminiVision, parseDataUrl, stripJsonFences } from './geminiClient';

export interface GeminiCardExtraction {
  slotIndex: number;
  fullName: string;
  firstName?: string;
  lastName?: string;
  fatherName?: string;
  idNumber: string;
  gender: string;
  grade: string;
  phone: string;
  dob?: string;
  parentName?: string;
  motherName?: string;
  bloodGroup?: string;
  address?: string;
  academicYear?: string;
  section?: string;
  rollNumber?: string;
  schoolName?: string;
  photoBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  customFields?: Record<string, string>; // Dynamic extra categories found on this card
}

export interface GeminiOcrResult {
  schoolName: string;
  totalDetected: number;
  detectedCategories: string[]; // List of all detected field labels (e.g. ['Full Name', 'ID Number', 'Grade', 'Parent Name', 'DOB'])
  rawJson: string;
  cards: GeminiCardExtraction[];
  cropBoxes: DetectedCropBox[];
  croppedPhotos: CroppedPhoto[];
  matches: MatchedRecord[];
}



/**
 * Crops an image on an offscreen canvas using normalized 0-1000 bounding box
 */
async function cropImageFromBox(
  pageImageUrl: string,
  box: [number, number, number, number],
  slotIndex: number,
  imgWidth: number,
  imgHeight: number
): Promise<{ dataUrl: string; cropBox: DetectedCropBox }> {
  const [ymin, xmin, ymax, xmax] = box;
  // Convert normalized 0-1000 coords to 0-1 fractional coords
  const xFrac = Math.max(0, Math.min(1, xmin / 1000));
  const yFrac = Math.max(0, Math.min(1, ymin / 1000));
  const wFrac = Math.max(0.02, Math.min(1 - xFrac, (xmax - xmin) / 1000));
  const hFrac = Math.max(0.02, Math.min(1 - yFrac, (ymax - ymin) / 1000));

  // Pixel coords for canvas cropping
  const xPx = Math.round(xFrac * imgWidth);
  const yPx = Math.round(yFrac * imgHeight);
  const wPx = Math.max(20, Math.round(wFrac * imgWidth));
  const hPx = Math.max(20, Math.round(hFrac * imgHeight));

  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = pageImageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, xPx, yPx, wPx, hPx, 0, 0, wPx, hPx);
  }

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    cropBox: {
      id: `gemini-box-${Date.now()}-${slotIndex}-${Math.random().toString(36).substring(2, 6)}`,
      slotIndex,
      x: xFrac,
      y: yFrac,
      w: wFrac,
      h: hFrac,
      confidence: 0.98,
      label: `Card ${slotIndex + 1}`,
    },
  };
}

/**
 * Executes High-Accuracy Multimodal AI Vision Document OCR with Dynamic Schema Acceptance
 */
export async function runGeminiVisionOcr(
  pageImageUrl: string,
  customApiKey?: string
): Promise<GeminiOcrResult> {
  const { mimeType, base64Data } = parseDataUrl(pageImageUrl);

  const prompt = `You are a high-precision, multi-lingual Document & Physical Register Digitizer specializing in student rosters, member lists, and personnel cards.

TASK:
1. Scan the entire sheet or document page. Detect all individual card slots, table rows, or personnel entries.
2. For each person/card detected:
   - Identify the exact 2D bounding box of their passport/portrait photo: [ymin, xmin, ymax, xmax] normalized on a 0-1000 scale (where 0,0 is top-left and 1000,1000 is bottom-right). Make sure the bounding box tightly encloses ONLY the portrait photograph/headshot.
   - Extract ALL text accurately, carefully handling English, Amharic/Ge'ez (e.g. ስም, አባት ስም, ክፍል, ተ.ቁ, ጾታ), Oromo, or any language.
   - Separate form field labels (e.g., "Full Name:", "ስም:", "ID No:", "Grade:", "Father Name:", "DOB:") from the actual handwritten or typed user data. NEVER include label titles in the data values.
   - DYNAMIC SCHEMA: Different documents have different categories. Extract whatever categories exist on this document:
     * If the document has only 2 fields (e.g. Name + ID), extract those 2 cleanly.
     * If it has 5, 8, or more fields (e.g. Name, Father Name, Mother Name, ID, Grade, Section, DOB, Phone, Parent Name, Address, Blood Group, Academic Year), extract ALL of them!
     * Put any extra custom categories found in the 'customFields' dictionary.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema:
{
  "schoolName": "Institution/School/Company name if found at top, else empty",
  "detectedCategories": ["List of all detected category labels found across the document, e.g. 'Full Name', 'ID Number', 'Grade', 'Parent Name', 'DOB'"],
  "totalDetected": 0,
  "cards": [
    {
      "slotIndex": 0,
      "fullName": "Complete full person name (e.g. First Father Grandfather)",
      "firstName": "First name if separable",
      "lastName": "Grandfather/Last name if separable",
      "fatherName": "Father name if separable",
      "idNumber": "Student or Member ID / Roll No",
      "gender": "Male or Female or Other",
      "grade": "Grade / Class / Role (e.g. Grade 10, KG 2B, Staff)",
      "phone": "Phone number if present",
      "dob": "Date of Birth if present",
      "parentName": "Parent or Guardian Name if present",
      "motherName": "Mother's name if present",
      "bloodGroup": "Blood group if present",
      "address": "Address or City if present",
      "section": "Section if present",
      "rollNumber": "Roll number if present",
      "academicYear": "Academic year if present",
      "photoBox": [ymin, xmin, ymax, xmax],
      "customFields": {
        "Any Other Category Name": "Value"
      }
    }
  ]
}`;

  const textOutput = await callGeminiVision(prompt, base64Data, mimeType, customApiKey);

  let parsedJson: {
    schoolName?: string;
    detectedCategories?: string[];
    totalDetected?: number;
    cards?: GeminiCardExtraction[];
  } = {};

  try {
    parsedJson = JSON.parse(textOutput);
  } catch (err) {
    const clean = stripJsonFences(textOutput);
    parsedJson = JSON.parse(clean);
  }

  const cards = parsedJson.cards || [];
  const schoolName = parsedJson.schoolName || 'Document Batch';

  // Discover all category labels across the extracted records
  const categorySet = new Set<string>(parsedJson.detectedCategories || []);
  categorySet.add('Full Name');
  categorySet.add('ID Number');

  cards.forEach(c => {
    if (c.gender) categorySet.add('Gender');
    if (c.grade) categorySet.add('Grade / Class');
    if (c.phone) categorySet.add('Phone');
    if (c.dob) categorySet.add('Date of Birth');
    if (c.parentName || c.fatherName) categorySet.add('Parent Name');
    if (c.motherName) categorySet.add('Mother Name');
    if (c.bloodGroup) categorySet.add('Blood Group');
    if (c.address) categorySet.add('Address');
    if (c.section) categorySet.add('Section');
    if (c.academicYear) categorySet.add('Academic Year');
    if (c.customFields) {
      Object.keys(c.customFields).forEach(k => categorySet.add(k));
    }
  });

  const detectedCategories = Array.from(categorySet);

  // Get image dimensions for pixel crop conversion
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
    img.src = pageImageUrl;
  });
  const imgWidth = img.naturalWidth || 1000;
  const imgHeight = img.naturalHeight || 1000;

  const cropBoxes: DetectedCropBox[] = [];
  const croppedPhotos: CroppedPhoto[] = [];
  const matches: MatchedRecord[] = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    let photoUrl = '';
    let cropBox: DetectedCropBox | undefined;

    if (card.photoBox && Array.isArray(card.photoBox) && card.photoBox.length === 4) {
      try {
        const cropped = await cropImageFromBox(pageImageUrl, card.photoBox, i, imgWidth, imgHeight);
        photoUrl = cropped.dataUrl;
        cropBox = cropped.cropBox;
        cropBoxes.push(cropBox);
        croppedPhotos.push({
          slotIndex: i,
          dataUrl: cropped.dataUrl,
          rawPhotoUrl: cropped.dataUrl,
          isEnhanced: false,
          box: cropBox,
        });
      } catch (cropErr) {
        console.warn('Failed to crop photo box for slot', i, cropErr);
      }
    }

    // Compile dynamic customFields dictionary
    const customFields: Record<string, string> = {
      ...(card.customFields || {}),
    };
    if (card.dob) customFields['Date of Birth'] = card.dob;
    if (card.parentName) customFields['Parent Name'] = card.parentName;
    if (card.fatherName && !customFields['Father Name']) customFields['Father Name'] = card.fatherName;
    if (card.motherName) customFields['Mother Name'] = card.motherName;
    if (card.bloodGroup) customFields['Blood Group'] = card.bloodGroup;
    if (card.address) customFields['Address'] = card.address;
    if (card.section) customFields['Section'] = card.section;
    if (card.academicYear) customFields['Academic Year'] = card.academicYear;

    const student: DigitizedStudent = {
      name: card.fullName || `Record ${i + 1}`,
      firstName: card.firstName || '',
      lastName: card.lastName || '',
      fatherName: card.fatherName || '',
      studentId: card.idNumber || `ID-${new Date().getFullYear()}-${1000 + i}`,
      phone: card.phone || '',
      sex: card.gender?.toLowerCase().startsWith('f') ? 'Female' : 'Male',
      grade: card.grade || '',
      dob: card.dob || '',
      parentName: card.parentName || card.fatherName || '',
      motherName: card.motherName || '',
      bloodGroup: card.bloodGroup || '',
      address: card.address || '',
      academicYear: card.academicYear || '',
      section: card.section || '',
      rollNumber: card.rollNumber || '',
      schoolName: card.schoolName || schoolName,
      confidence: 98,
      flagged: !card.fullName?.trim(),
      flagReasons: !card.fullName?.trim() ? ['Unassigned name field in scanned document'] : [],
      customFields,
    };

    matches.push({
      slotIndex: i,
      photoUrl: photoUrl || undefined,
      rawPhotoUrl: photoUrl || undefined,
      isEnhanced: false,
      student,
      confirmed: true,
      skipped: false,
      box: cropBox,
    });
  }

  return {
    schoolName,
    totalDetected: cards.length,
    detectedCategories,
    rawJson: textOutput,
    cards,
    cropBoxes,
    croppedPhotos,
    matches,
  };
}
