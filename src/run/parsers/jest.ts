import { counts, summary } from './text.js';
export function parseJest(output: string) {
  const line = summary(output, /^\s*Tests:\s+.*\d+ total\s*$/);
  return line ? counts(line, Number(/(\d+) total/.exec(line)?.[1])) : undefined;
}
