import { CandidateDataSchema, type CandidateData } from "@/lib/schema";
import { getFinalPdfBlockers } from "@/lib/review/classify";

export type ParseCandidateExportRequest =
  | { ok: true; data: CandidateData; status: "draft" | "final" }
  | { ok: false; message: string };

/**
 * Shared by /api/export/csv and /api/export/xlsx: parses and validates the
 * request body's candidateData against the strict schema (rejecting any
 * official_* key), and derives the "draft" vs "final" label from the same
 * completeness check the PDF export uses — CSV/XLSX are never blocked by
 * incompleteness, per S06/S08 ("draft exports remain possible, but
 * labeled").
 */
export async function parseCandidateExportRequest(
  request: Request,
): Promise<ParseCandidateExportRequest> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, message: "Invalid request body." };
  }
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Invalid request body." };
  }
  const { candidateData } = body as { candidateData?: unknown };
  const parsed = CandidateDataSchema.safeParse(candidateData);
  if (!parsed.success) {
    return { ok: false, message: "Candidate data failed validation." };
  }
  const status = getFinalPdfBlockers(parsed.data, {}).length === 0
    ? "final"
    : "draft";
  return { ok: true, data: parsed.data, status };
}
