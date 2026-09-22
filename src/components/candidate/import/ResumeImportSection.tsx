"use client";

import { useState, type ChangeEvent } from "react";
import { useCandidateForm } from "../FormContext";
import { getFieldMeta } from "@/lib/schema";
import type { ExtractionResult } from "@/lib/import/types";
import { PROCESSING_FETCH_TIMEOUT_MS } from "@/lib/clientFetchTimeout";
import styles from "./ResumeImportSection.module.css";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Status = "idle" | "loading" | "error";

export function ResumeImportSection() {
  const { mergeExtractionResult } = useCandidateForm();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ExtractionResult | null>(null);
  const [conflicts, setConflicts] = useState<readonly string[]>([]);
  const [appliedCount, setAppliedCount] = useState(0);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setConflicts([]);
    setLastResult(null);
    setAppliedCount(0);

    if (file.size > MAX_FILE_BYTES) {
      setError("That file is larger than the 5 MB limit.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/import/resume", {
        method: "POST",
        body,
        signal: AbortSignal.timeout(PROCESSING_FETCH_TIMEOUT_MS),
      });
      const payload = (await response.json()) as
        | { fields: ExtractionResult }
        | { error: string };

      if (!response.ok || "error" in payload) {
        setError(
          "error" in payload ? payload.error : "Import failed. Please try again.",
        );
        setStatus("error");
        return;
      }

      const { applied, conflicts: skipped } = mergeExtractionResult(
        payload.fields,
        "resume",
      );
      setLastResult(payload.fields);
      setAppliedCount(applied.length);
      setConflicts(skipped);
      setStatus("idle");
    } catch {
      setError("Import failed. Please try again.");
      setStatus("error");
    }
  }

  function handleOverwrite() {
    if (!lastResult) return;
    mergeExtractionResult(lastResult, "resume", { force: conflicts });
    setAppliedCount((count) => count + conflicts.length);
    setConflicts([]);
  }

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        Import from resume (PDF or DOCX, up to 5 MB)
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          disabled={status === "loading"}
        />
      </label>

      {status === "loading" && (
        <p className={styles.hint}>Reading your resume…</p>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {appliedCount > 0 && status !== "loading" && !error && (
        <p className={styles.hint}>
          Filled in {appliedCount} field{appliedCount === 1 ? "" : "s"} from
          your resume. Review everything below before continuing.
        </p>
      )}

      {conflicts.length > 0 && (
        <div className={styles.conflict}>
          <p>
            {conflicts.length} field{conflicts.length === 1 ? "" : "s"}{" "}
            already had a value and{" "}
            {conflicts.length === 1 ? "was" : "were"} not changed:{" "}
            {conflicts.map((id) => getFieldMeta(id).label).join(", ")}.
          </p>
          <button type="button" onClick={handleOverwrite}>
            Overwrite with resume values
          </button>
        </div>
      )}

      <p className={styles.disclosure}>
        Your resume is sent to our AI provider (Anthropic) to read it. It is
        not stored by this app — only the fields you approve stay on this
        page in your browser.
      </p>
    </div>
  );
}
