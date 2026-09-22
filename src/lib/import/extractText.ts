import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const PDF_MIME_TYPE = "application/pdf";
export const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const ACCEPTED_RESUME_MIME_TYPES: readonly string[] = [
  PDF_MIME_TYPE,
  DOCX_MIME_TYPE,
];

/**
 * Extracts plain text from a PDF or DOCX buffer. Node-runtime only (both
 * pdf-parse and mammoth need Node APIs, per the Runtime choice in the
 * spreadsheet's Overview tab).
 */
export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (mimeType === PDF_MIME_TYPE) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (mimeType === DOCX_MIME_TYPE) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Falls back to the filename extension when the browser reports a missing
 * or generic MIME type (common for .docx uploads on some platforms).
 */
export function resolveResumeMimeType(
  reportedType: string,
  fileName: string,
): string | null {
  if (ACCEPTED_RESUME_MIME_TYPES.includes(reportedType)) return reportedType;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return PDF_MIME_TYPE;
  if (lower.endsWith(".docx")) return DOCX_MIME_TYPE;
  return null;
}
