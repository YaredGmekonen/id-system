/**
 * SiliconLabs AI Document & Paper Scanner Engine
 * Extracts user fields (Name, ID, Department, Role, Phone, Email, Blood Group)
 * and crops photo from paper registration documents, ID cards, and application forms.
 * Uses Tesseract.js OCR when available, with regex-based entity extraction.
 */

export interface ScannedDocumentResult {
  fullName: string;
  idNumber: string;
  department: string;
  role: string;
  phone: string;
  email: string;
  bloodGroup: string;
  photoDataUrl: string;
  rawText: string;
  confidence: number;
}

/**
 * Intelligent Document & Paper OCR Scanner with regex entity extraction.
 * Attempts real Tesseract.js OCR first, then falls back to heuristic parsing.
 */
export async function parseDocumentImage(
  imageSource: string | HTMLImageElement | File
): Promise<ScannedDocumentResult> {
  let dataUrl = '';

  // Convert source to data URL
  if (typeof imageSource === 'string') {
    dataUrl = imageSource;
  } else if (imageSource instanceof HTMLImageElement) {
    const c = document.createElement('canvas');
    c.width = imageSource.naturalWidth || imageSource.width;
    c.height = imageSource.naturalHeight || imageSource.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(imageSource, 0, 0);
    dataUrl = c.toDataURL('image/png');
  } else if (imageSource instanceof File) {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(imageSource);
    });
  }

  // Try real OCR with Tesseract.js if available
  let extractedText = '';
  let ocrConfidence = 0;
  try {
    const Tesseract = (window as any).Tesseract || (await import('tesseract.js').catch(() => null));
    if (Tesseract && Tesseract.recognize) {
      const ocrResult = await Tesseract.recognize(dataUrl, 'eng');
      extractedText = ocrResult?.data?.text || '';
      ocrConfidence = ocrResult?.data?.confidence || 0;
    }
  } catch {
    // Graceful fallback — no Tesseract available
  }

  const text = extractedText || '';
  const hasOcr = text.trim().length > 10;

  // ===== REGEX ENTITY EXTRACTION =====

  // Extract Name
  const namePatterns = [
    /(?:Full\s*Name|Name|Personnel|Student\s*Name|Employee\s*Name)[:\s]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/i,
    /(?:^|\n)([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\s*(?:\n|$)/m,
  ];
  let fullName = '';
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) { fullName = match[1].trim(); break; }
  }

  // Extract ID
  const idPatterns = [
    /(?:ID|ID\s*Number|ID\s*No|Badge\s*No|Reg\s*No|Student\s*ID)[:\s]+([A-Z0-9][\w-]{3,20})/i,
    /\b([A-Z]{2,4}[-\/]\d{4}[-\/]\d{2,5})\b/,
    /\b(STU[-]\d{4}[-]\d{3})\b/i,
  ];
  let idNumber = '';
  for (const pattern of idPatterns) {
    const match = text.match(pattern);
    if (match) { idNumber = match[1].trim(); break; }
  }
  if (!idNumber) {
    idNumber = `SL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  }

  // Extract Department
  const deptPatterns = [
    /(?:Department|Dept|Faculty|Division|Section)[:\s]+([A-Za-z\s&]+?)(?:\n|$|,)/i,
    /(?:Grade|Class|Program)[:\s]+([A-Za-z0-9\s]+?)(?:\n|$|,)/i,
  ];
  let department = '';
  for (const pattern of deptPatterns) {
    const match = text.match(pattern);
    if (match) { department = match[1].trim(); break; }
  }

  // Extract Role
  const rolePatterns = [
    /(?:Role|Designation|Title|Position|Occupation)[:\s]+([A-Za-z\s]+?)(?:\n|$|,)/i,
  ];
  let role = '';
  for (const pattern of rolePatterns) {
    const match = text.match(pattern);
    if (match) { role = match[1].trim(); break; }
  }

  // Extract Phone
  const phoneMatch = text.match(/(\+?\d[\d\s-]{8,15}\d)/);
  const phone = phoneMatch ? phoneMatch[1].trim() : '';

  // Extract Email
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch ? emailMatch[1].trim() : '';

  // Extract Blood Group
  const bgMatch = text.match(/\b(A|B|AB|O)[+-]\b/i);
  const bloodGroup = bgMatch ? bgMatch[0].toUpperCase() : '';

  // ===== PHOTO EXTRACTION =====
  // Attempt to detect and crop portrait photo region using face detector and heuristic bounds
  let photoDataUrl = '';
  try {
    if (dataUrl) {
      const { detectPhotoBoxesOnDocument, cropRegionFromImage } = await import('./faceDetector');
      const detectedBoxes = await detectPhotoBoxesOnDocument(dataUrl, 5);

      if (detectedBoxes && detectedBoxes.length > 0) {
        // Use the first detected portrait region
        const bestBox = detectedBoxes[0];
        photoDataUrl = await cropRegionFromImage(dataUrl, bestBox, 400, 480);
      } else {
        // Fallback: Check standard left-side registration ledger column (X: 8-36%, Y: 8-28%)
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = dataUrl;
        });

        if (img.width > 0 && img.height > 0) {
          const photoCropCanvas = document.createElement('canvas');
          photoCropCanvas.width = 400;
          photoCropCanvas.height = 480;
          const pcCtx = photoCropCanvas.getContext('2d')!;

          // Ledger left-column photo location (matches school registers & ID intake pages)
          const cropX = Math.round(img.width * 0.08);
          const cropY = Math.round(img.height * 0.08);
          const cropW = Math.round(img.width * 0.30);
          const cropH = Math.round(img.height * 0.20);

          pcCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 400, 480);
          photoDataUrl = photoCropCanvas.toDataURL('image/png');
        }
      }
    }
  } catch {
    // Fallback — no photo extracted
  }

  // Generate initials avatar if no photo was extracted
  if (!photoDataUrl && fullName) {
    const avatarCanvas = document.createElement('canvas');
    avatarCanvas.width = 300;
    avatarCanvas.height = 300;
    const aCtx = avatarCanvas.getContext('2d')!;

    const gradient = aCtx.createLinearGradient(0, 0, 300, 300);
    gradient.addColorStop(0, '#064e3b');
    gradient.addColorStop(1, '#10b981');
    aCtx.fillStyle = gradient;
    aCtx.beginPath();
    aCtx.arc(150, 150, 140, 0, Math.PI * 2);
    aCtx.fill();

    aCtx.fillStyle = '#ffffff';
    aCtx.font = 'bold 96px Inter, sans-serif';
    aCtx.textAlign = 'center';
    aCtx.textBaseline = 'middle';
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    aCtx.fillText(initials || 'ID', 150, 155);

    photoDataUrl = avatarCanvas.toDataURL('image/png');
  }

  // Calculate overall confidence
  const confidence = hasOcr ? ocrConfidence : (fullName ? 72 : 30);

  return {
    fullName,
    idNumber,
    department,
    role,
    phone,
    email,
    bloodGroup,
    photoDataUrl,
    rawText: extractedText,
    confidence: Math.round(confidence * 10) / 10,
  };
}
