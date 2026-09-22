import type { PDFFont } from "pdf-lib";

export const DEFAULT_MAX_FONT_SIZE = 9;
export const MIN_FONT_SIZE = 6;
const LINE_HEIGHT_RATIO = 1.15;

/** Appends an ellipsis unconditionally, trimming characters until it fits. */
function forceEllipsis(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
): string {
  let kept = text;
  while (
    kept.length > 0 &&
    font.widthOfTextAtSize(`${kept}…`, fontSize) > maxWidth
  ) {
    kept = kept.slice(0, -1);
  }
  return `${kept}…`;
}

function truncateToWidth(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
): string {
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return text;
  return forceEllipsis(text, maxWidth, font, fontSize);
}

export interface FitSingleLineResult {
  readonly text: string;
  readonly fontSize: number;
  readonly truncated: boolean;
}

/**
 * Picks the largest font size (down to MIN_FONT_SIZE) at which `text` fits
 * `maxWidth` on one line; truncates with an ellipsis if it still doesn't
 * fit at the minimum size.
 */
export function fitSingleLine(
  text: string,
  maxWidth: number,
  font: PDFFont,
  maxFontSize: number = DEFAULT_MAX_FONT_SIZE,
  minFontSize: number = MIN_FONT_SIZE,
): FitSingleLineResult {
  let size = maxFontSize;
  while (size > minFontSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return { text, fontSize: size, truncated: false };
  }
  const truncated = truncateToWidth(text, maxWidth, font, minFontSize);
  return { text: truncated, fontSize: minFontSize, truncated: true };
}

function wrapLines(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export interface FitMultilineResult {
  readonly lines: readonly string[];
  readonly fontSize: number;
  readonly truncated: boolean;
}

/**
 * Wraps `text` to fit `maxWidth`, picking the largest font size (down to
 * MIN_FONT_SIZE) at which every wrapped line fits within `maxHeight`. If it
 * still overflows at the minimum size, keeps as many lines as fit and
 * truncates the last one with an ellipsis.
 */
export function fitMultiline(
  text: string,
  maxWidth: number,
  maxHeight: number,
  font: PDFFont,
  maxFontSize: number = DEFAULT_MAX_FONT_SIZE,
  minFontSize: number = MIN_FONT_SIZE,
): FitMultilineResult {
  for (let size = maxFontSize; size >= minFontSize; size -= 0.5) {
    const maxLines = Math.max(1, Math.floor(maxHeight / (size * LINE_HEIGHT_RATIO)));
    const lines = wrapLines(text, maxWidth, font, size);
    if (lines.length <= maxLines) {
      return { lines, fontSize: size, truncated: false };
    }
  }

  const maxLines = Math.max(
    1,
    Math.floor(maxHeight / (minFontSize * LINE_HEIGHT_RATIO)),
  );
  const lines = wrapLines(text, maxWidth, font, minFontSize);
  const kept = lines.slice(0, maxLines);
  const lastIndex = kept.length - 1;
  if (lastIndex >= 0) {
    kept[lastIndex] = forceEllipsis(
      kept[lastIndex],
      maxWidth,
      font,
      minFontSize,
    );
  }
  return { lines: kept, fontSize: minFontSize, truncated: true };
}
