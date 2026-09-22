"use client";

import { getFieldMeta } from "@/lib/schema";
import { useCandidateForm } from "../FormContext";
import { TextInputField } from "./TextInputField";
import styles from "./fields.module.css";

interface YesNoDetailFieldProps {
  answerId: string;
  /** Detail field IDs revealed (and required) only when the answer is Yes. */
  detailIds?: readonly string[];
}

/**
 * A Yes/No question with zero or more detail fields that only appear when
 * the answer is Yes. Switching to No clears any previously entered detail
 * values, per the S03 spec ("No clears or ignores detail").
 */
export function YesNoDetailField({
  answerId,
  detailIds = [],
}: YesNoDetailFieldProps) {
  const meta = getFieldMeta(answerId);
  const { data, setField } = useCandidateForm();
  const answer = (data as Record<string, unknown>)[answerId] as
    | boolean
    | undefined;

  function handleChange(next: boolean) {
    setField(answerId, next);
    if (!next) {
      for (const detailId of detailIds) {
        setField(detailId, "");
      }
    }
  }

  return (
    <div data-testid={`yesno-${answerId}`}>
      <div className={styles.yesNoRow}>
        <span
          className={
            meta.pocRequired === "required"
              ? `${styles.yesNoLabel} ${styles.labelRequired}`
              : styles.yesNoLabel
          }
        >
          {meta.label}
        </span>
        <div className={styles.yesNoOptions}>
          <label className={styles.yesNoOption}>
            <input
              type="radio"
              name={answerId}
              aria-label={`${meta.label}: Yes`}
              checked={answer === true}
              onChange={() => handleChange(true)}
            />
            Yes
          </label>
          <label className={styles.yesNoOption}>
            <input
              type="radio"
              name={answerId}
              aria-label={`${meta.label}: No`}
              checked={answer === false}
              onChange={() => handleChange(false)}
            />
            No
          </label>
        </div>
      </div>
      {answer === true && detailIds.length > 0 && (
        <div className={styles.detail}>
          {detailIds.map((detailId) => (
            <TextInputField key={detailId} id={detailId} />
          ))}
        </div>
      )}
    </div>
  );
}
