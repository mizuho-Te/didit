import { createRule, finding } from './lib/create.js';
export default createRule(
  'snapshot-updated',
  'low',
  'expected-changed',
  (file) =>
    /(?:^|\/)__snapshots__\//.test(file.path) || file.path.endsWith('.snap'),
  (ctx) => {
    const lines = ctx.file.hunks
      .flatMap((hunk) => hunk.lines)
      .filter((line) => line.type !== 'ctx').length;
    return lines || ctx.file.status !== 'renamed'
      ? [
          finding('snapshot-updated', 'expected-changed', ctx, undefined, {
            lines,
          }),
        ]
      : [];
  },
);
