import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { extractFields } from "./extractFields";

function fakeClient(toolUseInput: unknown): Pick<Anthropic, "messages"> {
  return {
    messages: {
      create: async () =>
        ({
          content: [
            {
              type: "tool_use",
              id: "toolu_fake",
              name: "record_extracted_fields",
              input: toolUseInput,
            },
          ],
        }) as unknown,
    },
  } as unknown as Pick<Anthropic, "messages">;
}

describe("extractFields", () => {
  it("returns allow-listed fields with confidence metadata", async () => {
    const client = fakeClient({
      full_name: { value: "Alex Synthetic", confidence: "high" },
      email: { value: "alex.synthetic@example.com", confidence: "high" },
    });

    const result = await extractFields({
      client,
      model: "test-model",
      text: "synthetic resume text",
      sourceKind: "resume",
    });

    expect(result.full_name).toEqual({
      value: "Alex Synthetic",
      confidence: "high",
    });
    expect(result.email?.value).toBe("alex.synthetic@example.com");
  });

  it("drops fields the model returned with an empty string value", async () => {
    const client = fakeClient({
      full_name: { value: "", confidence: "low" },
    });

    const result = await extractFields({
      client,
      model: "test-model",
      text: "synthetic resume text",
      sourceKind: "resume",
    });

    expect(result.full_name).toBeUndefined();
  });

  it("rejects the whole response if the model hallucinates a disallowed field (e.g. identity_number)", async () => {
    const client = fakeClient({
      full_name: { value: "Alex Synthetic", confidence: "high" },
      identity_number: { value: "S1234567A", confidence: "high" },
    });

    await expect(
      extractFields({
        client,
        model: "test-model",
        text: "synthetic resume text",
        sourceKind: "resume",
      }),
    ).rejects.toThrow(/schema validation/i);
  });

  it("throws when the model does not return a tool_use block", async () => {
    const client: Pick<Anthropic, "messages"> = {
      messages: {
        create: async () =>
          ({ content: [{ type: "text", text: "no tool use" }] }) as unknown,
      },
    } as unknown as Pick<Anthropic, "messages">;

    await expect(
      extractFields({
        client,
        model: "test-model",
        text: "synthetic resume text",
        sourceKind: "resume",
      }),
    ).rejects.toThrow(/structured result/i);
  });
});
