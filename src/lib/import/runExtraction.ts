import { extractFields } from "./extractFields";
import { getAnthropicClient } from "./anthropicClient";
import type { ExtractionResult } from "./types";
import type { ImportSourceKind } from "./allowedFields";

export type RunExtractionResult =
  | { ok: true; fields: ExtractionResult }
  | { ok: false; status: number; message: string };

/**
 * Shared extraction pipeline used by every import route (resume, LinkedIn):
 * checks server configuration, requires non-empty text, calls the model,
 * and maps failures to safe (no-internal-detail) HTTP status/message pairs.
 */
export async function runExtraction(
  text: string,
  sourceKind: ImportSourceKind,
): Promise<RunExtractionResult> {
  const model = process.env.ANTHROPIC_MODEL;
  if (!process.env.ANTHROPIC_API_KEY || !model) {
    return {
      ok: false,
      status: 503,
      message: "Import is not configured on this server.",
    };
  }

  if (!text.trim()) {
    return {
      ok: false,
      status: 422,
      message: "No readable text was found.",
    };
  }

  try {
    const fields = await extractFields({
      client: getAnthropicClient(),
      model,
      text,
      sourceKind,
    });
    return { ok: true, fields };
  } catch {
    return {
      ok: false,
      status: 502,
      message: "Extraction failed. Please try again.",
    };
  }
}
