import { createRule, finding } from './lib/create.js';
import { pairLines } from './lib/pairing.js';
import { isCodeTest } from './lib/patterns.js';
/** Balance nested calls and strings rather than stopping at the first closing parenthesis. */
function normalize(line: string, python: boolean): string | null {
  if (python) {
    const assertion = /^(\s*assert\s+.+?\s*==\s*)(.+)$/.exec(line);
    if (assertion?.[1]) return assertion[1] + '<ARG>';
  }
  const match = (
    python
      ? /\bassertEqual\s*\(/
      : /\.(?:toBe|toEqual|toStrictEqual|toHaveLength|toContain|toMatch|toBeCloseTo|toHaveBeenCalledWith)\s*\(/
  ).exec(line);
  if (!match) return null;
  const start = match.index + match[0].length;
  let argumentStart = python ? -1 : start;
  let depth = 1,
    quote = '',
    escaped = false;
  for (let i = start; i < line.length; i++) {
    const char = line[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
    } else if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '(' || char === '[' || char === '{') depth++;
    else if (python && char === ',' && depth === 1 && argumentStart < 0)
      argumentStart = i + 1;
    else if ((char === ')' || char === ']' || char === '}') && --depth === 0)
      return argumentStart >= 0
        ? line.slice(0, argumentStart) + '<ARG>' + line.slice(i)
        : null;
  }
  return null;
}
export default createRule(
  'expected-value-changed',
  'medium',
  'expected-changed',
  isCodeTest,
  (ctx) =>
    pairLines(
      ctx.file,
      (before, after) =>
        before !== after &&
        normalize(before, ctx.file.language === 'py') !== null &&
        normalize(before, ctx.file.language === 'py') ===
          normalize(after, ctx.file.language === 'py'),
    ).map(({ before, after }) => ({
      ...finding('expected-value-changed', 'expected-changed', ctx, after),
      before: before.content,
    })),
);
