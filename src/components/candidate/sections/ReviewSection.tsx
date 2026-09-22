"use client";

import { classifyFields, getFinalPdfBlockers } from "@/lib/review/classify";
import { useCandidateForm } from "../FormContext";
import { Section } from "./Section";
import styles from "./sections.module.css";

/**
 * Summarizes completion state (ready / needs confirmation / missing) and
 * whether the final, values-overlaid PDF can be exported yet. A draft
 * CSV/XLSX export has no such gate — it's always available and simply
 * carries a "draft" label (built in S08).
 */
export function ReviewSection() {
  const { data, fieldSources } = useCandidateForm();
  const classification = classifyFields(data, fieldSources);
  const ready = classification.filter((f) => f.status === "ready");
  const needsConfirmation = classification.filter(
    (f) => f.status === "needs_confirmation",
  );
  const missing = classification.filter((f) => f.status === "missing");
  const blockers = getFinalPdfBlockers(data, fieldSources);

  return (
    <Section title="Review">
      <p className={styles.hint}>
        {ready.length} ready, {needsConfirmation.length} need confirmation,{" "}
        {missing.length} missing.
      </p>

      {needsConfirmation.length > 0 && (
        <div>
          <p className={styles.hint}>
            Needs confirmation (imported with low confidence — please
            check these values above):
          </p>
          <ul>
            {needsConfirmation.map((field) => (
              <li key={field.id}>{field.label}</li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div>
          <p className={styles.hint}>Still needed:</p>
          <ul>
            {missing.map((field) => (
              <li key={field.id}>{field.label}</li>
            ))}
          </ul>
        </div>
      )}

      <p className={styles.hint} data-testid="final-pdf-readiness">
        {blockers.length === 0
          ? "The final PDF is ready to export."
          : `The final PDF is blocked until: ${blockers
              .map((b) => b.reason)
              .join(" ")}`}
      </p>
      <p className={styles.hint}>
        A draft CSV/XLSX export is always available and is clearly labeled
        as a draft, regardless of the above.
      </p>
    </Section>
  );
}
