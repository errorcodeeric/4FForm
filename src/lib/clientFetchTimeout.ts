/**
 * Client-side timeout for processing requests (imports/exports), slightly
 * above the server's own Anthropic request timeout so a stalled upstream
 * call surfaces as a clear server-side error before the browser's own
 * request just hangs indefinitely (S11: "timeouts").
 */
export const PROCESSING_FETCH_TIMEOUT_MS = 65_000;
