import { z } from "zod";
import { CandidateDataSchema, OfficialUseDataSchema } from "@/lib/schema";
import type { HrExportRecord } from "./batchExport";

const RecordInputSchema = z.object({
  fileName: z.string(),
  status: z.enum(["success", "error"]),
  errorMessage: z.string().optional(),
  candidateData: z.unknown().optional(),
  officialData: z.unknown().optional(),
});

/**
 * Parses and validates a batch-export request body. Each record's
 * candidateData/officialData is re-validated against the strict schemas
 * (rejecting any official_* key inside candidateData or vice versa) —
 * this is a request boundary and must not trust the client alone, same
 * principle as the single-candidate export routes.
 */
export function parseHrExportRecords(
  body: unknown,
): readonly HrExportRecord[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { records } = body as { records?: unknown };
  if (!Array.isArray(records)) return null;

  const result: HrExportRecord[] = [];
  for (const raw of records) {
    const parsed = RecordInputSchema.safeParse(raw);
    if (!parsed.success) return null;

    if (parsed.data.status === "error") {
      result.push({
        fileName: parsed.data.fileName,
        status: "error",
        errorMessage: parsed.data.errorMessage,
      });
      continue;
    }

    const candidateParsed = CandidateDataSchema.safeParse(
      parsed.data.candidateData ?? {},
    );
    const officialParsed = OfficialUseDataSchema.safeParse(
      parsed.data.officialData ?? {},
    );
    if (!candidateParsed.success || !officialParsed.success) return null;

    result.push({
      fileName: parsed.data.fileName,
      status: "success",
      candidateData: candidateParsed.data,
      officialData: officialParsed.data,
    });
  }
  return result;
}
