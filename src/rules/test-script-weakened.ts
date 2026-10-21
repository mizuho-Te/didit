import { createRule, finding } from './lib/create.js';
import { addedLines } from './lib/patterns.js';
import { jsonObject, objectValue } from './lib/json.js';
const weakening = [
  /--passWithNoTests\b/,
  /\|\|\s*true\b/,
  /\|\|\s*exit\s+0\b/,
  /;\s*exit\s+0\b/,
  /--testPathIgnorePatterns\b/,
  /--exclude\b/,
  /--bail=0\b/,
];
export default createRule(
  'test-script-weakened',
  'high',
  'config-weakened',
  (file) =>
    /(?:^|\/)(?:package\.json|pyproject\.toml|pytest\.ini|setup\.cfg|tox\.ini)$/.test(
      file.path,
    ),
  async (ctx) => {
    if (!ctx.file.path.endsWith('package.json'))
      return addedLines(ctx.file)
        .filter((line) =>
          /--deselect\b|--ignore=|-p\s+no:|\baddopts\b.*-k\s/.test(
            line.content,
          ),
        )
        .map((line) =>
          finding('test-script-weakened', 'config-weakened', ctx, line),
        );
    const before = objectValue(jsonObject(await ctx.getBaseContent()).scripts);
    const after = objectValue(
      jsonObject(await ctx.getCurrentContent()).scripts,
    );
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...keys]
      .filter((key) => {
        if (key !== 'test' && !key.startsWith('test:')) return false;
        const old = before[key],
          next = after[key];
        if (typeof old === 'string' && next === undefined) return true;
        if (typeof next !== 'string' || old === next) return false;
        return (
          weakening.some(
            (pattern) =>
              pattern.test(next) &&
              (typeof old !== 'string' || !pattern.test(old)),
          ) || /^(?:echo\b[^;&|]*|exit\s+0)\s*;?\s*$/.test(next.trim())
        );
      })
      .map((key) => ({
        ...finding('test-script-weakened', 'config-weakened', ctx),
        ...(typeof before[key] === 'string' ? { before: before[key] } : {}),
        ...(typeof after[key] === 'string' ? { after: after[key] } : {}),
      }));
  },
);
