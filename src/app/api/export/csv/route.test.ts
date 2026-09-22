// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/export/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/export/csv", () => {
  it("rejects an official_* key", async () => {
    const response = await post({
      candidateData: { full_name: "Jane", official_date: "2026-01-01" },
    });
    expect(response.status).toBe(400);
  });

  it("exports a draft CSV for an incomplete application without blocking (S06/S08)", async () => {
    const response = await post({ candidateData: { full_name: "Jane Tan" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("draft");
    const text = await response.text();
    expect(text).toContain("export_status");
    expect(text.split("\r\n")[1]).toMatch(/^﻿?draft,/);
  });

  it("exports a final CSV filename for a complete application", async () => {
    const response = await post({
      candidateData: {
        position_applied_for: "Crew",
        full_name: "Jane Tan",
        identity_number: "S1234567A",
        address: "1 Test St",
        telephone_mobile: "+65 9123 4567",
        email: "jane@example.com",
        citizenship: "Singaporean",
        legal_right_to_work_sg: "Citizen",
        driving_licence_answer: false,
        criminal_charge_answer: false,
        employment_discipline_answer: false,
        medical_impact_answer: false,
        bankruptcy_answer: false,
        company_contact_answer: false,
        expected_salary: "3000",
        termination_notice: "2 weeks",
        declaration_accepted: true,
        declaration_date: "22/09/2026",
        applicant_signature: { kind: "typed", typedText: "Jane Tan" },
      },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).not.toContain(
      "draft",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
