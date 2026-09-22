"use client";

import { getFieldMeta } from "@/lib/schema";
import { useCandidateForm } from "../FormContext";
import styles from "./fields.module.css";

interface TextInputFieldProps {
  id: string;
  placeholder?: string;
}

/**
 * Renders text-like fields (text, multiline, identifier, email, text_list,
 * and the various date types) based on the field's type in the canonical
 * field map — one component covers every simple field instead of one
 * hand-written field per row.
 */
export function TextInputField({ id, placeholder }: TextInputFieldProps) {
  const meta = getFieldMeta(id);
  const { data, setField } = useCandidateForm();
  const value = (data as Record<string, unknown>)[id] as string | undefined;

  const inputType = meta.type === "email" ? "email" : "text";

  return (
    <label className={styles.field}>
      <span className={styles.label}>{meta.label}</span>
      {meta.type === "multiline" ? (
        <textarea
          className={styles.textarea}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(event) => setField(id, event.target.value)}
        />
      ) : (
        <input
          className={styles.input}
          type={inputType}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(event) => setField(id, event.target.value)}
        />
      )}
    </label>
  );
}
