import type { Hunk } from '../rules/types.js';

/** Parse hunk bodies without relying on quoted Git path headers. */
export function parseUnifiedDiff(patch: string): Hunk[] {
  const hunks: Hunk[] = [];
  let hunk: Hunk | undefined;
  let oldLine = 0;
  let newLine = 0;
  let oldRemaining = 0;
  let newRemaining = 0;
  for (const line of patch.split('\n')) {
    const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (header) {
      oldLine = Number(header[1]);
      newLine = Number(header[3]);
      oldRemaining = Number(header[2] ?? 1);
      newRemaining = Number(header[4] ?? 1);
      hunk = { oldStart: oldLine, newStart: newLine, lines: [] };
      hunks.push(hunk);
    } else if (hunk && (oldRemaining > 0 || newRemaining > 0)) {
      const content = line.slice(1);
      if (line.startsWith('+')) {
        hunk.lines.push({ type: 'add', content, newLine: newLine++ });
        newRemaining--;
      } else if (line.startsWith('-')) {
        hunk.lines.push({ type: 'del', content, oldLine: oldLine++ });
        oldRemaining--;
      } else if (line.startsWith(' ')) {
        hunk.lines.push({
          type: 'ctx',
          content,
          oldLine: oldLine++,
          newLine: newLine++,
        });
        oldRemaining--;
        newRemaining--;
      }
    }
  }
  return hunks;
}

export function addedHunks(content: string): Hunk[] {
  if (!content) return [];
  const lines = content.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return [
    {
      oldStart: 0,
      newStart: 1,
      lines: lines.map((line, index) => ({
        type: 'add',
        content: line,
        newLine: index + 1,
      })),
    },
  ];
}
