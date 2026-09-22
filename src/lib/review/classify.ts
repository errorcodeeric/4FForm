import {
  CANDIDATE_FIELD_IDS,
  getFieldMeta,
  parseConditional,
  type CandidateData,
  type SignatureValue,
} from "@/lib/schema";
import type { FieldMeta } from "@/lib/schema";
import type { FieldSourceMeta } from "@/components/candidate/FormContext";

export type FieldStatus = "ready" | "needs_confirmation" | "missing";

export interface FieldClassification {
  readonly id: string;
  readonly label: string;
  readonly status: FieldStatus;
}

export interface ExportBlocker {
  readonly id: string;
  readonly reason: string;
}

/**
 * Whether a field's conditional gate (if any) is currently satisfied — e.g.
 * `driving_licence_details` is only "applicable" once
 * `driving_licence_answer` is Yes. Fields with no conditional are always
 * applicable. An inapplicable field is excluded from review entirely: it's
 * neither ready, needing confirmation, nor missing.
 */
function isApplicable(meta: FieldMeta, data: Partial<CandidateData>): boolean {
  const dependency = parseConditional(meta);
  if (!dependency) return true;
  const dependencyValue = (data as Record<string, unknown>)[
    dependency.dependsOnFieldId
  ];
  const expected = dependency.equals.trim().toLowerCase();
  if (typeof dependencyValue === "boolean") {
    return dependencyValue === (expected === "yes" || expected === "true");
  }
  return String(dependencyValue ?? "").trim().toLowerCase() === expected;
}

function hasUsableSignature(value: unknown): boolean {
  const signature = value as SignatureValue | undefined;
  if (!signature) return false;
  if (signature.kind === "typed") return Boolean(signature.typedText?.trim());
  if (signature.kind === "drawn") return Boolean(signature.imageDataUrl);
  return false;
}

/**
 * Whether a field currently has no usable value. `declaration_accepted`
 * is special-cased: the spec requires it to be affirmatively `true`, not
 * merely "answered" — an explicit `false` still counts as empty/blocking,
 * unlike an ordinary yes/no question where either answer is complete.
 */
export function isFieldValueEmpty(meta: FieldMeta, value: unknown): boolean {
  if (meta.id === "declaration_accepted") return value !== true;
  if (meta.type === "signature") return !hasUsableSignature(value);
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false; // a committed boolean (true or false) is a complete answer
}

/**
 * Classifies every applicable candidate field as ready, needing
 * confirmation (a low-confidence imported value), or missing (required —
 * or currently-applicable-conditional — and empty). Fields that are
 * optional, empty, and not currently required are omitted entirely so the
 * review stays focused on what actually matters for completion.
 */
export function classifyFields(
  data: Partial<CandidateData>,
  fieldSources: Readonly<Record<string, FieldSourceMeta>>,
): readonly FieldClassification[] {
  const results: FieldClassification[] = [];
  for (const id of CANDIDATE_FIELD_IDS) {
    const meta = getFieldMeta(id);
    if (!isApplicable(meta, data)) continue;

    const value = (data as Record<string, unknown>)[id];
    const empty = isFieldValueEmpty(meta, value);

    if (!empty) {
      const confidence = fieldSources[id]?.confidence;
      results.push({
        id,
        label: meta.label,
        status: confidence === "low" ? "needs_confirmation" : "ready",
      });
    } else if (
      meta.pocRequired === "required" ||
      meta.pocRequired === "conditional"
    ) {
      results.push({ id, label: meta.label, status: "missing" });
    }
  }
  return results;
}

/**
 * Reasons the final, values-overlaid PDF cannot be exported yet: every
 * "missing" field from classifyFields (covers required fields and
 * currently-applicable conditional details, e.g. a Yes answer's detail, or
 * declaration acceptance/date), plus a usable signature once the
 * declaration has been accepted. Draft CSV/XLSX export has no such gate —
 * callers should always allow that regardless of this list.
 */
export function getFinalPdfBlockers(
  data: Partial<CandidateData>,
  fieldSources: Readonly<Record<string, FieldSourceMeta>>,
): readonly ExportBlocker[] {
  const blockers: ExportBlocker[] = classifyFields(data, fieldSources)
    .filter((item) => item.status === "missing")
    .map((item) => ({ id: item.id, reason: `${item.label} is required.` }));

  return blockers;
}
