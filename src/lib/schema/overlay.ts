import { FIELD_MAP } from "./fieldMap.generated";
import type { FieldMeta, OverlayRect } from "./types";

/**
 * Fixed PDF overlay map keyed by canonical field ID. Coordinates are
 * top-left PDF points on 612 x 792pt pages (see docs/FIELD_MAP.md) and are
 * approximate until calibrated in S07 against rendered synthetic output.
 * Fields with no PDF overlay (e.g. `declaration_accepted`, and every
 * `official_*` field) are simply absent from this map.
 */
export const OVERLAY_MAP: ReadonlyMap<string, OverlayRect> = new Map(
  (FIELD_MAP as readonly FieldMeta[])
    .filter((f): f is FieldMeta & { overlay: OverlayRect } => f.overlay !== undefined)
    .map((f) => [f.id, f.overlay]),
);

export function getOverlayRect(fieldId: string): OverlayRect | undefined {
  return OVERLAY_MAP.get(fieldId);
}

/** Page each field's overlay rectangle belongs to, keyed by field ID. */
export const OVERLAY_PAGE_MAP: ReadonlyMap<string, 1 | 2> = new Map(
  (FIELD_MAP as readonly FieldMeta[])
    .filter((f) => f.overlay !== undefined)
    .map((f) => [f.id, f.page]),
);
