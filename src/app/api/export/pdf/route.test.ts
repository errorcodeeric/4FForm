// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "./route";

const COMPLETE: Record<string, unknown> = {
  position_applied_for: "Crew Team Member",
  full_name: "TAN Wei Ming",
  identity_number: "S1234567A",
  address: "123 Ang Mo Kio Avenue 6, Singapore",
  telephone_mobile: "+65 9123 4567",
  email: "weiming.tan@example.com",
  citizenship: "Singaporean",
  legal_right_to_work_sg: "Citizen",
  driving_licence_answer: false,
  criminal_charge_answer: false,
  employment_discipline_answer: false,
  medical_impact_answer: false,
  bankruptcy_answer: false,
  company_contact_answer: false,
  expected_salary: "$2,800",
  termination_notice: "2 weeks",
  declaration_accepted: true,
  declaration_date: "22/09/2026",
  applicant_signature: { kind: "typed", typedText: "Tan Wei Ming" },
};

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/export/pdf", () => {
  it("rejects an invalid JSON body", async () => {
    const response = await POST(
      new Request("http://localhost/api/export/pdf", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects candidate data containing an official_* key", async () => {
    const response = await post({
      candidateData: { ...COMPLETE, official_date: "2026-01-01" },
    });
    expect(response.status).toBe(400);
  });

  it("blocks export with specific missing items when the application is incomplete (T12)", async () => {
    const response = await post({ candidateData: {} });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(Array.isArray(body.blockers)).toBe(true);
    expect(body.blockers.length).toBeGreaterThan(0);
    expect(body.blockers.map((b: { id: string }) => b.id)).toContain(
      "full_name",
    );
  });

  it("returns the PDF binary for a complete application with no long values", async () => {
    const response = await post({ candidateData: COMPLETE });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("withholds the PDF and returns warnings when a value would be truncated, until confirmed (T16)", async () => {
    const longValue = "A very long employer name ".repeat(20);
    const withLongValue = {
      ...COMPLETE,
      employment_1_employer: longValue,
    };

    const first = await post({ candidateData: withLongValue });
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("application/json");
    const firstBody = await first.json();
    expect(firstBody.warnings.length).toBeGreaterThan(0);

    const second = await post({
      candidateData: withLongValue,
      confirmTruncation: true,
    });
    expect(second.headers.get("content-type")).toBe("application/pdf");
  });
});
