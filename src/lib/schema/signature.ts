import { z } from "zod";

/**
 * A signature is either drawn (captured as a PNG data URL for PDF overlay)
 * or typed (a POC affordance, per Scope & Decisions: e-signature compliance
 * is explicitly deferred). Per docs/FIELD_MAP.md, signature bytes must never
 * be placed in CSV/XLSX exports — only metadata (kind/capturedAt) is
 * exported; `imageDataUrl`/`typedText` are used for PDF overlay only.
 */
export const SignatureValueSchema = z.object({
  kind: z.enum(["drawn", "typed"]),
  imageDataUrl: z.string().optional(),
  typedText: z.string().optional(),
  capturedAt: z.string().optional(),
});

export type SignatureValue = z.infer<typeof SignatureValueSchema>;

export interface SignatureExportMetadata {
  readonly signaturePresent: boolean;
  readonly signatureKind?: "drawn" | "typed";
  readonly signatureCapturedAt?: string;
}

export function toSignatureExportMetadata(
  value: SignatureValue | undefined,
): SignatureExportMetadata {
  if (!value) {
    return { signaturePresent: false };
  }
  return {
    signaturePresent: true,
    signatureKind: value.kind,
    signatureCapturedAt: value.capturedAt,
  };
}
