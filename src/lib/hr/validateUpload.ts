import { PDFDocument } from "pdf-lib";

export type UploadValidation =
  | { ok: true }
  | { ok: false; message: string };

const EXPECTED_PAGE_COUNT = 2;
const EXPECTED_WIDTH = 612;
const EXPECTED_HEIGHT = 792;
/** Generous tolerance for scan/print artifacts (e.g. a slightly cropped scan). */
const DIMENSION_TOLERANCE_PT = 12;

/**
 * Cheap structural pre-check before spending an API call: rejects a file
 * that plainly isn't a completed copy of this template — wrong page
 * count or a page size far from US Letter. This does not by itself
 * detect a *different* two-page Letter-sized document; that's the
 * model's `templateMatch` flag's job (see hr/types.ts).
 */
export async function validateHrUpload(
  buffer: Buffer,
): Promise<UploadValidation> {
  let doc;
  try {
    doc = await PDFDocument.load(buffer);
  } catch {
    return { ok: false, message: "Could not read that file as a PDF." };
  }

  const pageCount = doc.getPageCount();
  if (pageCount !== EXPECTED_PAGE_COUNT) {
    return {
      ok: false,
      message: `Expected a ${EXPECTED_PAGE_COUNT}-page form, but this file has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
    };
  }

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    if (
      Math.abs(width - EXPECTED_WIDTH) > DIMENSION_TOLERANCE_PT ||
      Math.abs(height - EXPECTED_HEIGHT) > DIMENSION_TOLERANCE_PT
    ) {
      return {
        ok: false,
        message:
          "This file's page size doesn't match the expected form (US Letter).",
      };
    }
  }

  return { ok: true };
}
