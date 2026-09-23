import { NextResponse } from "next/server";
import {
  extractTextFromFile,
  resolveResumeMimeType,
} from "@/lib/import/extractText";
import { hasValidSignature } from "@/lib/import/fileSignature";
import { runExtraction } from "@/lib/import/runExtraction";

// PDF/DOCX parsing needs Node APIs — this route cannot run on the Edge runtime.
export const runtime = "nodejs";
// Matches the Anthropic client's own 60s request timeout (src/lib/import/anthropicClient.ts)
// plus headroom for text extraction — Vercel's default function duration is shorter.
export const maxDuration = 60;

export const MAX_LINKEDIN_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_LINKEDIN_TEXT_CHARS = 20_000;

/**
 * User-controlled LinkedIn-derived import: either a LinkedIn-exported
 * PDF/resume file, or pasted LinkedIn profile text. There is no LinkedIn
 * network call anywhere in this route — no OAuth, no scraping, no
 * unofficial API. Reuses the resume text-extraction and Anthropic
 * extraction pipeline (extractText.ts / runExtraction.ts), labeling
 * results for the "linkedin" allow-list so the client can tag them
 * `linkedin_user_export`. Nothing here is persisted.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Could not read the submitted data.", 400);
  }

  const file = formData.get("file");
  const pastedText = formData.get("text");

  let text: string;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_LINKEDIN_FILE_BYTES) {
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
    try {
      text = await extractTextFromFile(buffer, mimeType);
    } catch {
      return errorResponse("Could not read text from that file.", 422);
    }
  } else if (typeof pastedText === "string" && pastedText.trim()) {
    if (pastedText.length > MAX_LINKEDIN_TEXT_CHARS) {
      return errorResponse(
        `Pasted text is limited to ${MAX_LINKEDIN_TEXT_CHARS} characters.`,
        413,
      );
    }
    text = pastedText;
  } else {
    return errorResponse(
      "Upload a file or paste your LinkedIn profile text.",
      400,
    );
  }

  const result = await runExtraction(text, "linkedin");
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
