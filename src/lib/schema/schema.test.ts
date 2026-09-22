import { describe, expect, it } from "vitest";
import { FIELD_MAP } from "./fieldMap.generated";
import {
  CANDIDATE_FIELD_IDS,
  CandidateDataSchema,
  OFFICIAL_FIELD_IDS,
  OfficialUseDataSchema,
} from "./build";
import { CANDIDATE_EXPORT_FIELD_IDS } from "./exportKeys";
import { OVERLAY_MAP } from "./overlay";
import {
  getDependentFieldIds,
  getRepeatGroups,
  parseConditional,
} from "./groups";
import { getFieldMeta, getSectionFieldIds, getSections } from "./lookup";

describe("FIELD_MAP integrity", () => {
  it("has no duplicate field IDs", () => {
    const ids = FIELD_MAP.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("assigns every field to exactly one owner", () => {
    for (const field of FIELD_MAP) {
      expect(["candidate", "hr"]).toContain(field.owner);
    }
  });

  it("splits candidate and official fields with no overlap", () => {
    const candidateSet = new Set(CANDIDATE_FIELD_IDS);
    const officialSet = new Set(OFFICIAL_FIELD_IDS);
    for (const id of officialSet) {
      expect(candidateSet.has(id)).toBe(false);
    }
    expect(CANDIDATE_FIELD_IDS.length + OFFICIAL_FIELD_IDS.length).toBe(
      FIELD_MAP.length,
    );
  });

  it("marks every FOR OFFICIAL USE ONLY field as hr-owned", () => {
    const officialSectionIds = FIELD_MAP.filter(
      (f) => f.section === "FOR OFFICIAL USE ONLY",
    ).map((f) => f.id);
    expect(officialSectionIds.length).toBeGreaterThan(0);
    for (const id of officialSectionIds) {
      expect(OFFICIAL_FIELD_IDS).toContain(id);
    }
  });
});

describe("CandidateDataSchema", () => {
  it("has exactly one schema key per candidate field ID (T02)", () => {
    const schemaKeys = Object.keys(CandidateDataSchema.shape).sort();
    expect(schemaKeys).toEqual([...CANDIDATE_FIELD_IDS].sort());
  });

  it("accepts an all-empty draft payload", () => {
    expect(() => CandidateDataSchema.parse({})).not.toThrow();
  });

  it("accepts a partially filled payload", () => {
    const result = CandidateDataSchema.parse({
      full_name: "Jane Tan",
      email: "jane@example.com",
      driving_licence_answer: true,
    });
    expect(result.full_name).toBe("Jane Tan");
  });

  it("rejects an official_* key in a candidate payload (T03)", () => {
    expect(() =>
      CandidateDataSchema.parse({
        full_name: "Jane Tan",
        official_date: "2026-01-01",
      }),
    ).toThrow();
  });

  it("rejects a malformed email but accepts an empty one", () => {
    expect(() =>
      CandidateDataSchema.parse({ email: "not-an-email" }),
    ).toThrow();
    expect(() => CandidateDataSchema.parse({ email: "" })).not.toThrow();
  });
});

describe("OfficialUseDataSchema", () => {
  it("has exactly one schema key per official field ID", () => {
    const schemaKeys = Object.keys(OfficialUseDataSchema.shape).sort();
    expect(schemaKeys).toEqual([...OFFICIAL_FIELD_IDS].sort());
  });

  it("rejects a candidate field ID inside an official payload", () => {
    expect(() =>
      OfficialUseDataSchema.parse({ full_name: "Jane Tan" }),
    ).toThrow();
  });
});

describe("export field coverage", () => {
  it("every exportable candidate field ID is a real candidate field", () => {
    const candidateSet = new Set(CANDIDATE_FIELD_IDS);
    for (const id of CANDIDATE_EXPORT_FIELD_IDS) {
      expect(candidateSet.has(id)).toBe(true);
    }
  });

  it("core required fields are marked exportable", () => {
    for (const id of ["full_name", "email", "identity_number"]) {
      expect(CANDIDATE_EXPORT_FIELD_IDS).toContain(id);
    }
  });
});

describe("PDF overlay map", () => {
  it("every overlay rectangle has finite positive width/height", () => {
    for (const rect of OVERLAY_MAP.values()) {
      expect(rect.w).toBeGreaterThan(0);
      expect(rect.h).toBeGreaterThan(0);
    }
  });

  it("never maps an official_* field (candidate PDF must not draw them)", () => {
    for (const id of OVERLAY_MAP.keys()) {
      expect(id.startsWith("official_")).toBe(false);
    }
  });

  it("keeps every overlay rectangle inside the 612 x 792pt page", () => {
    for (const rect of OVERLAY_MAP.values()) {
      expect(rect.x + rect.w).toBeLessThanOrEqual(612);
      expect(rect.y + rect.h).toBeLessThanOrEqual(792);
    }
  });
});

describe("repeat groups", () => {
  it("finds exactly 3 education rows with 4 fields each", () => {
    const groups = getRepeatGroups("Education");
    expect(groups.map((g) => g.row)).toEqual([1, 2, 3]);
    for (const group of groups) {
      expect(group.fields).toHaveLength(4);
    }
  });

  it("finds exactly 3 employment rows with 7 fields each", () => {
    const groups = getRepeatGroups("Employment");
    expect(groups.map((g) => g.row)).toEqual([1, 2, 3]);
    for (const group of groups) {
      expect(group.fields).toHaveLength(7);
    }
  });

  it("finds exactly 2 reference rows with 4 fields each", () => {
    const groups = getRepeatGroups("References");
    expect(groups.map((g) => g.row)).toEqual([1, 2]);
    for (const group of groups) {
      expect(group.fields).toHaveLength(4);
    }
  });
});

describe("conditional requirements", () => {
  it("parses a simple yes/no dependency", () => {
    const field = FIELD_MAP.find((f) => f.id === "driving_licence_details");
    expect(field).toBeDefined();
    const parsed = parseConditional(field!);
    expect(parsed).toEqual({
      dependsOnFieldId: "driving_licence_answer",
      equals: "Yes",
    });
  });

  it("every field marked conditional-required has a parsable dependency", () => {
    const conditionalFields = FIELD_MAP.filter(
      (f) => f.pocRequired === "conditional",
    );
    expect(conditionalFields.length).toBeGreaterThan(0);
    for (const field of conditionalFields) {
      expect(parseConditional(field)).toBeDefined();
    }
  });

  it("finds the two dependent fields for the relatives/friends question", () => {
    expect(getDependentFieldIds("company_contact_answer")).toEqual([
      "company_contact_name",
      "company_contact_department",
    ]);
  });

  it("finds the single dependent field for a simple yes/no question", () => {
    expect(getDependentFieldIds("bankruptcy_answer")).toEqual([
      "bankruptcy_details",
    ]);
  });
});

describe("field lookup helpers", () => {
  it("finds a known field by ID and throws for an unknown one", () => {
    expect(getFieldMeta("full_name").label).toContain("Full name");
    expect(() => getFieldMeta("not_a_real_field")).toThrow();
  });

  it("lists the 9 candidate sections in Field Map order, excluding official-only", () => {
    const sections = getSections("candidate");
    expect(sections).toEqual([
      "Application",
      "Personal",
      "Education",
      "Employment",
      "References",
      "Languages",
      "Other information",
      "Vacancy source",
      "Declaration",
    ]);
    expect(sections).not.toContain("FOR OFFICIAL USE ONLY");
  });

  it("returns non-repeated fields for a section, excluding repeat-group rows", () => {
    const personalIds = getSectionFieldIds("Personal");
    expect(personalIds).toContain("full_name");
    expect(personalIds).not.toContain("education_1_institution");
  });
});
