/**
 * Neutralizes CSV/XLSX formula injection (OWASP "CSV Injection"): a cell
 * value starting with =, +, -, or @ can be interpreted as a formula by
 * Excel/Sheets when the file is opened, potentially executing arbitrary
 * commands. Prefixing with a single quote forces spreadsheet applications
 * to treat the cell as literal text while keeping the value human-readable.
 */
const DANGEROUS_LEADING_CHARS = new Set(["=", "+", "-", "@"]);

export function escapeFormulaInjection(value: string): string {
  if (value.length === 0) return value;
  if (DANGEROUS_LEADING_CHARS.has(value[0])) {
    return `'${value}`;
  }
  return value;
}
