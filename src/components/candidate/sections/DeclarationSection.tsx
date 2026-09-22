"use client";

import { useCandidateForm } from "../FormContext";
import { CheckboxField } from "../fields/CheckboxField";
import { TextInputField } from "../fields/TextInputField";
import { Section } from "./Section";
import styles from "./sections.module.css";
import fieldStyles from "../fields/fields.module.css";

/**
 * Declaration acceptance, date, and signature. Per Scope & Decisions,
 * e-signature compliance is out of scope for this POC — only a typed
 * signature is offered here, explicitly labeled as a POC affordance (a
 * drawn-signature option can be added later without changing the schema,
 * since `applicant_signature` already supports both `kind`s).
 */
export function DeclarationSection() {
  const { data, setField } = useCandidateForm();
  const accepted = Boolean(
    (data as Record<string, unknown>).declaration_accepted,
  );
  const signature = data.applicant_signature;

  return (
    <Section title="Declaration">
      <p className={styles.hint}>
        I declare that the information given in this application is true
        and complete to the best of my knowledge.
      </p>
      <CheckboxField id="declaration_accepted" />
      {accepted && (
        <>
          <TextInputField id="declaration_date" placeholder="dd/mm/yyyy" />
          <label className={fieldStyles.field}>
            <span className={fieldStyles.label}>
              Signature of applicant (typed, POC only)
            </span>
            <input
              className={fieldStyles.input}
              type="text"
              value={signature?.typedText ?? ""}
              placeholder="Type your full name as your signature"
              onChange={(event) =>
                setField("applicant_signature", {
                  kind: "typed",
                  typedText: event.target.value,
                  capturedAt: new Date().toISOString(),
                })
              }
            />
          </label>
        </>
      )}
    </Section>
  );
}
