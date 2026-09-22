// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/hr/export/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/hr/export/csv", () => {
  it("rejects malformed records", async () => {
    const response = await post({ records: "not an array" });
    expect(response.status).toBe(400);
  });

  it("rejects a record whose candidateData contains an official_* key", async () => {
    const response = await post({
      records: [
        {
          fileName: "a.pdf",
          status: "success",
          candidateData: { official_date: "2026-01-01" },
        },
      ],
    });
    expect(response.status).toBe(400);
  });

  it("keeps successful records and omits a failed one from the CSV (T22)", async () => {
    const response = await post({
      records: [
        {
          fileName: "good.pdf",
          status: "success",
          candidateData: { full_name: "Jane Tan" },
        },
        {
          fileName: "bad.pdf",
          status: "error",
          errorMessage: "Wrong template",
        },
      ],
    });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Jane Tan");
    expect(text).not.toContain("bad.pdf");
  });
});
