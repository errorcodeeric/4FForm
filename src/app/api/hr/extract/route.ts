import { NextResponse } from "next/server";
import { validateHrUpload } from "@/lib/hr/validateUpload";
import { renderPagesToPng } from "@/lib/hr/renderPages";
import { extractHrForm } from "@/lib/hr/extractForm";
import { getAnthropicClient } from "@/lib/import/anthropicClient";

// pdf-lib, pdf-parse rendering, and the Anthropic call all need Node APIs.
export const runtime = "nodejs";

export const MAX_HR_FILE_BYTES = 8 * 1024 * 1024; // 8 MB — scans are larger than typed PDFs

/**
 * Extracts one uploaded completed-form PDF into candidate + official
 * fields. Rejects wrong templates via a structural pre-check (page
 * count/size) and the model's own `templateMatch` flag, rather than
 * fabricating a record. Nothing is persisted — the file and rendered
 * page images exist only for the duration of this request; do not add
 * logging of them or of extracted values here (see S11's transient-data
 * audit).
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Could not read the uploaded file.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("No file was uploaded.", 400);
  }
  if (file.size === 0) {
    return errorResponse("The uploaded file is empty.", 400);
  }
  if (file.size > MAX_HR_FILE_BYTES) {
    return errorResponse("The file is larger than the 8 MB limit.", 413);
  }
  if (file.type && file.type !== "application/pdf") {
    return errorResponse("Only PDF files are supported.", 415);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const validation = await validateHrUpload(buffer);
  if (!validation.ok) {
    return errorResponse(validation.message, 422);
  }

  const model = process.env.ANTHROPIC_MODEL;
  if (!process.env.ANTHROPIC_API_KEY || !model) {
    return errorResponse("Extraction is not configured on this server.", 503);
  }

  try {
    const pages = await renderPagesToPng(buffer);
    const result = await extractHrForm({
      client: getAnthropicClient(),
      model,
      pages,
    });

    if (!result.templateMatch) {
      return NextResponse.json(
        {
          templateMatch: false,
          message: result.templateMismatchReason,
        },
        { status: 422, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        templateMatch: true,
        candidateFields: result.candidateFields,
        officialFields: result.officialFields,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return errorResponse("Extraction failed. Please try again.", 502);
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
