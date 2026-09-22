import { PDFDocument, StandardFonts, rgb, type PDFDocument as PDFDocumentType, type PDFFont } from "pdf-lib";
import { OVERLAY_MAP } from "@/lib/schema/overlay";
import {
  getFieldMeta,
  type CandidateData,
  type FieldMeta,
  type SignatureValue,
} from "@/lib/schema";
import { fitMultiline, fitSingleLine } from "./textFit";

export interface OverlayWarning {
  readonly fieldId: string;
  readonly message: string;
}

export interface OverlayResult {
  readonly pdfBytes: Uint8Array;
  readonly warnings: readonly OverlayWarning[];
}

/** Small gap so a drawn baseline doesn't sit exactly on the box's bottom edge. */
const BASELINE_INSET = 3;

/**
 * Empirically-measured calibration: rendering the field map's coordinates
 * as-is places every value noticeably off its intended row — confirmed by
 * drawing labeled markers at each field's raw (x, rect.y) on the real
 * source PDF and rendering it (see docs/SESSION_LOG.md, S07). Page 1
 * needed only a small additive correction (values land ~one label/header
 * row too high); page 2's "Other information" through "Declaration"
 * sections needed a much larger correction that grows with y rather than
 * a constant, consistent with roughly a linear scale+offset relationship,
 * not a simple shift. This is a good-faith calibration pass against a
 * fixed page size, not a pixel-perfect one — see docs/FIELD_MAP.md for
 * fields flagged for further refinement.
 */
const PAGE1_DEFAULT_Y_SHIFT = 20;
const PAGE1_SECTION_Y_SHIFT: Readonly<Record<string, number>> = {
  References: 54,
};

/**
 * Page 2's error did not fit a single additive or linear correction. These
 * corrected "y from top of page" targets (replacing rect.y for page-2
 * fields entirely) were derived by programmatically detecting the actual
 * table row border pixel positions in a rendered synthetic output (see
 * docs/SESSION_LOG.md, S07) — not by eye, after an eyeballed ruler reading
 * turned out to be off by roughly one row.
 */
export const PAGE2_Y_OVERRIDE: Readonly<Record<string, number>> = {
  driving_licence_answer: 112,
  driving_licence_details: 112,
  criminal_charge_answer: 140,
  criminal_charge_details: 140,
  employment_discipline_answer: 171,
  employment_discipline_details: 171,
  medical_impact_answer: 202,
  medical_impact_details: 202,
  bankruptcy_answer: 233,
  bankruptcy_details: 233,
  company_contact_answer: 252,
  company_contact_name: 276,
  company_contact_department: 286,
  vacancy_source_friend: 311,
  vacancy_source_job_portal: 332,
  vacancy_source_job_portal_name: 332,
  vacancy_source_other: 353,
  vacancy_source_other_details: 353,
  expected_salary: 388,
  termination_notice: 408,
  supporting_information: 420,
  declaration_date: 555,
  applicant_signature: 555,
};

/**
 * Corrected "box top, in y-from-top-of-page points" for a field, i.e. the
 * value `toDrawOrigin` expects (it draws the baseline near the *bottom* of
 * a `rect.h`-tall box starting at this value). Page-1 shifts are additive
 * on top of the field map's own rect.y/rect.h box. Page-2 overrides are
 * measured directly as the intended *baseline* position, so rect.h is
 * added back here — it cancels out in toDrawOrigin's own `- rect.h`,
 * leaving the override value as the literal baseline height from the top.
 */
function calibrateBoxTop(
  meta: FieldMeta,
  rect: { y: number; h: number },
): number {
  if (meta.page === 2) {
    const target = PAGE2_Y_OVERRIDE[meta.id];
    if (target === undefined) return rect.y;
    // Multiline fields are positioned by the caller as a top-anchored text
    // block (see the "multiline" branch below), so the override value is
    // used as-is; every other type draws via toDrawOrigin, which subtracts
    // rect.h to place the baseline near the box's bottom — add it back so
    // the override value survives as the literal intended baseline height.
    return meta.type === "multiline" ? target : target - rect.h + BASELINE_INSET;
  }
  return (
    rect.y + (PAGE1_SECTION_Y_SHIFT[meta.section] ?? PAGE1_DEFAULT_Y_SHIFT)
  );
}

/**
 * A handful of page-2 fields share a line with an inline label (e.g.
 * "Expected Salary:", "Date:") whose printed width the field map's x
 * didn't clear, causing the drawn value to overlap the label — measured
 * the same way as PAGE2_Y_OVERRIDE, against a rendered synthetic output.
 */
const PAGE2_X_OVERRIDE: Readonly<Record<string, number>> = {
  expected_salary: 190,
  termination_notice: 245,
  company_contact_name: 460,
  company_contact_department: 500,
  declaration_date: 90,
  applicant_signature: 400,
};

function calibrateX(meta: FieldMeta, rectX: number): number {
  if (meta.page !== 2) return rectX;
  return PAGE2_X_OVERRIDE[meta.id] ?? rectX;
}

const BLACK = rgb(0, 0, 0);

