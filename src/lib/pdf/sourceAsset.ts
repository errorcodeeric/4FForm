import { readFile } from "node:fs/promises";
import path from "node:path";

let cachedBytes: Uint8Array | null = null;

/**
 * Loads the immutable source PDF bundled at build time. Node-runtime only.
 * Cached in memory per server instance — this is a static asset, not
 * per-request state, so caching it doesn't conflict with the transient-data
 * policy (no candidate data is cached here).
 */
export async function loadSourcePdfBytes(): Promise<Uint8Array> {
  if (cachedBytes) return cachedBytes;
  const filePath = path.join(
    process.cwd(),
    "src/assets/4FS_Employment_Application_Form.pdf",
  );
  const buffer = await readFile(filePath);
  cachedBytes = new Uint8Array(buffer);
  return cachedBytes;
}
