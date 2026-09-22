"use client";

import { useState } from "react";
import { useCandidateForm } from "../FormContext";
import { getFinalPdfBlockers } from "@/lib/review/classify";
import { downloadBlob } from "./download";
import styles from "./PdfExportSection.module.css";

type Status = "idle" | "loading" | "error";

interface Warning {
  readonly fieldId: string;
  readonly message: string;
}

export function PdfExportSection() {
  const { data, fieldSources } = useCandidateForm();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<readonly Warning[]>([]);

  const blockers = getFinalPdfBlockers(data, fieldSources);
  const isReady = blockers.length === 0;

  async function requestExport(confirmTruncation: boolean) {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateData: data, confirmTruncation }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          body?.error ??
            "Some fields are still missing — see the Review section above.",
        );
        setStatus("error");
        return;
      }

      if (contentType.includes("application/pdf")) {
        const blob = await response.blob();
        downloadBlob(blob, "employment-application.pdf");
        setWarnings([]);
        setStatus("idle");
        return;
      }

      const body = await response.json();
      setWarnings(body.warnings ?? []);
      setStatus("idle");
    } catch {
      setError("Export failed. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        disabled={!isReady || status === "loading"}
        onClick={() => requestExport(false)}
      >
        {status === "loading" ? "Preparing PDF…" : "Download completed PDF"}
      </button>
      {!isReady && (
        <p className={styles.hint}>
          Complete the Review section above before downloading the PDF.
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {warnings.length > 0 && (
        <div className={styles.warning}>
          <p>
            Some values were too long and were shortened to fit the form:
          </p>
          <ul>
            {warnings.map((w) => (
              <li key={w.fieldId}>{w.message}</li>
            ))}
          </ul>
          <button type="button" onClick={() => requestExport(true)}>
            Download anyway
          </button>
        </div>
      )}
    </div>
  );
}
