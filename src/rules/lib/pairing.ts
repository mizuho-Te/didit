import type { DiffLine, FileDiff } from '../types.js';
export interface LinePair {
  before: DiffLine;
  after: DiffLine;
}
/** Pair only changed lines within a single hunk, using their changed-line distance. */
export function pairLines(
  file: FileDiff,
  matches: (before: string, after: string) => boolean,
): LinePair[] {
  return file.hunks.flatMap((hunk) => {
    const changed = hunk.lines.filter((line) => line.type !== 'ctx');
    const used = new Set<DiffLine>();
    const pairs: LinePair[] = [];
    for (const [index, before] of changed.entries()) {
      if (before.type !== 'del') continue;
      const candidates = changed
        .map((after, position) => ({
          after,
          distance: Math.abs(position - index),
        }))
        .filter(
          ({ after, distance }) =>
            after.type === 'add' &&
            distance <= 3 &&
            !used.has(after) &&
            matches(before.content, after.content),
        )
        .sort((a, b) => a.distance - b.distance);
      const candidate = candidates[0];
      if (candidate) {
        used.add(candidate.after);
        pairs.push({ before, after: candidate.after });
      }
    }
    return pairs;
  });
}
