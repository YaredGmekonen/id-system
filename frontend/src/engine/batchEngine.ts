import type { Person, CardTemplate } from '../db/database';
import { renderCard } from './renderCard';
import { createCardZip, downloadBlob } from './exportZip';
import { generatePrintSheet, downloadPdf } from './exportPdf';

export interface BatchGenerationOptions {
  batchSizeLimit?: number; // e.g. 10000 default, max 50000
  chunkSize?: number; // In-memory chunk size (e.g. 200) to keep memory constant
  includeBack?: boolean;
  onProgress?: (progress: BatchProgress) => void;
}

export interface BatchProgress {
  totalRecords: number;
  processedRecords: number;
  currentBatchIndex: number;
  totalBatches: number;
  status: 'idle' | 'rendering' | 'packaging' | 'completed' | 'error';
  currentBatchName?: string;
  percent: number;
}

/**
 * Executes a REAL chunked batch generation on any number of records (from 10 up to 60,000+).
 * Auto-splits datasets into sequential batches based on batchSizeLimit.
 */
export async function executeRealBatchGeneration(
  template: CardTemplate,
  people: Person[],
  options: BatchGenerationOptions = {}
): Promise<{ success: boolean; totalBatches: number; totalCards: number }> {
  const batchSizeLimit = options.batchSizeLimit || 10000;
  const inMemoryChunk = options.chunkSize || 250;
  const totalRecords = people.length;
  const totalBatches = Math.max(1, Math.ceil(totalRecords / batchSizeLimit));

  if (totalRecords === 0) {
    return { success: false, totalBatches: 0, totalCards: 0 };
  }

  let overallProcessed = 0;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * batchSizeLimit;
    const batchEnd = Math.min(batchStart + batchSizeLimit, totalRecords);
    const batchPeople = people.slice(batchStart, batchEnd);
    const batchNumber = batchIdx + 1;
    const batchLabel = `Batch_${batchNumber}_of_${totalBatches}`;

    const renderedCards: { filename: string; pngDataUrl: string; name: string }[] = [];

    // Process the batch in small memory-safe chunks
    for (let chunkStart = 0; chunkStart < batchPeople.length; chunkStart += inMemoryChunk) {
      const chunkEnd = Math.min(chunkStart + inMemoryChunk, batchPeople.length);
      const chunkPeople = batchPeople.slice(chunkStart, chunkEnd);

      for (let i = 0; i < chunkPeople.length; i++) {
        const p = chunkPeople[i];
        const safeName = (p.fullName || 'Member').replace(/\s+/g, '_');
        const safeId = (p.idNumber || `ID-${overallProcessed + 1}`).replace(/\s+/g, '_');

        // Render Front
        const frontPng = await renderCard(template, p, 'front');
        renderedCards.push({
          filename: `${safeName}_${safeId}_FRONT.png`,
          pngDataUrl: frontPng,
          name: p.fullName,
        });

        // Render Back if template has back elements
        if (template.backElements && template.backElements.length > 0) {
          const backPng = await renderCard(template, p, 'back');
          renderedCards.push({
            filename: `${safeName}_${safeId}_BACK.png`,
            pngDataUrl: backPng,
            name: p.fullName,
          });
        }

        overallProcessed++;
        const percent = Math.round((overallProcessed / totalRecords) * 100);

        options.onProgress?.({
          totalRecords,
          processedRecords: overallProcessed,
          currentBatchIndex: batchNumber,
          totalBatches,
          status: 'rendering',
          currentBatchName: batchLabel,
          percent,
        });
      }

      // Yield thread to maintain UI responsiveness
      await new Promise(r => setTimeout(r, 10));
    }

    // Package ZIP for this batch
    options.onProgress?.({
      totalRecords,
      processedRecords: overallProcessed,
      currentBatchIndex: batchNumber,
      totalBatches,
      status: 'packaging',
      currentBatchName: batchLabel,
      percent: Math.round((overallProcessed / totalRecords) * 100),
    });

    const zipBlob = await createCardZip(renderedCards);
    downloadBlob(zipBlob, `ID_Cards_${batchLabel}.zip`);

    // Package 8-up A4 Print Sheet PDF for this batch (Front sides)
    const frontCards = renderedCards.filter(c => c.filename.includes('_FRONT'));
    const printSheetData = frontCards.map(c => ({ name: c.name, side: 'front' as const, png: c.pngDataUrl }));
    const pdfBytes = await generatePrintSheet(printSheetData);
    downloadPdf(pdfBytes, `Print_Sheet_A4_${batchLabel}.pdf`);

    // Clear memory for this batch
    renderedCards.length = 0;
    await new Promise(r => setTimeout(r, 50));
  }

  options.onProgress?.({
    totalRecords,
    processedRecords: totalRecords,
    currentBatchIndex: totalBatches,
    totalBatches,
    status: 'completed',
    percent: 100,
  });

  return { success: true, totalBatches, totalCards: totalRecords };
}
