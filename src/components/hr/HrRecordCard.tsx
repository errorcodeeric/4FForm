"use client";

import { getFieldMeta } from "@/lib/schema";
import { classifyFields } from "@/lib/review/classify";
import type { HrRecord } from "./types";
import styles from "./HrReviewApp.module.css";

interface FieldEditRowProps {
  readonly id: string;
  readonly value: unknown;
  readonly confidence?: "high" | "medium" | "low";
  readonly onChange: (id: string, value: string | boolean) => void;
}

function FieldEditRow({ id, value, confidence, onChange }: FieldEditRowProps) {
  const meta = getFieldMeta(id);
  const isBoolean = meta.type === "yes_no" || meta.type === "boolean";

  return (
    <label className={styles.fieldRow}>
      <span className={styles.fieldLabel}>
        {meta.label}
        {confidence === "low" && (
          <span className={styles.lowConfidence}> — low confidence</span>
        )}
      </span>
      {isBoolean ? (
        <select
          value={value === true ? "yes" : value === false ? "no" : ""}
          onChange={(event) =>
            onChange(
              id,
              event.target.value === "yes"
                ? true
                : event.target.value === "no"
                  ? false
                  : (undefined as unknown as boolean),
            )
          }
        >
          <option value="">—</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      ) : (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(id, event.target.value)}
        />
      )}
    </label>
  );
}

interface HrRecordCardProps {
  readonly record: HrRecord;
  readonly onEditCandidateField: (
    recordId: string,
    fieldId: string,
    value: string | boolean,
  ) => void;
  readonly onEditOfficialField: (
    recordId: string,
    fieldId: string,
    value: string | boolean,
  ) => void;
}

export function HrRecordCard({
  record,
  onEditCandidateField,
  onEditOfficialField,
}: HrRecordCardProps) {
  const statusClass =
    record.status === "extracting"
      ? styles.statusExtracting
      : record.status === "success"
        ? styles.statusSuccess
        : styles.statusError;

  const classification =
    record.status === "success"
      ? classifyFields(record.candidateData, record.fieldSources)
      : [];
  const missingCount = classification.filter(
    (f) => f.status === "missing",
  ).length;
  const lowConfidenceCount = Object.values(record.fieldSources).filter(
    (s) => s.confidence === "low",
  ).length;

  const candidateFieldIds = Object.keys(record.candidateData);
  const officialFieldIds = Object.keys(record.officialData);

  return (
    <div className={styles.card} data-testid="hr-record-card">
      <div className={styles.cardHeader}>
        <span className={styles.fileName}>{record.fileName}</span>
        <span className={`${styles.statusBadge} ${statusClass}`}>
          {record.status === "extracting"
            ? "Extracting…"
            : record.status === "success"
              ? "Extracted"
              : "Failed"}
        </span>
      </div>

      {record.status === "success" && (
        <p className={styles.summary}>
          {missingCount} missing, {lowConfidenceCount} need confirmation
        </p>
      )}
      {record.status === "error" && (
        <p className={styles.errorMessage}>{record.errorMessage}</p>
      )}

      {record.status === "success" && (
        <div className={styles.sections}>
          <div className={styles.candidateSection}>
            <div className={styles.sectionTitle}>Candidate fields</div>
            {candidateFieldIds.length === 0 ? (
              <p className={styles.empty}>Nothing extracted.</p>
            ) : (
              candidateFieldIds.map((id) => (
                <FieldEditRow
                  key={id}
                  id={id}
                  value={(record.candidateData as Record<string, unknown>)[id]}
                  confidence={record.fieldSources[id]?.confidence}
                  onChange={(fieldId, value) =>
                    onEditCandidateField(record.id, fieldId, value)
                  }
                />
              ))
            )}
          </div>
          <div className={styles.officialSection}>
            <div className={styles.sectionTitle}>
              For official use only
            </div>
            {officialFieldIds.length === 0 ? (
              <p className={styles.empty}>Nothing extracted.</p>
            ) : (
              officialFieldIds.map((id) => (
                <FieldEditRow
                  key={id}
                  id={id}
                  value={(record.officialData as Record<string, unknown>)[id]}
                  confidence={record.fieldSources[id]?.confidence}
                  onChange={(fieldId, value) =>
                    onEditOfficialField(record.id, fieldId, value)
                  }
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
