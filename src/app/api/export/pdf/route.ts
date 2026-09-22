import { NextResponse } from "next/server";
import { CandidateDataSchema } from "@/lib/schema";
import { getFinalPdfBlockers } from "@/lib/review/classify";
import { overlayCandidateData } from "@/lib/pdf/overlayPdf";
import { loadSourcePdfBytes } from "@/lib/pdf/sourceAsset";

// pdf-lib and the bundled source asset need Node APIs.
export const runtime = "nodejs";

/**
 * Overlays candidate data onto the immutable source PDF and returns it as
 * a download. Nothing is persisted — the PDF exists only in this
 * response. Two server-side gates, both re-checked here even though the
 * candidate-facing UI (ReviewSection) already enforces them, since this
 * route is a request boundary that must not trust the client alone:
 *
 * 1. Declaration/signature and other required fields must be complete
 *    (T12) — otherwise responds 422 with the specific missing items.
 * 2. If drawing the PDF produced any truncation warnings (T16) and the
 *    caller hasn't already confirmed past them, the binary is withheld
 *    and the warnings are returned instead; the caller re-POSTs with
 *    `confirmTruncation: true` to actually receive the file.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("Invalid request body.", 400);
  }
  const { candidateData, confirmTruncation } = body as {
    candidateData?: unknown;
    confirmTruncation?: unknown;
  };

  const parsed = CandidateDataSchema.safeParse(candidateData);
  if (!parsed.success) {
    return errorResponse("Candidate data failed validation.", 400);
  }
  const data = parsed.data;

  const blockers = getFinalPdfBlockers(data, {});
  if (blockers.length > 0) {
    return NextResponse.json(
      { blockers },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  let pdfBytes: Uint8Array;
  let warnings: readonly { fieldId: string; message: string }[];
  try {
    const originalBytes = await loadSourcePdfBytes();
    ({ pdfBytes, warnings } = await overlayCandidateData(
      originalBytes,
      data,
    ));
  } catch {
    return errorResponse("Could not generate the PDF. Please try again.", 500);
  }

  if (warnings.length > 0 && confirmTruncation !== true) {
    return NextResponse.json(
      { warnings },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="employment-application.pdf"',
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
