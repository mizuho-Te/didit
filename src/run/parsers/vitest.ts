import { counts, summary } from './text.js';
export function parseVitest(output: string) {
  const line = summary(output, /^\s*Tests\s+.*\(\d+\)\s*$/);
  return line
    ? counts(line, Number(/\((\d+)\)\s*$/.exec(line)?.[1]))
    : undefined;
}
