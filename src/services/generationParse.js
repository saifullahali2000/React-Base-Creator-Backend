import { jsonrepair } from 'jsonrepair';

export function getParseRetryAttempts() {
  const raw = process.env.AI_PARSE_RETRIES ?? process.env.CLAUDE_PARSE_RETRIES ?? '3';
  return Math.min(5, Math.max(1, parseInt(raw, 10) || 3));
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function stripJsonFences(rawText) {
  return rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function parseGeneratedPayload(text, meta = {}) {
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(jsonrepair(text));
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON object found in model response.');
      try {
        return JSON.parse(jsonrepair(match[0]));
      } catch (e2) {
        const hint =
          /Unterminated|Unexpected end/i.test(String(e2.message))
            ? ' Often caused by (a) output cut off at the token limit, or (b) an unescaped " inside a JSON string (e.g. in JSX).'
            : '';
        const usage =
          meta.outputTokens != null
            ? ` (output_tokens=${meta.outputTokens}, stop_reason=${meta.stopReason ?? '?'})`
            : '';
        throw new Error(`Failed to parse model response as JSON (${e2.message}).${hint}${usage}`);
      }
    }
  }
}
