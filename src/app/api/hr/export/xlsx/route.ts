import { NextResponse } from "next/server";
import { buildHrBatchWorkbook, hrWorkbookToBuffer } from "@/lib/hr/batchExport";
import { parseHrExportRecords } from "@/lib/hr/parseExportRequest";

export const runtime = "nodejs";

/**
 * Batch XLSX export of reviewed HR records: "Reviewed Data" (one row per
 * successful file) + "Errors" (file name + message per failed file), so
 * a partial batch failure stays visible instead of being silently
 * dropped (T22). Nothing is persisted.
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

  const workbook = buildHrBatchWorkbook(records);
  const buffer = hrWorkbookToBuffer(workbook);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="hr-batch-review.xlsx"',
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
