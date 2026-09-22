export type FieldOwner = "candidate" | "hr";

export type FieldType =
  | "text"
  | "multiline"
  | "identifier"
  | "email"
  | "text_list"
  | "date"
  | "date_or_year"
  | "date_or_present"
  | "yes_no"
  | "boolean"
  | "choice"
  | "signature";

export type PocRequirement = "required" | "optional" | "conditional";

export interface OverlayRect {
  /** Top-left x, in PDF points, on a 612 x 792pt page. */
  readonly x: number;
  /** Top-left y, in PDF points, on a 612 x 792pt page. */
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface FieldSources {
  readonly resume: "Yes" | "Possible" | "No";
  readonly linkedin: "Yes" | "Possible" | "No";
  readonly manual: "Yes" | "No";
}

/**
 * One row of the canonical field map. `id` is the single identifier used
 * across the UI, extraction, validation, exports, and PDF overlay for this
 * field — see docs/FIELD_MAP.md.
 */
export interface FieldMeta {
  readonly id: string;
  readonly page: 1 | 2;
  readonly section: string;
  readonly label: string;
  readonly type: FieldType;
  /** 1-based index within a repeated group (education/employment/reference rows). */
  readonly row?: number;
  readonly owner: FieldOwner;
  readonly pocRequired: PocRequirement;
  readonly sources: FieldSources;
  /** Whether this field appears in CSV/XLSX exports. */
  readonly exportable: boolean;
  /** PDF overlay rectangle; absent for fields never drawn onto the PDF. */
  readonly overlay?: OverlayRect;
  readonly validation?: string;
  /** Human-readable description of the field this depends on, e.g. "driving_licence_answer = Yes". */
  readonly conditional?: string;
  readonly notes?: string;
}
