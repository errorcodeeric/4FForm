import { NextResponse } from "next/server";
import {
  extractTextFromFile,
  resolveResumeMimeType,
} from "@/lib/import/extractText";
import { extractFields } from "@/lib/import/extractFields";
import { getAnthropicClient } from "@/lib/import/anthropicClient";

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

  const model = process.env.ANTHROPIC_MODEL;
  if (!process.env.ANTHROPIC_API_KEY || !model) {
    return errorResponse(
      "Resume extraction is not configured on this server.",
      503,
    );
  }

  let text: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    text = await extractTextFromFile(buffer, mimeType);
  } catch {
    return errorResponse("Could not read text from that file.", 422);
  }

  if (!text.trim()) {
    return errorResponse("No readable text was found in that file.", 422);
  }

  try {
    const fields = await extractFields({
      client: getAnthropicClient(),
      model,
      text,
      sourceKind: "resume",
    });
    return NextResponse.json(
      { fields },
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
