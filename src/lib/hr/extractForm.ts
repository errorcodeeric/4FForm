import type Anthropic from "@anthropic-ai/sdk";
import { HrToolResponseSchema, type HrExtractionResult } from "./types";
import { buildHrToolInputSchema } from "./toolSchema";
import type { RenderedPage } from "./renderPages";

const TOOL_NAME = "record_form_extraction";

export interface ExtractHrFormOptions {
  /** Injectable so tests never need a real ANTHROPIC_API_KEY. */
  client: Pick<Anthropic, "messages">;
  model: string;
  pages: readonly RenderedPage[];
}

/**
 * Sends rendered page images of an uploaded form to the Anthropic API and
 * returns a template-match flag plus extracted candidate/official fields,
 * each validated against a strict allow-list schema (see hr/types.ts) —
 * a hallucinated or disallowed field rejects the whole response, same
 * defense-in-depth as the resume/LinkedIn pipeline. Never logs page
 * images or extracted values.
 */
export async function extractHrForm({
  client,
  model,
  pages,
}: ExtractHrFormOptions): Promise<HrExtractionResult> {
  const toolInputSchema = buildHrToolInputSchema();

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    tools: [
      {
        name: TOOL_NAME,
        description:
          "Record whether the supplied images are the 4FINGERS Employment Application Form, and if so, every field you can confidently read from it — printed or handwritten. Omit any field you cannot find or are not reasonably confident about; never guess at an ambiguous checkbox or illegible handwriting.",
        input_schema: toolInputSchema,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "These images are the pages of an uploaded form, in order. Determine whether this is the 4FINGERS Employment Application Form template, then extract every field you can read.",
          },
          ...pages.map(
            (page) =>
              ({
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: "image/png" as const,
                  data: page.base64Png,
                },
              }) satisfies Anthropic.ImageBlockParam,
          ),
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block) => block.type === "tool_use" && block.name === TOOL_NAME,
  );
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Extraction did not return a structured result");
  }

  const parsed = HrToolResponseSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error("Extraction result failed schema validation");
  }

  if (!parsed.data.templateMatch) {
    return {
      templateMatch: false,
      templateMismatchReason:
        parsed.data.templateMismatchReason ??
        "This doesn't look like the 4FINGERS Employment Application Form.",
      candidateFields: {},
      officialFields: {},
    };
  }

  return {
    templateMatch: true,
    candidateFields: dropEmptyStrings(parsed.data.candidateFields ?? {}),
    officialFields: dropEmptyStrings(parsed.data.officialFields ?? {}),
  };
}

function dropEmptyStrings(
  fields: Record<string, { value: string | boolean; confidence: "high" | "medium" | "low" }>,
) {
  const result: typeof fields = {};
  for (const [id, field] of Object.entries(fields)) {
    if (typeof field.value === "string" && field.value.trim() === "") continue;
    result[id] = field;
  }
  return result;
}
