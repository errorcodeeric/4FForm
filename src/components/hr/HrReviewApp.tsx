"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { HrRecordCard } from "./HrRecordCard";
import type { HrRecord } from "./types";
import { downloadBlob, filenameFromResponse } from "@/components/candidate/export/download";
import { PROCESSING_FETCH_TIMEOUT_MS } from "@/lib/clientFetchTimeout";
import styles from "./HrReviewApp.module.css";

interface ExtractedField {
  readonly value: string | boolean;
  readonly confidence: "high" | "medium" | "low";
}

function toRecordData(fields: Record<string, ExtractedField>) {
  const data: Record<string, unknown> = {};
  const sources: Record<string, { source: string; confidence: "high" | "medium" | "low" }> = {};
  for (const [id, field] of Object.entries(fields)) {
    data[id] = field.value;
    sources[id] = { source: "hr_scan", confidence: field.confidence };
  }
  return { data, sources };
}

let nextId = 0;

/** Caps a single batch so one selection can't fire an unbounded number of
 * concurrent extraction requests (S11: "enforce file count"). */
const MAX_BATCH_FILES = 10;

export function HrReviewApp() {
  const [records, setRecords] = useState<readonly HrRecord[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  function updateRecord(id: string, patch: Partial<HrRecord>) {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  async function extractOne(id: string, file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/hr/extract", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(PROCESSING_FETCH_TIMEOUT_MS),
      });
      const body = await response.json();

      if (response.ok && body.templateMatch) {
        const candidate = toRecordData(body.candidateFields ?? {});
        const official = toRecordData(body.officialFields ?? {});
        updateRecord(id, {
          status: "success",
          candidateData: candidate.data,
          officialData: official.data,
          fieldSources: { ...candidate.sources, ...official.sources },
        });
        return;
      }

      updateRecord(id, {
        status: "error",
        errorMessage:
          body.message ?? body.error ?? "Extraction failed for this file.",
      });
    } catch {
      updateRecord(id, {
        status: "error",
        errorMessage: "Extraction failed for this file.",
      });
    }
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    event.target.value = "";
    if (!files || files.length === 0) return;

    setBatchError(null);
    if (files.length > MAX_BATCH_FILES) {
      setBatchError(
        `Upload at most ${MAX_BATCH_FILES} files at a time (${files.length} selected).`,
      );
      return;
    }

    const newRecords: HrRecord[] = [...files].map((file) => ({
      id: `record-${nextId++}`,
      fileName: file.name,
      status: "extracting",
      candidateData: {},
      officialData: {},
      fieldSources: {},
    }));
    setRecords((prev) => [...prev, ...newRecords]);

    newRecords.forEach((record, index) => {
      void extractOne(record.id, files[index]);
    });
  }

  function handleEditCandidateField(
    recordId: string,
    fieldId: string,
    value: string | boolean,
  ) {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? { ...r, candidateData: { ...r.candidateData, [fieldId]: value } }
          : r,
      ),
    );
  }

  function handleEditOfficialField(
    recordId: string,
    fieldId: string,
    value: string | boolean,
  ) {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? { ...r, officialData: { ...r.officialData, [fieldId]: value } }
          : r,
      ),
    );
  }

  async function handleExport(format: "csv" | "xlsx") {
    setExporting(format);
    setExportError(null);
    try {
      const response = await fetch(`/api/hr/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: records
            .filter((r) => r.status !== "extracting")
            .map((r) => ({
              fileName: r.fileName,
              status: r.status,
              errorMessage: r.errorMessage,
              candidateData: r.candidateData,
              officialData: r.officialData,
            })),
        }),
        signal: AbortSignal.timeout(PROCESSING_FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setExportError(body?.error ?? "Export failed. Please try again.");
        return;
      }
      const blob = await response.blob();
      downloadBlob(
        blob,
        filenameFromResponse(response, `hr-batch-review.${format}`),
      );
    } catch {
      setExportError("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  const hasReviewableRecords = records.some((r) => r.status !== "extracting");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          &larr; Back
        </Link>
        <h1 className={styles.title}>HR review</h1>
        <p className={styles.subtitle}>
          Upload one or more completed copies of the 4FINGERS Employment
          Application Form. Each file is sent to our AI provider
          (Anthropic) to read it — nothing is stored by this app. Review
          and correct every field before exporting; a failed file doesn&apos;t
          affect the others.
        </p>
      </div>

      <div className={styles.uploadRow}>
        <label>
          <input
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFilesSelected}
          />
        </label>
        {batchError && <p className={styles.errorMessage}>{batchError}</p>}
      </div>

      {records.length > 0 && (
        <div className={styles.exportRow}>
          <button
            type="button"
            disabled={!hasReviewableRecords || exporting !== null}
            onClick={() => handleExport("csv")}
          >
            {exporting === "csv" ? "Preparing CSV…" : "Export reviewed CSV"}
          </button>
          <button
            type="button"
            disabled={!hasReviewableRecords || exporting !== null}
            onClick={() => handleExport("xlsx")}
          >
            {exporting === "xlsx" ? "Preparing XLSX…" : "Export reviewed XLSX"}
          </button>
        </div>
      )}
      {exportError && <p className={styles.errorMessage}>{exportError}</p>}

      <div className={styles.records}>
        {records.map((record) => (
          <HrRecordCard
            key={record.id}
            record={record}
            onEditCandidateField={handleEditCandidateField}
            onEditOfficialField={handleEditOfficialField}
          />
        ))}
      </div>
    </div>
  );
}
