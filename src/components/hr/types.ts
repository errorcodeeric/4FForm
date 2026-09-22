import type { CandidateData, OfficialUseData } from "@/lib/schema";
import type { FieldSourceMeta } from "@/components/candidate/FormContext";

export type HrRecordStatus = "extracting" | "success" | "error";

export interface HrRecord {
  readonly id: string;
  readonly fileName: string;
  readonly status: HrRecordStatus;
  readonly errorMessage?: string;
  readonly candidateData: Partial<CandidateData>;
  readonly officialData: Partial<OfficialUseData>;
  readonly fieldSources: Readonly<Record<string, FieldSourceMeta>>;
}
