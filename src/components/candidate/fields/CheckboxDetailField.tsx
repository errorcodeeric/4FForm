"use client";

import { getFieldMeta } from "@/lib/schema";
import { useCandidateForm } from "../FormContext";
import { TextInputField } from "./TextInputField";
import styles from "./fields.module.css";

interface CheckboxDetailFieldProps {
  id: string;
  /** Detail field IDs revealed (and required) only when this checkbox is checked. */
  detailIds?: readonly string[];
}

/**
 * A checkbox (vacancy-source style boolean) with zero or more detail
 * fields that only appear once checked. Unchecking clears any previously
 * entered detail values.
 */
export function CheckboxDetailField({
  id,
  detailIds = [],
}: CheckboxDetailFieldProps) {
  const meta = getFieldMeta(id);
  const { data, setField } = useCandidateForm();
  const checked = Boolean((data as Record<string, unknown>)[id]);

  function handleChange(next: boolean) {
    setField(id, next);
    if (!next) {
      for (const detailId of detailIds) {
        setField(detailId, "");
      }
    }
  }

  return (
    <div data-testid={`checkbox-${id}`}>
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => handleChange(event.target.checked)}
        />
        <span>{meta.label}</span>
      </label>
      {checked && detailIds.length > 0 && (
        <div className={styles.detail}>
          {detailIds.map((detailId) => (
            <TextInputField key={detailId} id={detailId} />
          ))}
        </div>
      )}
    </div>
  );
}
