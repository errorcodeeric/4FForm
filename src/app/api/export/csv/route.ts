import { NextResponse } from "next/server";
import { buildCandidateCsv } from "@/lib/export/csv";
import { parseCandidateExportRequest } from "@/lib/export/parseRequest";

export const runtime = "nodejs";

/**
 * CSV export from the same canonical CandidateData used by the PDF
 * overlay. Never gated on completeness — an incomplete application still
 * exports, labeled "draft" via the export_status column (see rowData.ts).
 * Nothing is persisted.
 */
export async function POST(request: Request) {
  const parsed = await parseCandidateExportRequest(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const csv = buildCandidateCsv(parsed.data, parsed.status);
  const filename =
    parsed.status === "draft"
      ? "candidate-application-draft.csv"
      : "candidate-application.csv";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
