"use client";

import { useState, type ChangeEvent } from "react";
import { useCandidateForm } from "../FormContext";
import { getFieldMeta } from "@/lib/schema";
import type { ExtractionResult } from "@/lib/import/types";
import styles from "./LinkedInImportSection.module.css";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 20_000;

type Mode = "file" | "paste";
type Status = "idle" | "loading" | "error";

interface DiffRow {
  readonly id: string;
  readonly label: string;
  readonly currentValue: string;
  readonly newValue: string;
  readonly isNew: boolean;
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function LinkedInImportSection() {
  const { data, mergeExtractionResult } = useCandidateForm();
  const [mode, setMode] = useState<Mode>("file");
  const [pastedText, setPastedText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [diffRows, setDiffRows] = useState<readonly DiffRow[] | null>(null);
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [pendingResult, setPendingResult] = useState<ExtractionResult | null>(
    null,
  );
  const [appliedCount, setAppliedCount] = useState(0);

  function beginRequest() {
    setError(null);
    setDiffRows(null);
    setPendingResult(null);
    setAppliedCount(0);
    setStatus("loading");
  }

  function handleResponseFields(result: ExtractionResult) {
    const rows: DiffRow[] = Object.entries(result).map(([id, field]) => {
      const current = (data as Record<string, unknown>)[id];
      const isEmpty =
        current === undefined || current === null || current === "";
      return {
        id,
        label: getFieldMeta(id).label,
        currentValue: displayValue(current),
        newValue: displayValue(field.value),
        isNew: isEmpty,
      };
    });
    setPendingResult(result);
    setDiffRows(rows);
    setCheckedIds(new Set(rows.filter((r) => r.isNew).map((r) => r.id)));
    setStatus("idle");
  }

  async function submit(formData: FormData) {
    try {
      const response = await fetch("/api/import/linkedin", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | { fields: ExtractionResult }
        | { error: string };

      if (!response.ok || "error" in payload) {
        setError(
          "error" in payload
            ? payload.error
            : "Import failed. Please try again.",
        );
        setStatus("error");
        return;
      }
      handleResponseFields(payload.fields);
    } catch {
      setError("Import failed. Please try again.");
      setStatus("error");
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is larger than the 5 MB limit.");
      setStatus("error");
      return;
    }
    beginRequest();
    const body = new FormData();
    body.append("file", file);
    await submit(body);
  }

  async function handlePasteSubmit() {
    if (!pastedText.trim()) return;
    if (pastedText.length > MAX_TEXT_CHARS) {
      setError(`Pasted text is limited to ${MAX_TEXT_CHARS} characters.`);
      setStatus("error");
      return;
    }
    beginRequest();
    const body = new FormData();
    body.append("text", pastedText);
    await submit(body);
  }

  function toggleRow(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applySelected() {
    if (!pendingResult) return;
    const selectedIds = [...checkedIds];
    const filtered: ExtractionResult = Object.fromEntries(
      selectedIds
        .filter((id) => id in pendingResult)
        .map((id) => [id, pendingResult[id]]),
    );
    const { applied } = mergeExtractionResult(filtered, "linkedin_user_export", {
      force: selectedIds,
    });
    setAppliedCount(applied.length);
    setDiffRows(null);
    setPendingResult(null);
  }

  function cancelReview() {
    setDiffRows(null);
    setPendingResult(null);
  }

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${mode === "file" ? styles.tabActive : ""}`}
          onClick={() => setMode("file")}
        >
          Upload LinkedIn export
        </button>
        <button
          type="button"
          className={`${styles.tab} ${mode === "paste" ? styles.tabActive : ""}`}
          onClick={() => setMode("paste")}
        >
          Paste profile text
        </button>
      </div>

      {mode === "file" ? (
        <label className={styles.label}>
          LinkedIn-exported PDF or resume (up to 5 MB)
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            disabled={status === "loading"}
          />
        </label>
      ) : (
        <label className={styles.label}>
          Paste the text of your LinkedIn profile (up to {MAX_TEXT_CHARS}{" "}
          characters)
          <textarea
            className={styles.textarea}
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            disabled={status === "loading"}
          />
          <button
            type="button"
            onClick={handlePasteSubmit}
            disabled={status === "loading" || !pastedText.trim()}
          >
            Review imported fields
          </button>
        </label>
      )}

      {status === "loading" && (
        <p className={styles.hint}>Reading your LinkedIn profile…</p>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {appliedCount > 0 && (
        <p className={styles.hint}>
          Applied {appliedCount} field{appliedCount === 1 ? "" : "s"} from
          LinkedIn.
        </p>
      )}

      {diffRows && diffRows.length > 0 && (
        <div>
          <p className={styles.hint}>
            Review what would change before applying. Fields with an
            existing value are unchecked by default.
          </p>
          <table className={styles.diffTable}>
            <thead>
              <tr>
                <th></th>
                <th>Field</th>
                <th>Current</th>
                <th>From LinkedIn</th>
              </tr>
            </thead>
            <tbody>
              {diffRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={checkedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`Apply ${row.label}`}
                    />
                  </td>
                  <td>{row.label}</td>
                  <td>{row.currentValue || <em>empty</em>}</td>
                  <td>{row.newValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.diffActions}>
            <button type="button" onClick={applySelected}>
              Apply selected fields
            </button>
            <button type="button" onClick={cancelReview}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className={styles.disclosure}>
        This does not connect to LinkedIn or read your account — you provide
        a file you exported yourself, or text you paste in. Your input is
        sent to our AI provider (Anthropic) to read it and is not stored by
        this app.
      </p>
    </div>
  );
}
