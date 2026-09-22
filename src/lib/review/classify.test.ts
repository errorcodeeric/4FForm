import { describe, expect, it } from "vitest";
import { classifyFields, getFinalPdfBlockers } from "./classify";
import type { CandidateData } from "@/lib/schema";
import type { FieldSourceMeta } from "@/components/candidate/FormContext";

function statusOf(
  data: Partial<CandidateData>,
  fieldSources: Readonly<Record<string, FieldSourceMeta>>,
  id: string,
) {
  return classifyFields(data, fieldSources).find((f) => f.id === id)?.status;
}

describe("classifyFields", () => {
  it("marks an empty required field as missing", () => {
    expect(statusOf({}, {}, "full_name")).toBe("missing");
  });

  it("marks a filled required field as ready", () => {
    expect(statusOf({ full_name: "Jane Tan" }, {}, "full_name")).toBe(
      "ready",
    );
  });

  it("marks a low-confidence imported value as needs_confirmation", () => {
    const status = statusOf(
      { full_name: "Jane Tan" },
      { full_name: { source: "resume", confidence: "low" } },
      "full_name",
    );
    expect(status).toBe("needs_confirmation");
  });

  it("marks a high-confidence imported value as ready, not needs_confirmation", () => {
    const status = statusOf(
      { full_name: "Jane Tan" },
      { full_name: { source: "resume", confidence: "high" } },
      "full_name",
    );
    expect(status).toBe("ready");
  });

  it("omits an optional empty field entirely (not missing)", () => {
    expect(statusOf({}, {}, "telephone_home")).toBeUndefined();
    expect(statusOf({}, {}, "education_1_institution")).toBeUndefined();
  });

  it("treats an explicit No answer to a required yes/no as ready, not missing", () => {
    expect(
      statusOf({ driving_licence_answer: false }, {}, "driving_licence_answer"),
    ).toBe("ready");
  });

  it("does not surface a conditional detail field until its gate is met", () => {
    expect(
      statusOf({ driving_licence_answer: false }, {}, "driving_licence_details"),
    ).toBeUndefined();
    expect(statusOf({}, {}, "driving_licence_details")).toBeUndefined();
  });

  it("marks a conditional detail as missing once its Yes gate is met and it's empty (T05/T11)", () => {
    expect(
      statusOf({ driving_licence_answer: true }, {}, "driving_licence_details"),
    ).toBe("missing");
  });

  it("marks a conditional detail as ready once filled after its gate is met", () => {
    expect(
      statusOf(
        { driving_licence_answer: true, driving_licence_details: "Class 3" },
        {},
        "driving_licence_details",
      ),
    ).toBe("ready");
  });

  it("requires both name and department once relatives/friends is Yes", () => {
    const data: Partial<CandidateData> = { company_contact_answer: true };
    expect(statusOf(data, {}, "company_contact_name")).toBe("missing");
    expect(statusOf(data, {}, "company_contact_department")).toBe("missing");
  });

  it("requires job portal name once job portal is selected", () => {
    expect(
      statusOf(
        { vacancy_source_job_portal: true },
        {},
        "vacancy_source_job_portal_name",
      ),
    ).toBe("missing");
  });

  it("does not require job portal name when job portal isn't selected", () => {
    expect(
      statusOf({}, {}, "vacancy_source_job_portal_name"),
    ).toBeUndefined();
  });

  it("treats declaration_accepted=false as missing, not a complete No answer", () => {
    expect(statusOf({ declaration_accepted: false }, {}, "declaration_accepted")).toBe(
      "missing",
    );
  });

  it("does not require declaration_date or signature before declaration is accepted", () => {
    expect(statusOf({}, {}, "declaration_date")).toBeUndefined();
    expect(statusOf({}, {}, "applicant_signature")).toBeUndefined();
  });

  it("requires declaration_date and signature once declaration is accepted", () => {
    const data: Partial<CandidateData> = { declaration_accepted: true };
    expect(statusOf(data, {}, "declaration_date")).toBe("missing");
    expect(statusOf(data, {}, "applicant_signature")).toBe("missing");
  });

  it("accepts a typed signature with text as complete, but not an empty typed signature", () => {
    const withText: Partial<CandidateData> = {
      declaration_accepted: true,
      applicant_signature: { kind: "typed", typedText: "Jane Tan" },
    };
    const withoutText: Partial<CandidateData> = {
      declaration_accepted: true,
      applicant_signature: { kind: "typed", typedText: "  " },
    };
    expect(statusOf(withText, {}, "applicant_signature")).toBe("ready");
    expect(statusOf(withoutText, {}, "applicant_signature")).toBe("missing");
  });
});

describe("getFinalPdfBlockers", () => {
  it("blocks on every currently-required missing field", () => {
    const blockers = getFinalPdfBlockers({}, {});
    const ids = blockers.map((b) => b.id);
    expect(ids).toContain("full_name");
    expect(ids).toContain("declaration_accepted");
    // Not yet applicable (declaration not accepted), so not a blocker yet:
    expect(ids).not.toContain("applicant_signature");
  });

  it("is empty once every required and applicable-conditional field is complete (T12)", () => {
    const complete: Partial<CandidateData> = {
      position_applied_for: "Crew",
      full_name: "Jane Tan",
      identity_number: "S1234567A",
      address: "1 Test Street",
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
      termination_notice: "1 month",
      declaration_accepted: true,
      declaration_date: "2026-09-22",
      applicant_signature: { kind: "typed", typedText: "Jane Tan" },
    };
    expect(getFinalPdfBlockers(complete, {})).toEqual([]);
  });

  it("blocks specifically on the missing signature when declaration is accepted but unsigned (T12)", () => {
    const blockers = getFinalPdfBlockers(
      { declaration_accepted: true, declaration_date: "2026-09-22" },
      {},
    );
    expect(blockers.map((b) => b.id)).toContain("applicant_signature");
  });
});
