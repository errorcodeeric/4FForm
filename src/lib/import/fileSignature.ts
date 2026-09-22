/**
 * Magic-byte checks so a file whose extension/MIME type merely claims to
 * be a PDF or DOCX is actually verified before we try to parse it — a
 * renamed or corrupted file fails fast with a clear message instead of
 * reaching the parser (see S11: "MIME/signature checks").
 */

export function hasValidPdfSignature(buffer: Buffer): boolean {
  return (
    buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-"
  );
}

/** DOCX is a ZIP archive; every ZIP begins with the local-file-header signature "PK\x03\x04". */
export function hasValidDocxSignature(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

export function hasValidSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "application/pdf") return hasValidPdfSignature(buffer);
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return hasValidDocxSignature(buffer);
  }
  return false;
}
