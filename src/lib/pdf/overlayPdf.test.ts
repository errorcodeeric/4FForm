// @vitest-environment node
import { PDFDocument } from "pdf-lib";
import { PDFParse } from "pdf-parse";
import { beforeAll, describe, expect, it } from "vitest";
import type { CandidateData } from "@/lib/schema";
import { OVERLAY_MAP } from "@/lib/schema/overlay";
import { loadSourcePdfBytes } from "./sourceAsset";
import { overlayCandidateData, PAGE2_Y_OVERRIDE } from "./overlayPdf";

/**
 * Every override target used to draw page-2 fields, per the S07 calibration
 * (see overlayPdf.ts). The declaration/signature line (the last
 * candidate-facing content) sits at 555 — well above where "FOR OFFICIAL
 * USE ONLY" actually begins on the rendered page (measured ~590+). Used
 * here as a coordinate sentinel: no candidate content should ever be
 * drawn past this boundary (T15).
 */
const OFFICIAL_BLOCK_BOUNDARY_PAGE2 = 560;

const SYNTHETIC_COMPLETE: Partial<CandidateData> = {
  position_applied_for: "Crew Team Member",
  full_name: "TAN Wei Ming",
  identity_number: "S1234567A",
  address: "123 Ang Mo Kio Avenue 6, #08-123, Singapore 560123",
  telephone_mobile: "+65 9123 4567",
  email: "weiming.tan@example.com",
  citizenship: "Singaporean",
  legal_right_to_work_sg: "Citizen",
  education_1_institution: "National University of Singapore",
  education_1_from: "2015",
  education_1_to: "2019",
  education_1_standard: "Bachelor of Business",
  employment_1_from: "01/02/22",
  employment_1_to: "Present",
  employment_1_employer: "Acme Test Pte Ltd",
  employment_1_position: "Shift Supervisor",
  reference_1_name: "David Ong",
  reference_1_telephone: "+65 9876 5432",
  languages_spoken: "English, Mandarin",
  driving_licence_answer: true,
  driving_licence_details: "Class 3",
  criminal_charge_answer: false,
  employment_discipline_answer: false,
  medical_impact_answer: false,
  bankruptcy_answer: false,
  company_contact_answer: true,
  company_contact_name: "Jamie Tan",
  company_contact_department: "Kitchen",
  vacancy_source_job_portal: true,
  vacancy_source_job_portal_name: "JobStreet",
  expected_salary: "$2,800 - $3,200",
  termination_notice: "2 weeks",
  supporting_information: "5 years of F&B experience.",
  declaration_accepted: true,
  declaration_date: "22/09/2026",
  applicant_signature: { kind: "typed", typedText: "Tan Wei Ming" },
};

let originalBytes: Uint8Array;

beforeAll(async () => {
  originalBytes = await loadSourcePdfBytes();
});

async function extractText(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: Buffer.from(bytes) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

describe("overlayCandidateData", () => {
  it("preserves page count and US Letter size (T14)", async () => {
    const { pdfBytes } = await overlayCandidateData(
      originalBytes,
      SYNTHETIC_COMPLETE,
    );
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(2);
    for (const page of doc.getPages()) {
      expect(page.getWidth()).toBe(612);
      expect(page.getHeight()).toBe(792);
    }
  });

  it("preserves the original document's static content (T14)", async () => {
    const { pdfBytes } = await overlayCandidateData(
      originalBytes,
      SYNTHETIC_COMPLETE,
    );
    const text = await extractText(pdfBytes);
    expect(text).toContain("PERSONAL PARTICULARS");
    expect(text).toContain("EDUCATIONAL DETAILS");
    expect(text).toContain("DECLARATION");
    // pdf-parse renders this heading's letter-spaced source layout with
    // tabs between characters/words, so match loosely rather than exactly.
    expect(text.replace(/\s+/g, " ")).toMatch(/FOR\s*OFFICIAL\s*USE\s*ONLY/);
    expect(text).toContain("Employment");
    expect(text).toContain("Application");
  });

  it("never draws any field at or below the FOR OFFICIAL USE ONLY boundary (T15)", () => {
    // OVERLAY_MAP already structurally excludes official_* (see S02 tests).
    // This additionally checks the page-2 calibration's own draw targets:
    // every one stays above where "FOR OFFICIAL USE ONLY" actually begins.
    for (const id of OVERLAY_MAP.keys()) {
      expect(id.startsWith("official_")).toBe(false);
    }
    const targets = Object.values(PAGE2_Y_OVERRIDE);
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(target).toBeLessThan(OFFICIAL_BLOCK_BOUNDARY_PAGE2);
    }
  });

  it("draws candidate values into the output (sanity: overlay actually happened)", async () => {
    const { pdfBytes } = await overlayCandidateData(
      originalBytes,
      SYNTHETIC_COMPLETE,
    );
    const text = await extractText(pdfBytes);
    expect(text).toContain("TAN Wei Ming");
    expect(text).toContain("Acme Test Pte Ltd");
    expect(text).toContain("Tan Wei Ming"); // typed signature
  });

  it("warns and does not throw when a value is far too long to fit (T16)", async () => {
    const longValue = "A very long employer name ".repeat(20);
    const { warnings } = await overlayCandidateData(originalBytes, {
      ...SYNTHETIC_COMPLETE,
      employment_1_employer: longValue,
    });
    expect(warnings.some((w) => w.fieldId === "employment_1_employer")).toBe(
      true,
    );
  });

  it("warns when supporting_information overflows its multiline box (T16)", async () => {
    const longParagraph = "This is a very long sentence about my experience. ".repeat(20);
    const { warnings } = await overlayCandidateData(originalBytes, {
      ...SYNTHETIC_COMPLETE,
      supporting_information: longParagraph,
    });
    expect(
      warnings.some((w) => w.fieldId === "supporting_information"),
    ).toBe(true);
  });

  it("produces no warnings for a normally-sized complete application", async () => {
    const { warnings } = await overlayCandidateData(
      originalBytes,
      SYNTHETIC_COMPLETE,
    );
    expect(warnings).toEqual([]);
  });

  it("draws nothing for empty/undefined fields rather than throwing", async () => {
    const result = await overlayCandidateData(originalBytes, {
      full_name: "Only Name Provided",
    });
    expect(result.pdfBytes.byteLength).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
  });

  it("draws a checkmark only for true boolean fields, not false ones", async () => {
    const { pdfBytes: withPortal } = await overlayCandidateData(
      originalBytes,
      { vacancy_source_job_portal: true, vacancy_source_friend: false },
    );
    const { pdfBytes: withoutAny } = await overlayCandidateData(
      originalBytes,
      { vacancy_source_job_portal: false, vacancy_source_friend: false },
    );
    // Different byte lengths is a coarse but effective signal that
    // something was actually drawn in one case and not the other.
    expect(withPortal.byteLength).not.toBe(withoutAny.byteLength);
  });
});
