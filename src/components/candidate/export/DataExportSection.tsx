"use client";

import { useState } from "react";
import { useCandidateForm } from "../FormContext";
import { getFinalPdfBlockers } from "@/lib/review/classify";
import { downloadBlob, filenameFromResponse } from "./download";
import styles from "./PdfExportSection.module.css";

type Format = "csv" | "xlsx";
type Status = "idle" | "csv-loading" | "xlsx-loading" | "error";

/**
 * CSV/XLSX export — unlike the PDF, these are never blocked by
 * incompleteness (per S06/S08, "draft exports remain possible"). The
 * response's filename (and an export_status column/row) already say
 * "draft" when the application isn't complete yet.
 */
export function DataExportSection() {
  const { data, fieldSources } = useCandidateForm();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const isDraft = getFinalPdfBlockers(data, fieldSources).length > 0;

  async function requestExport(format: Format) {
    setStatus(format === "csv" ? "csv-loading" : "xlsx-loading");
    setError(null);
    try {
      const response = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateData: data }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Export failed. Please try again.");
        setStatus("error");
        return;
      }
      const blob = await response.blob();
      downloadBlob(
        blob,
        filenameFromResponse(response, `candidate-application.${format}`),
      );
      setStatus("idle");
    } catch {
      setError("Export failed. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.buttonRow}>
        <button
          type="button"
          disabled={status !== "idle"}
          onClick={() => requestExport("csv")}
        >
          {status === "csv-loading" ? "Preparing CSV…" : "Download CSV"}
        </button>
        <button
          type="button"
          disabled={status !== "idle"}
          onClick={() => requestExport("xlsx")}
        >
          {status === "xlsx-loading" ? "Preparing XLSX…" : "Download XLSX"}
        </button>
      </div>
      {isDraft && (
        <p className={styles.hint}>
          The application isn&apos;t complete yet — this export will be
          labeled &quot;draft&quot;.
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
