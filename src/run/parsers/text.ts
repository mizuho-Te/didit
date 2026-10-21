import { stripVTControlCharacters } from 'node:util';
import type { RunResult } from '../../rules/types.js';
export type Counts = NonNullable<RunResult['counts']>;
export function summary(output: string, pattern: RegExp): string | undefined {
  return stripVTControlCharacters(output)
    .split(/\r?\n/)
    .filter((line) => pattern.test(line))
    .at(-1);
}
export function counts(line: string, total?: number): Counts | undefined {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let recognized = false;
  for (const match of line.matchAll(
    /(\d+)\s+(passed|failed|skipped|pending|todo|xfailed|xpassed|errors?|deselected)\b/g,
  )) {
    const count = Number(match[1]);
    recognized = true;
    switch (match[2]) {
      case 'passed':
      case 'xpassed':
        passed += count;
        break;
      case 'failed':
      case 'error':
      case 'errors':
        failed += count;
        break;
      case 'skipped':
      case 'pending':
      case 'todo':
      case 'xfailed':
        skipped += count;
        break;
    }
  }
  if (!recognized) return undefined;
  const sum = passed + failed + skipped;
  if (total !== undefined && total !== sum) return undefined;
  return { passed, failed, skipped, total: total ?? sum };
}
