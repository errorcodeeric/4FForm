import { NextResponse } from "next/server";
import { buildCandidateWorkbook, workbookToBuffer } from "@/lib/export/xlsx";
import { parseCandidateExportRequest } from "@/lib/export/parseRequest";

export const runtime = "nodejs";

/**
 * XLSX export (Candidate Data + Field Dictionary sheets) from the same
 * canonical CandidateData used by the PDF overlay. Never gated on
 * completeness — labeled "draft" via the export_status row when
 * incomplete. Nothing is persisted.
 */
export async function POST(request: Request) {
  const parsed = await parseCandidateExportRequest(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const workbook = buildCandidateWorkbook(parsed.data, parsed.status);
  const buffer = workbookToBuffer(workbook);
  const filename =
    parsed.status === "draft"
      ? "candidate-application-draft.xlsx"
      : "candidate-application.xlsx";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
