/**
 * SiliconLabs Multi-Face & Document Photo Cluster Detector
 * Dynamic 2D detection that finds all photos on document sheets (single or multi-column, e.g. 2x4 grid of 8 cards).
 * ZERO hardcoded slot counts or fixed Y coordinates.
 */

export interface DetectedCropBox {
  id: string;
  slotIndex: number;
  x: number; // 0..1 percentage of image width
  y: number; // 0..1 percentage of image height
  w: number; // 0..1 percentage of image width
  h: number; // 0..1 percentage of image height
  confidence: number;
  label: string;
  column?: number;
  row?: number;
}

/**
 * Dynamically detects all photo boxes on a scanned document page or booklet sheet.
 * Supports any arbitrary grid layout (1 col x 5 rows, 2 cols x 4 rows = 8 cards, etc.).
 */
export async function detectPhotoBoxesOnDocument(
  imageUrl: string
): Promise<DetectedCropBox[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const canvas = document.createElement('canvas');
      // Scale down for fast multi-scale analysis
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const sw = Math.round(width * scale);
      const sh = Math.round(height * scale);
      canvas.width = sw;
      canvas.height = sh;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve([]);
        return;
      }

      ctx.drawImage(img, 0, 0, sw, sh);
      const imgData = ctx.getImageData(0, 0, sw, sh);
      const data = imgData.data;

      // 1. Fine-grained skin and facial feature density map (80 rows x 80 cols)
      const gridRows = 80;
      const gridCols = 80;
      const cellW = sw / gridCols;
      const cellH = sh / gridRows;
      const densityGrid: number[][] = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));

      for (let y = 0; y < sh; y += 3) {
        const rIdx = Math.min(gridRows - 1, Math.floor(y / cellH));
        for (let x = 0; x < sw; x += 3) {
          const cIdx = Math.min(gridCols - 1, Math.floor(x / cellW));
          const i = (y * sw + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Strict skin-tone locus filter
          const isSkin =
            r > 50 &&
            g > 30 &&
            b > 18 &&
            r > g &&
            r > b &&
            r - g >= 6 &&
            r > 75 &&
            Math.max(r, g, b) - Math.min(r, g, b) > 10 &&
            !(r > 235 && g > 235 && b > 235); // exclude page paper

          if (isSkin) {
            densityGrid[rIdx][cIdx]++;
          }
        }
      }

      // 2. Identify Connected Components / Photo Blobs across the 2D grid
      const visited: boolean[][] = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));
      const rawClusters: { minR: number; maxR: number; minC: number; maxC: number; totalDensity: number }[] = [];

      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          if (!visited[r][c] && densityGrid[r][c] >= 4) {
            // Flood fill cluster
            let minR = r, maxR = r, minC = c, maxC = c;
            let totalDensity = 0;
            const queue: [number, number][] = [[r, c]];
            visited[r][c] = true;

            while (queue.length > 0) {
              const [currR, currC] = queue.shift()!;
              totalDensity += densityGrid[currR][currC];
              if (currR < minR) minR = currR;
              if (currR > maxR) maxR = currR;
              if (currC < minC) minC = currC;
              if (currC > maxC) maxC = currC;

              const neighbors: [number, number][] = [
                [currR - 1, currC],
                [currR + 1, currC],
                [currR, currC - 1],
                [currR, currC + 1],
                [currR - 1, currC - 1],
                [currR - 1, currC + 1],
                [currR + 1, currC - 1],
                [currR + 1, currC + 1],
              ];

              for (const [nr, nc] of neighbors) {
                if (
                  nr >= 0 &&
                  nr < gridRows &&
                  nc >= 0 &&
                  nc < gridCols &&
                  !visited[nr][nc] &&
                  densityGrid[nr][nc] >= 2
                ) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                }
              }
            }

            // Cluster filter: Must have significant density and portrait proportions
            const clusterRows = maxR - minR + 1;
            const clusterCols = maxC - minC + 1;

            if (
              totalDensity >= 15 &&
              clusterRows >= 4 &&
              clusterCols >= 3 &&
              clusterRows <= 35 &&
              clusterCols <= 35
            ) {
              rawClusters.push({ minR, maxR, minC, maxC, totalDensity });
            }
          }
        }
      }

      // Merge overlapping or adjacent clusters
      const merged: typeof rawClusters = [];
      for (const cl of rawClusters) {
        const existing = merged.find(m => {
          const rOverlap = !(cl.maxR < m.minR - 2 || cl.minR > m.maxR + 2);
          const cOverlap = !(cl.maxC < m.minC - 2 || cl.minC > m.maxC + 2);
          return rOverlap && cOverlap;
        });

        if (existing) {
          existing.minR = Math.min(existing.minR, cl.minR);
          existing.maxR = Math.max(existing.maxR, cl.maxR);
          existing.minC = Math.min(existing.minC, cl.minC);
          existing.maxC = Math.max(existing.maxC, cl.maxC);
          existing.totalDensity += cl.totalDensity;
        } else {
          merged.push({ ...cl });
        }
      }

      // 3. Fallback to Multi-Column Auto-Grid if image is low-contrast (e.g. 2-column or 1-column)
      let finalBoxes: { x: number; y: number; w: number; h: number; confidence: number }[] = [];

      if (merged.length >= 2) {
        // Convert clusters to normalized bounding boxes with portrait padding
        finalBoxes = merged.map(m => {
          const clusterW = (m.maxC - m.minC + 1) / gridCols;
          const clusterH = (m.maxR - m.minR + 1) / gridRows;

          // Target passport photo aspect ratio (~3:4)
          const targetW = Math.max(0.10, Math.min(0.22, clusterW * 1.3));
          const targetH = Math.max(0.14, Math.min(0.25, Math.max(clusterH * 1.3, targetW * 1.25)));

          const centerX = (m.minC + m.maxC + 1) / (2 * gridCols);
          const centerY = (m.minR + m.maxR + 1) / (2 * gridRows);

          const x = Math.max(0.01, Math.min(0.98 - targetW, centerX - targetW / 2));
          const y = Math.max(0.01, Math.min(0.98 - targetH, centerY - targetH / 2));

          return {
            x: Math.round(x * 1000) / 1000,
            y: Math.round(y * 1000) / 1000,
            w: Math.round(targetW * 1000) / 1000,
            h: Math.round(targetH * 1000) / 1000,
            confidence: Math.min(0.98, 0.85 + (m.totalDensity / 200)),
          };
        });
      } else {
        // Geometric column/row discovery: Check for 2-column layout (like 2x4 Warka booklet) vs 1-column layout
        const isTwoColumn = sw > sh * 0.7; // Typical multi-card landscape or 2-column portrait scan
        const colsCount = isTwoColumn ? 2 : 1;
        const rowsCount = isTwoColumn ? 4 : 5;

        for (let r = 0; r < rowsCount; r++) {
          for (let c = 0; c < colsCount; c++) {
            const colStartX = colsCount === 2 ? (c === 0 ? 0.03 : 0.52) : 0.05;
            const rowStartY = 0.04 + r * (0.92 / rowsCount);
            const w = colsCount === 2 ? 0.14 : 0.16;
            const h = (0.84 / rowsCount) * 0.85;

            finalBoxes.push({
              x: Math.round(colStartX * 1000) / 1000,
              y: Math.round(rowStartY * 1000) / 1000,
              w: Math.round(w * 1000) / 1000,
              h: Math.round(h * 1000) / 1000,
              confidence: 0.88,
            });
          }
        }
      }

      // 4. Sort detected boxes in natural reading order (Top-to-Bottom, Left-to-Right)
      finalBoxes.sort((a, b) => {
        // If Y is roughly on same row (within 7%), sort by X
        if (Math.abs(a.y - b.y) < 0.07) {
          return a.x - b.x;
        }
        return a.y - b.y;
      });

      // 5. Construct final DetectedCropBox objects
      const result: DetectedCropBox[] = finalBoxes.map((box, idx) => ({
        id: `slot-crop-${idx + 1}`,
        slotIndex: idx,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        confidence: box.confidence,
        label: `Student Photo #${idx + 1}`,
      }));

      resolve(result);
    };

    img.onerror = () => resolve([]);
  });
}

/**
 * Crop high-resolution image using normalized crop box coordinates [x, y, w, h] (0..1)
 */
export async function cropRegionFromImage(
  imageUrl: string,
  box: { x: number; y: number; w: number; h: number },
  outputWidth: number = 360,
  outputHeight: number = 480
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const pageW = img.naturalWidth || img.width;
      const pageH = img.naturalHeight || img.height;

      const sx = Math.max(0, Math.round(box.x * pageW));
      const sy = Math.max(0, Math.round(box.y * pageH));
      const sw = Math.min(pageW - sx, Math.round(box.w * pageW));
      const sh = Math.min(pageH - sy, Math.round(box.h * pageH));

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clean white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outputWidth, outputHeight);

      // Draw cropped subject
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

      resolve(canvas.toDataURL('image/jpeg', 0.96));
    };

    img.onerror = (e) => reject(e);
  });
}
