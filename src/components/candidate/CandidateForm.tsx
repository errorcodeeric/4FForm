"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useCandidateForm } from "./FormContext";
import { ResumeImportSection } from "./import/ResumeImportSection";
import { LinkedInImportSection } from "./import/LinkedInImportSection";
import { FlatFieldsSection } from "./sections/FlatFieldsSection";
import { RepeatSection } from "./sections/RepeatSection";
import { OtherInformationSection } from "./sections/OtherInformationSection";
import { VacancySourceSection } from "./sections/VacancySourceSection";
import { DeclarationSection } from "./sections/DeclarationSection";
import { ReviewSection } from "./sections/ReviewSection";
import { PdfExportSection } from "./export/PdfExportSection";
import styles from "./CandidateForm.module.css";

export function CandidateForm() {
  const { isDirty } = useCandidateForm();

  function handleBackClick(event: MouseEvent) {
    if (
      isDirty &&
      !window.confirm(
        "You have unsaved changes. Leave this page and discard them?",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link
          href="/"
          onClick={handleBackClick}
          className={styles.backLink}
        >
          &larr; Back
        </Link>
        <h1 className={styles.title}>Candidate application</h1>
        <p className={styles.subtitle}>
          Nothing here is saved until you export — closing or reloading this
          page discards your edits.
        </p>
      </div>

      <ResumeImportSection />
      <LinkedInImportSection />

      <FlatFieldsSection title="Application" section="Application" />
      <FlatFieldsSection title="Personal Particulars" section="Personal" />
      <RepeatSection
        title="Education"
        section="Education"
        rowLabel={(row) => `Education ${row}`}
      />
      <RepeatSection
        title="Employment"
        section="Employment"
        rowLabel={(row) => (row === 1 ? "Current / most recent" : `Employment ${row}`)}
      />
      <RepeatSection
        title="References"
        section="References"
        rowLabel={(row) => `Reference ${row}`}
      />
      <FlatFieldsSection title="Languages" section="Languages" />
      <OtherInformationSection />
      <VacancySourceSection />
      <DeclarationSection />
      <ReviewSection />
      <PdfExportSection />
    </div>
  );
}
