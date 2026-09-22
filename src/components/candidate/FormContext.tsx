"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CandidateData, SignatureValue } from "@/lib/schema";
import type { ExtractionResult } from "@/lib/import/types";

/** The union of every value type any candidate field can hold. */
export type CandidateFieldValue = string | boolean | SignatureValue;

export interface FieldSourceMeta {
  readonly source: string;
  readonly confidence: "high" | "medium" | "low";
}

export interface MergeOutcome {
  /** Field IDs that were written because they were previously empty (or forced). */
  readonly applied: readonly string[];
  /** Field IDs left untouched because they already had a value. */
  readonly conflicts: readonly string[];
}

interface CandidateFormContextValue {
  data: Partial<CandidateData>;
  fieldSources: Readonly<Record<string, FieldSourceMeta>>;
  isDirty: boolean;
  setField: (id: string, value: CandidateFieldValue) => void;
  reset: () => void;
  /**
   * Merges an extraction result into the form. Per the S04/S05 spec, a
   * field is only overwritten if it's currently empty, unless its ID is
   * listed in `options.force` (used when the candidate explicitly approves
   * a replacement after reviewing the conflict list).
   */
  mergeExtractionResult: (
    result: ExtractionResult,
    source: string,
    options?: { force?: readonly string[] },
  ) => MergeOutcome;
}

const CandidateFormContext = createContext<CandidateFormContextValue | null>(
  null,
);

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

/**
 * Holds the in-progress candidate application in browser memory only — no
 * localStorage, no server round-trip until the candidate explicitly
 * exports. Per the transient-data policy (README.md), this state is lost
 * on reload by design; `beforeunload` warns before that happens once the
 * candidate has made an edit.
 */
export function CandidateFormProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Partial<CandidateData>>({});
  const [fieldSources, setFieldSources] = useState<
    Record<string, FieldSourceMeta>
  >({});
  const [isDirty, setIsDirty] = useState(false);

  const setField = useCallback((id: string, value: CandidateFieldValue) => {
    setData(
      (prev) => ({ ...prev, [id]: value }) as Partial<CandidateData>,
    );
    setIsDirty(true);
  }, []);

  const mergeExtractionResult = useCallback(
    (
      result: ExtractionResult,
      source: string,
      options?: { force?: readonly string[] },
    ): MergeOutcome => {
      const forceSet = new Set(options?.force ?? []);
      const applied: string[] = [];
      const conflicts: string[] = [];

      setData((prev) => {
        const next = { ...prev } as Record<string, unknown>;
        for (const [id, field] of Object.entries(result)) {
          const current = next[id];
          if (forceSet.has(id) || isEmptyValue(current)) {
            next[id] = field.value;
            applied.push(id);
          } else {
            conflicts.push(id);
          }
        }
        return next as Partial<CandidateData>;
      });

      setFieldSources((prev) => {
        const next = { ...prev };
        for (const [id, field] of Object.entries(result)) {
          if (!forceSet.has(id) && !isEmptyValue((data as Record<string, unknown>)[id])) {
            continue;
          }
          next[id] = { source, confidence: field.confidence };
        }
        return next;
      });

      if (applied.length > 0) setIsDirty(true);
      return { applied, conflicts };
    },
    [data],
  );

  const reset = useCallback(() => {
    setData({});
    setFieldSources({});
    setIsDirty(false);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const value = useMemo(
    () => ({
      data,
      fieldSources,
      isDirty,
      setField,
      reset,
      mergeExtractionResult,
    }),
    [data, fieldSources, isDirty, setField, reset, mergeExtractionResult],
  );

  return (
    <CandidateFormContext.Provider value={value}>
      {children}
    </CandidateFormContext.Provider>
  );
}

export function useCandidateForm(): CandidateFormContextValue {
  const ctx = useContext(CandidateFormContext);
  if (!ctx) {
    throw new Error(
      "useCandidateForm must be used within a CandidateFormProvider",
    );
  }
  return ctx;
}