/**
 * Converts a field map rectangle (top-left PDF points, per docs/FIELD_MAP.md)
 * into a pdf-lib drawing origin (bottom-left PDF points), after calibration.
 */
function toDrawOrigin(
  pageHeight: number,
  rect: { x: number; y: number; w: number; h: number },
  calibratedTop: number,
) {
  return {
    x: rect.x,
    y: pageHeight - calibratedTop - rect.h + BASELINE_INSET,
  };
}

async function embedDataUrlImage(doc: PDFDocumentType, dataUrl: string) {
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("Unsupported signature image format");
  const bytes = Buffer.from(match[2], "base64");
  return match[1].toLowerCase().startsWith("jpe")
    ? doc.embedJpg(bytes)
    : doc.embedPng(bytes);
}

/**
 * Loads the immutable original PDF and draws candidate values at the field
 * map's fixed coordinates — never recreates the document, so the source
 * appearance (branding, layout, the FOR OFFICIAL USE ONLY block) is
 * preserved exactly. Only draws fields present in OVERLAY_MAP, which is
 * structurally limited to candidate-owned fields with "PDF overlay: Yes" in
 * the field map — no official_* field can ever be drawn here (see
 * src/lib/schema/overlay.ts and its tests).
 */
export async function overlayCandidateData(
  originalPdfBytes: Uint8Array,
  data: Partial<CandidateData>,
): Promise<OverlayResult> {
  const doc = await PDFDocument.load(originalPdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const signatureFont = await doc.embedFont(StandardFonts.HelveticaOblique);
  const pages = doc.getPages();
  const warnings: OverlayWarning[] = [];

  for (const [fieldId, rawRect] of OVERLAY_MAP) {
    const meta = getFieldMeta(fieldId);
    const rect = { ...rawRect, x: calibrateX(meta, rawRect.x) };
    const value = (data as Record<string, unknown>)[fieldId];
    const page = pages[meta.page - 1];
    const pageHeight = page.getHeight();
    const calibratedTop = calibrateBoxTop(meta, rect);

    if (meta.type === "boolean") {
      if (value === true) {
        const { x, y } = toDrawOrigin(pageHeight, rect, calibratedTop);
        page.drawText("X", {
          x: x + 1,
          y,
          size: Math.min(10, rect.h),
          font,
          color: BLACK,
        });
      }
      continue;
    }

    if (meta.type === "yes_no") {
      if (typeof value !== "boolean") continue;
      const { x, y } = toDrawOrigin(pageHeight, rect, calibratedTop);
      const fit = fitSingleLine(value ? "Yes" : "No", rect.w, font, 10, 8);
      page.drawText(fit.text, { x, y, size: fit.fontSize, font, color: BLACK });
      continue;
    }

    if (meta.type === "signature") {
      const signature = value as SignatureValue | undefined;
      if (!signature) continue;

      if (signature.kind === "typed" && signature.typedText?.trim()) {
        const { x, y } = toDrawOrigin(pageHeight, rect, calibratedTop);
        const fit = fitSingleLine(
          signature.typedText.trim(),
          rect.w,
          signatureFont,
          14,
          8,
        );
        page.drawText(fit.text, {
          x,
          y,
          size: fit.fontSize,
          font: signatureFont,
          color: BLACK,
        });
        if (fit.truncated) {
          warnings.push({
            fieldId,
            message: `${meta.label} was shortened to fit.`,
          });
        }
      } else if (signature.kind === "drawn" && signature.imageDataUrl) {
        try {
          const image = await embedDataUrlImage(doc, signature.imageDataUrl);
          const scale = Math.min(
            rect.w / image.width,
            rect.h / image.height,
            1,
          );
          const { x, y } = toDrawOrigin(pageHeight, rect, calibratedTop);
          page.drawImage(image, {
            x,
            y,
            width: image.width * scale,
            height: image.height * scale,
          });
        } catch {
          warnings.push({
            fieldId,
            message: `${meta.label} image could not be embedded.`,
          });
        }
      }
      continue;
    }

    // Every remaining type (text, multiline, identifier, email, text_list,
    // date, date_or_year, date_or_present, choice) draws as plain text.
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) continue;

    if (meta.type === "multiline") {
      const fit = fitMultiline(text, rect.w, rect.h, font, 9, 6);
      let y = pageHeight - calibratedTop - fit.fontSize;
      for (const line of fit.lines) {
        page.drawText(line, { x: rect.x, y, size: fit.fontSize, font, color: BLACK });
        y -= fit.fontSize * 1.15;
      }
      if (fit.truncated) {
        warnings.push({
          fieldId,
          message: `${meta.label} was too long and was truncated to fit.`,
        });
      }
      continue;
    }

    const fit = fitSingleLine(text, rect.w, font, 9, 6);
    const { x, y } = toDrawOrigin(pageHeight, rect, calibratedTop);
    page.drawText(fit.text, { x, y, size: fit.fontSize, font, color: BLACK });
    if (fit.truncated) {
      warnings.push({
        fieldId,
        message: `${meta.label} was too long and was truncated to fit.`,
      });
    }
  }

  const pdfBytes = await doc.save();
  return { pdfBytes, warnings };
}

export type { PDFFont };
