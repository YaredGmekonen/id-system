/**
 * SiliconLabs Card Rendering Module for Imposition & Print Export
 * 
 * Delegates to the unified cardRenderer.ts to ensure identical output
 * with the Design Studio editor, IDCardStudio, and PaperPrintStudio.
 */

import type { CardTemplate, Person } from '../db/database';
import { CARD } from '../design-tokens';
import { renderCardLayout } from './cardRenderer';

/**
 * Renders a hydrated ID card for a specific person using a template.
 * Returns a PNG data URL of the rendered card at 300 DPI equivalent.
 */
export async function renderCard(
  template: CardTemplate,
  person: Person,
  side: 'front' | 'back' = 'front'
): Promise<string> {
  const elements = side === 'front' ? (template.frontElements || []) : (template.backElements || []);
  const bgColor = side === 'front' ? template.backgroundColor : template.backBackgroundColor;

  const cardWidth = template.widthPx || (template.orientation === 'vertical' ? CARD.HEIGHT_PX : CARD.WIDTH_PX);
  const cardHeight = template.heightPx || (template.orientation === 'vertical' ? CARD.WIDTH_PX : CARD.HEIGHT_PX);

  // 300 DPI equivalent: scale 3.125 (e.g. 1012x638 -> 3162x1994px)
  return await renderCardLayout(elements, person, {
    widthPx: cardWidth,
    heightPx: cardHeight,
    dpiScale: 3.125,
    backgroundColor: bgColor || '#FFFFFF',
  });
}
