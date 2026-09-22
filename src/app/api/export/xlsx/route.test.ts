// @vitest-environment node
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/export/xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/export/xlsx", () => {
  it("rejects an official_* key", async () => {
    const response = await post({
      candidateData: { full_name: "Jane", official_date: "2026-01-01" },
    });
    expect(response.status).toBe(400);
  });

  it("returns a workbook with Candidate Data and Field Dictionary sheets (T18)", async () => {
    const response = await post({ candidateData: { full_name: "Jane Tan" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("spreadsheetml");
    expect(response.headers.get("content-disposition")).toContain("draft");

    const buffer = Buffer.from(await response.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    expect(workbook.SheetNames).toEqual([
      "Candidate Data",
      "Field Dictionary",
    ]);
  });
});
