import { PDFParse } from "pdf-parse";

export interface RenderedPage {
  readonly pageNumber: number;
  readonly base64Png: string;
}

/**
 * Renders every page of a PDF to a base64-encoded PNG. HR-uploaded forms
 * are often printed, handwritten, and scanned back to PDF — there is no
 * reliable text layer to extract in that case, so HR extraction sends
 * page images to the model (vision) rather than reusing the resume
 * pipeline's plain-text extraction (see docs/SESSION_LOG.md, S09).
 */
export async function renderPagesToPng(
  buffer: Buffer,
): Promise<readonly RenderedPage[]> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getScreenshot({ scale: 1.5 });
    return result.pages.map((page, index) => ({
      pageNumber: index + 1,
      base64Png: Buffer.from(page.data).toString("base64"),
    }));
  } finally {
    await parser.destroy();
  }
}
