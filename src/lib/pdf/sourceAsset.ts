import { SOURCE_PDF_BASE64 } from "@/assets/sourcePdfBase64.generated";

let cachedBytes: Uint8Array | null = null;

/**
 * The immutable source PDF, bundled as a base64-encoded ES module
 * (`src/assets/sourcePdfBase64.generated.ts`) rather than read from disk
 * at runtime — a genuine `import` is unconditionally included by the
 * bundler, removing any dependency on Next.js/Vercel's build-time file
 * tracing correctly detecting a runtime `fs.readFile` call (see
 * docs/SESSION_LOG.md, S13). Regenerate that file if the source PDF ever
 * changes (it must not, per its own "immutable source asset" status, but
 * if the file is ever legitimately replaced, re-run the base64 export).
 */
export async function loadSourcePdfBytes(): Promise<Uint8Array> {
  if (cachedBytes) return cachedBytes;
  cachedBytes = new Uint8Array(Buffer.from(SOURCE_PDF_BASE64, "base64"));
  return cachedBytes;
}
