// @vitest-environment node
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/hr/export/xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/hr/export/xlsx", () => {
  it("produces Reviewed Data and Errors sheets, isolating a partial failure (T22)", async () => {
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
    const buffer = Buffer.from(await response.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    expect(workbook.SheetNames).toEqual(["Reviewed Data", "Errors"]);

    const reviewed = XLSX.utils.sheet_to_json<Record<string, string>>(
      workbook.Sheets["Reviewed Data"],
    );
    expect(reviewed).toHaveLength(1);
    expect(reviewed[0].full_name).toBe("Jane Tan");

    const errors = XLSX.utils.sheet_to_json<Record<string, string>>(
      workbook.Sheets.Errors,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]["File name"]).toBe("bad.pdf");
  });
});
