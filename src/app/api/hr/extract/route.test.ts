// @vitest-environment node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { extractHrFormMock } = vi.hoisted(() => ({
  extractHrFormMock: vi.fn(),
}));
vi.mock("@/lib/hr/extractForm", () => ({
  extractHrForm: (...args: unknown[]) => extractHrFormMock(...args),
}));
vi.mock("@/lib/import/anthropicClient", () => ({
  getAnthropicClient: () => ({}),
}));

const FIXTURES_DIR = path.join(__dirname, "..", "..", "..", "..", "lib", "hr", "fixtures");
const RESUME_FIXTURES_DIR = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "lib",
  "import",
  "fixtures",
);

async function loadFixture(name: string, dir = FIXTURES_DIR): Promise<File> {
  const buffer = await readFile(path.join(dir, name));
  return new File([buffer], name, { type: "application/pdf" });
}

function postWithFile(file: File): Promise<Response> {
  const formData = new FormData();
  formData.append("file", file);
  return POST(
    new Request("http://localhost/api/hr/extract", {
      method: "POST",
      body: formData,
    }),
  );
}

const { POST } = await import("./route");

describe("POST /api/hr/extract", () => {
  beforeEach(() => {
    extractHrFormMock.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_MODEL", "test-model");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a request with no file", async () => {
    const response = await POST(
      new Request("http://localhost/api/hr/extract", {
        method: "POST",
        body: new FormData(),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a wrong-page-count file before ever calling the model (T24)", async () => {
    const file = await loadFixture(
      "synthetic-resume.pdf",
      RESUME_FIXTURES_DIR,
    );
    const response = await postWithFile(file);
    expect(response.status).toBe(422);
    expect(extractHrFormMock).not.toHaveBeenCalled();
  });

  it("rejects a file named .pdf whose content isn't actually a PDF (S11 signature check)", async () => {
    const file = new File([Buffer.from("not really a pdf")], "fake.pdf", {
      type: "application/pdf",
    });
    const response = await postWithFile(file);
    expect(response.status).toBe(415);
    expect(extractHrFormMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the server has no Anthropic configuration", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("ANTHROPIC_MODEL", "");
    const file = await loadFixture("synthetic-completed-form.pdf");
    const response = await postWithFile(file);
    expect(response.status).toBe(503);
    expect(extractHrFormMock).not.toHaveBeenCalled();
  });

  it("extracts fields from a known-template synthetic form (T19)", async () => {
    extractHrFormMock.mockResolvedValue({
      templateMatch: true,
      candidateFields: {
        full_name: { value: "TAN Wei Ming", confidence: "high" },
      },
      officialFields: {},
    });
    const file = await loadFixture("synthetic-completed-form.pdf");
    const response = await postWithFile(file);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.templateMatch).toBe(true);
    expect(body.candidateFields.full_name.value).toBe("TAN Wei Ming");
  });

  it("clearly rejects a wrong template without fabricating a record (T20)", async () => {
    extractHrFormMock.mockResolvedValue({
      templateMatch: false,
      templateMismatchReason: "This is an unrelated document.",
      candidateFields: {},
      officialFields: {},
    });
    const file = await loadFixture("synthetic-wrong-template.pdf");
    const response = await postWithFile(file);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.templateMatch).toBe(false);
    expect(body.message).toContain("unrelated");
  });
});
