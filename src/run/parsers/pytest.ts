import { counts, summary } from './text.js';
export function parsePytest(output: string) {
  const line = summary(
    output,
    /^=+\s+.*\s+in\s+[\d.]+s(?:\s+\([^)]*\))?\s+=+$/,
  );
  return line ? counts(line) : undefined;
}
