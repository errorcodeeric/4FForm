"use client";

import { getFieldMeta } from "@/lib/schema";
import { useCandidateForm } from "../FormContext";
import styles from "./fields.module.css";

interface CheckboxFieldProps {
  id: string;
}

export function CheckboxField({ id }: CheckboxFieldProps) {
  const meta = getFieldMeta(id);
  const { data, setField } = useCandidateForm();
  const checked = Boolean((data as Record<string, unknown>)[id]);

  return (
    <label className={styles.checkboxRow}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => setField(id, event.target.checked)}
      />
      <span className={meta.pocRequired === "required" ? styles.labelRequired : undefined}>
        {meta.label}
      </span>
    </label>
  );
}
