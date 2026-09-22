import { NextResponse } from "next/server";
import { buildHrBatchCsv } from "@/lib/hr/batchExport";
import { parseHrExportRecords } from "@/lib/hr/parseExportRequest";

export const runtime = "nodejs";

/**
 * Batch CSV export of reviewed HR records — one row per successfully
 * reviewed file. A failed file is simply not represented in CSV output
 * (no error-list concept in that format); use XLSX for the error sheet.
 * Nothing is persisted.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  const records = parseHrExportRecords(body);
  if (!records) {
    return errorResponse("Records failed validation.", 400);
  }

  const csv = buildHrBatchCsv(records);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hr-batch-review.csv"',
      "Cache-Control": "no-store",
    },
  });
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
