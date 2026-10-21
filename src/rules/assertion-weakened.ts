import { createRule, finding } from './lib/create.js';
import { pairLines } from './lib/pairing.js';
import { isCodeTest } from './lib/patterns.js';
const strong =
  /\.(?:toBe|toEqual|toStrictEqual|toMatchObject|toHaveBeenCalledWith|toHaveLength)\s*\(|\.toThrow\s*\(\s*[^\s)]/;
const weak =
  /\.(?:toBeDefined|toBeTruthy|toHaveBeenCalled|toThrow)\s*\(\s*\)|\.not\.(?:toBeNull|toBeUndefined)\s*\(\s*\)|\bexpect\.anything\s*\(\s*\)/;
export default createRule(
  'assertion-weakened',
  'high',
  'assertion-weakened',
  isCodeTest,
  (ctx) =>
    pairLines(ctx.file, (before, after) =>
      ctx.file.language === 'py'
        ? /^\s*assert\s+.+\s*==\s*.+|\b(?:assertEqual|assertIn|assertRaises)\s*\(/.test(
            before,
          ) &&
          (/^\s*assert\s+(?!.*(?:[=!<>]=?|\bis\b|\bin\b)).+/.test(after) ||
            /\b(?:assertTrue|assertIsNotNone)\s*\(/.test(after))
        : strong.test(before) && weak.test(after),
    ).map(({ before, after }) => ({
      ...finding('assertion-weakened', 'assertion-weakened', ctx, after),
      before: before.content,
    })),
);
