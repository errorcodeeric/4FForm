import {
  getDependentFieldIds,
  getFieldMeta,
  getSectionFieldIds,
} from "@/lib/schema";
import { CheckboxDetailField } from "../fields/CheckboxDetailField";
import { Section } from "./Section";
import styles from "./sections.module.css";

/**
 * Friend/relatives, job portal (+ name), and other (+ detail) — each a
 * checkbox with an optional conditional detail, derived from the field map
 * so the job-portal-name and other-details fields are picked up without
 * hard-coding the pairing.
 */
export function VacancySourceSection() {
  const ids = getSectionFieldIds("Vacancy source");
  const checkboxIds = ids.filter((id) => getFieldMeta(id).type === "boolean");

  return (
    <Section title="How did you hear about this vacancy?">
      <div className={styles.repeatList}>
        {checkboxIds.map((id) => (
          <CheckboxDetailField
            key={id}
            id={id}
            detailIds={getDependentFieldIds(id)}
          />
        ))}
      </div>
    </Section>
  );
}
