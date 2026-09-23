import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

/**
 * The SDK's own default (10 minutes) is far longer than any request in
 * this app should ever legitimately take, and would otherwise leave a
 * serverless function hanging on a stalled upstream call — bounding it
 * keeps every processing route's own error handling in control instead
 * (S11: "timeouts"). Kept a few seconds under every calling route's own
 * `maxDuration = 60` (S13) so a timeout error can actually be returned
 * before Vercel kills the function outright.
 */
const REQUEST_TIMEOUT_MS = 50_000;

/** Server-only: never call this from client components. */
export function getAnthropicClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  cachedClient = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS });
  return cachedClient;
}
