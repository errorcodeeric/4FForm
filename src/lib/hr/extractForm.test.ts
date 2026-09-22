import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { extractHrForm } from "./extractForm";
import { HR_CANDIDATE_FIELD_IDS, HR_OFFICIAL_FIELD_IDS } from "./allowedFields";

const FAKE_PAGES = [
  { pageNumber: 1, base64Png: "aGVsbG8=" },
  { pageNumber: 2, base64Png: "d29ybGQ=" },
];

function fakeClient(toolInput: unknown): Pick<Anthropic, "messages"> {
  return {
    messages: {
      create: async () =>
        ({
          content: [
            {
              type: "tool_use",
              id: "toolu_fake",
              name: "record_form_extraction",
              input: toolInput,
            },
          ],
        }) as unknown,
    },
  } as unknown as Pick<Anthropic, "messages">;
}

describe("extractHrForm", () => {
  it("returns candidate and official fields when the template matches", async () => {
    const client = fakeClient({
      templateMatch: true,
      candidateFields: {
        full_name: { value: "TAN Wei Ming", confidence: "high" },
        identity_number: { value: "S1234567A", confidence: "medium" },
      },
      officialFields: {
        official_proceed_to_offer: { value: true, confidence: "medium" },
      },
    });

    const result = await extractHrForm({
      client,
      model: "test-model",
      pages: FAKE_PAGES,
    });

    expect(result.templateMatch).toBe(true);
    expect(result.candidateFields.full_name?.value).toBe("TAN Wei Ming");
    expect(result.officialFields.official_proceed_to_offer?.value).toBe(true);
  });

  it("returns no fields and a reason when the template does not match (T20)", async () => {
    const client = fakeClient({
      templateMatch: false,
      templateMismatchReason: "This is a resume, not the application form.",
    });

    const result = await extractHrForm({
      client,
      model: "test-model",
      pages: FAKE_PAGES,
    });

    expect(result.templateMatch).toBe(false);
    expect(result.templateMismatchReason).toContain("resume");
    expect(result.candidateFields).toEqual({});
    expect(result.officialFields).toEqual({});
  });

  it("rejects the whole response if candidateFields contains an official_* key", async () => {
    const client = fakeClient({
      templateMatch: true,
      candidateFields: {
        full_name: { value: "TAN Wei Ming", confidence: "high" },
        official_date: { value: "2026-01-01", confidence: "high" },
      },
    });

    await expect(
      extractHrForm({ client, model: "test-model", pages: FAKE_PAGES }),
    ).rejects.toThrow(/schema validation/i);
  });

  it("rejects the whole response if officialFields contains a candidate-only key", async () => {
    const client = fakeClient({
      templateMatch: true,
      officialFields: {
        full_name: { value: "TAN Wei Ming", confidence: "high" },
      },
    });

    await expect(
      extractHrForm({ client, model: "test-model", pages: FAKE_PAGES }),
    ).rejects.toThrow(/schema validation/i);
  });

  it("never allows applicant_signature in the HR candidate allow-list", () => {
    expect(HR_CANDIDATE_FIELD_IDS).not.toContain("applicant_signature");
  });

  it("HR official allow-list covers every official_* field", () => {
    expect(HR_OFFICIAL_FIELD_IDS.length).toBeGreaterThan(0);
    for (const id of HR_OFFICIAL_FIELD_IDS) {
      expect(id.startsWith("official_")).toBe(true);
    }
  });

  it("throws when the model does not return a tool_use block", async () => {
    const client: Pick<Anthropic, "messages"> = {
      messages: {
        create: async () =>
          ({ content: [{ type: "text", text: "no tool use" }] }) as unknown,
      },
    } as unknown as Pick<Anthropic, "messages">;

    await expect(
      extractHrForm({ client, model: "test-model", pages: FAKE_PAGES }),
    ).rejects.toThrow(/structured result/i);
  });
});
