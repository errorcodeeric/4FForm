import { NextResponse } from "next/server";
import {
  extractTextFromFile,
  resolveResumeMimeType,
} from "@/lib/import/extractText";
import { hasValidSignature } from "@/lib/import/fileSignature";
import { runExtraction } from "@/lib/import/runExtraction";

// PDF/DOCX parsing needs Node APIs — this route cannot run on the Edge runtime.
export const runtime = "nodejs";

export const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Accepts one resume (PDF/DOCX), extracts its text, and returns AI-extracted
 * candidate fields with confidence metadata. Nothing here is persisted —
 * the file and its text exist only for the duration of this request. Do not
 * add logging of the request body, extracted text, or field values to this
 * file (see docs/BUILD_STATUS.md / S11 for the transient-data audit).
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
  if (file.size > MAX_RESUME_FILE_BYTES) {
    return errorResponse("The file is larger than the 5 MB limit.", 413);
  }

  const mimeType = resolveResumeMimeType(file.type, file.name);
  if (!mimeType) {
    return errorResponse("Only PDF and DOCX files are supported.", 415);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidSignature(buffer, mimeType)) {
    return errorResponse(
      "That file's content doesn't match a PDF or DOCX file.",
      415,
    );
  }

  let text: string;
  try {
    text = await extractTextFromFile(buffer, mimeType);
  } catch {
    return errorResponse("Could not read text from that file.", 422);
  }

  const result = await runExtraction(text, "resume");
  if (!result.ok) {
    return errorResponse(result.message, result.status);
  }
  return NextResponse.json(
    { fields: result.fields },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
