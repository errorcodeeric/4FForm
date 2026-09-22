// @vitest-environment node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { extractFieldsMock } = vi.hoisted(() => ({
  extractFieldsMock: vi.fn(),
}));
vi.mock("@/lib/import/extractFields", () => ({
  extractFields: (...args: unknown[]) => extractFieldsMock(...args),
}));
vi.mock("@/lib/import/anthropicClient", () => ({
  getAnthropicClient: () => ({}),
}));

const FIXTURES_DIR = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "lib",
  "import",
  "fixtures",
);

function post(formData: FormData): Promise<Response> {
  return POST(
    new Request("http://localhost/api/import/linkedin", {
      method: "POST",
      body: formData,
    }),
  );
}

const { POST } = await import("./route");

describe("POST /api/import/linkedin", () => {
  beforeEach(() => {
    extractFieldsMock.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_MODEL", "test-model");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a request with neither a file nor pasted text", async () => {
    const response = await post(new FormData());
    expect(response.status).toBe(400);
    expect(extractFieldsMock).not.toHaveBeenCalled();
  });

  it("rejects pasted text over the character limit", async () => {
    const formData = new FormData();
    formData.append("text", "a".repeat(20_001));
    const response = await post(formData);
    expect(response.status).toBe(413);
    expect(extractFieldsMock).not.toHaveBeenCalled();
  });

  it("extracts fields from pasted LinkedIn profile text (T10)", async () => {
    extractFieldsMock.mockResolvedValue({
      full_name: { value: "Alex Synthetic", confidence: "high" },
    });
    const formData = new FormData();
    formData.append(
      "text",
      "Alex Synthetic\nSoftware Engineer at Acme Test Pte Ltd\nEducation: National University of Singapore",
    );

    const response = await post(formData);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.fields.full_name.value).toBe("Alex Synthetic");

    const call = extractFieldsMock.mock.calls[0][0];
    expect(call.sourceKind).toBe("linkedin");
    expect(call.text).toContain("Acme Test Pte Ltd");
  });

  it("extracts fields from an uploaded LinkedIn-exported PDF file", async () => {
    extractFieldsMock.mockResolvedValue({
      email: { value: "alex.synthetic@example.com", confidence: "high" },
    });
    const buffer = await readFile(
      path.join(FIXTURES_DIR, "synthetic-resume.pdf"),
    );
    const file = new File([buffer], "linkedin-export.pdf", {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.append("file", file);

    const response = await post(formData);
    expect(response.status).toBe(200);
    const call = extractFieldsMock.mock.calls[0][0];
    expect(call.sourceKind).toBe("linkedin");
    expect(call.text).toContain("Alex Synthetic");
  });

  it("rejects an oversized file", async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 1);
    const file = new File([bigBuffer], "big.pdf", {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.append("file", file);
    const response = await post(formData);
    expect(response.status).toBe(413);
  });

  it("rejects a file named .pdf whose content isn't actually a PDF (S11 signature check)", async () => {
    const file = new File([Buffer.from("not really a pdf")], "fake.pdf", {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.append("file", file);
    const response = await post(formData);
    expect(response.status).toBe(415);
    expect(extractFieldsMock).not.toHaveBeenCalled();
  });
});
