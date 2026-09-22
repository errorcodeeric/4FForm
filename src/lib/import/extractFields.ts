import type Anthropic from "@anthropic-ai/sdk";
import { buildExtractionResultSchema } from "./types";
import { buildExtractionToolInputSchema } from "./toolSchema";
import type { ExtractionResult } from "./types";
import type { ImportSourceKind } from "./allowedFields";

const TOOL_NAME = "record_extracted_fields";

export interface ExtractFieldsOptions {
  /** Injectable so tests can pass a mock instead of a real Anthropic client. */
  client: Pick<Anthropic, "messages">;
  model: string;
  text: string;
  sourceKind: ImportSourceKind;
}

/**
 * Sends resume/profile text to the Anthropic API and returns only the
 * fields allow-listed for `sourceKind` (see allowedFields.ts), each
 * validated against a strict schema built from that same allow-list — a
 * disallowed or hallucinated key can never survive `resultSchema.safeParse`.
 * Never logs `text` or the extracted values.
 */
export async function extractFields({
  client,
  model,
  text,
  sourceKind,
}: ExtractFieldsOptions): Promise<ExtractionResult> {
  const toolInputSchema = buildExtractionToolInputSchema(sourceKind);
  const resultSchema = buildExtractionResultSchema(sourceKind);

  const sourceLabel =
    sourceKind === "resume" ? "resume" : "LinkedIn profile export";

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    tools: [
      {
        name: TOOL_NAME,
        description:
          "Record only the fields you can confidently read from the supplied document. Omit any field you cannot find or are not reasonably confident about. Never guess.",
        input_schema: toolInputSchema,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `Extract candidate fields from the following ${sourceLabel} text. Only include fields you can actually find in the text below; omit anything you cannot find or are unsure about.\n\n---\n${text}\n---`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === TOOL_NAME,
  );
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Extraction did not return a structured result");
  }

  const parsed = resultSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error("Extraction result failed schema validation");
  }

  const result: Record<string, { value: string | boolean; confidence: "high" | "medium" | "low" }> = {};
  for (const [id, field] of Object.entries(parsed.data)) {
    if (!field) continue;
    if (typeof field.value === "string" && field.value.trim() === "") continue;
    result[id] = field;
  }
  return result;
}
