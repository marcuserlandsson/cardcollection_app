export const IMAGE_WIDTH = 1080;
export const IMAGE_COLUMNS = 6;
export const IMAGE_CAP = 60;
export const TILE_HEIGHT = 224;
export const ROW_GAP = 16;
export const HEADER_HEIGHT = 104;
export const FOOTER_HEIGHT = 56;

export interface ImageLayout {
  shown: number; // tiles actually rendered (min(count, cap))
  remaining: number; // count - shown, for the "+N more" note
  rows: number; // ceil(shown / columns)
  width: number;
  height: number; // header + body + footer
}

/** Sizes the share image (fixed width, height grows with the card count). */
export function computeImageLayout(cardCount: number): ImageLayout {
  const count = Math.max(cardCount, 0);
  const shown = Math.min(count, IMAGE_CAP);
  const remaining = count - shown;
  const rows = Math.ceil(shown / IMAGE_COLUMNS);
  const body = rows > 0 ? rows * TILE_HEIGHT + (rows - 1) * ROW_GAP : 0;
  const height = HEADER_HEIGHT + body + FOOTER_HEIGHT;
  return { shown, remaining, rows, width: IMAGE_WIDTH, height };
}
