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

/** The union of every value type any candidate field can hold. */
export type CandidateFieldValue = string | boolean | SignatureValue;

interface CandidateFormContextValue {
  data: Partial<CandidateData>;
  isDirty: boolean;
  setField: (id: string, value: CandidateFieldValue) => void;
  reset: () => void;
}

const CandidateFormContext = createContext<CandidateFormContextValue | null>(
  null,
);

/**
 * Holds the in-progress candidate application in browser memory only — no
 * localStorage, no server round-trip until the candidate explicitly
 * exports. Per the transient-data policy (README.md), this state is lost
 * on reload by design; `beforeunload` warns before that happens once the
 * candidate has made an edit.
 */
export function CandidateFormProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Partial<CandidateData>>({});
  const [isDirty, setIsDirty] = useState(false);

  const setField = useCallback((id: string, value: CandidateFieldValue) => {
    setData(
      (prev) => ({ ...prev, [id]: value }) as Partial<CandidateData>,
    );
    setIsDirty(true);
  }, []);

  const reset = useCallback(() => {
    setData({});
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
    () => ({ data, isDirty, setField, reset }),
    [data, isDirty, setField, reset],
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
