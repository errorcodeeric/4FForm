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

async function loadFixturePdf(): Promise<File> {
  const buffer = await readFile(
    path.join(FIXTURES_DIR, "synthetic-resume.pdf"),
  );
  return new File([buffer], "synthetic-resume.pdf", {
    type: "application/pdf",
  });
}

function postWithFile(file: File): Promise<Response> {
  const formData = new FormData();
  formData.append("file", file);
  return POST(new Request("http://localhost/api/import/resume", {
    method: "POST",
    body: formData,
  }));
}

// Imported after the mocks above so route.ts picks up the mocked modules.
const { POST } = await import("./route");

describe("POST /api/import/resume", () => {
  beforeEach(() => {
    extractFieldsMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a request with no file", async () => {
    const response = await POST(
      new Request("http://localhost/api/import/resume", {
        method: "POST",
        body: new FormData(),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a file larger than the 5 MB limit", async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 1);
    const file = new File([bigBuffer], "big.pdf", {
      type: "application/pdf",
    });
    const response = await postWithFile(file);
    expect(response.status).toBe(413);
  });

  it("rejects an unsupported file type", async () => {
    const file = new File([Buffer.from("hi")], "photo.png", {
      type: "image/png",
    });
    const response = await postWithFile(file);
    expect(response.status).toBe(415);
  });

  it("returns 503 when the server has no Anthropic configuration", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("ANTHROPIC_MODEL", "");
    const file = await loadFixturePdf();
    const response = await postWithFile(file);
    expect(response.status).toBe(503);
    expect(extractFieldsMock).not.toHaveBeenCalled();
  });

  it("extracts text and returns fields on a valid synthetic PDF (T07)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_MODEL", "test-model");
    extractFieldsMock.mockResolvedValue({
      full_name: { value: "Alex Synthetic", confidence: "high" },
    });

    const file = await loadFixturePdf();
    const response = await postWithFile(file);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = await response.json();
    expect(body.fields.full_name.value).toBe("Alex Synthetic");

    // The extracted text passed to the model should contain resume content,
    // proving text was actually pulled from the PDF, not skipped.
    const call = extractFieldsMock.mock.calls[0][0];
    expect(call.text).toContain("Alex Synthetic");
    expect(call.sourceKind).toBe("resume");
  });

  it("returns 502 if extraction fails, without leaking internals", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_MODEL", "test-model");
    extractFieldsMock.mockRejectedValue(new Error("internal detail"));

    const file = await loadFixturePdf();
    const response = await postWithFile(file);
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).not.toContain("internal detail");
  });
});
