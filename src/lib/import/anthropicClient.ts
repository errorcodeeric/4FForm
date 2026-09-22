import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

/** Server-only: never call this from client components. */
export function getAnthropicClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}
