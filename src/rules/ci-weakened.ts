import { createRule, finding } from './lib/create.js';
const checks =
  /\b(?:test|lint|tsc|typecheck|type-check|pytest|mypy|pyright|vitest|jest|eslint)\b/;
const runCommand = (line: string): string | undefined =>
  /\brun:\s*(.*)/.exec(line)?.[1]?.trim();
export default createRule(
  'ci-weakened',
  'high',
  'ci-weakened',
  (file) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(file.path),
  (ctx) => {
    if (ctx.file.status === 'deleted')
      return [finding('ci-weakened', 'ci-weakened', ctx)];
    return ctx.file.hunks.flatMap((hunk) =>
      hunk.lines
        .filter((line) => {
          if (line.type === 'add')
            return (
              /\bcontinue-on-error:\s*true\b|\bif:\s*(?:false\b|\$\{\{\s*false\s*\}\})/.test(
                line.content,
              ) ||
              (runCommand(line.content) !== undefined &&
                /\|\|\s*true\b/.test(line.content) &&
                !hunk.lines.some(
                  (old) =>
                    old.type === 'del' &&
                    old.content.trim() === line.content.trim(),
                ))
            );
          const command = runCommand(line.content);
          return (
            line.type === 'del' &&
            command !== undefined &&
            checks.test(command) &&
            !hunk.lines.some(
              (next) =>
                next.type === 'add' && runCommand(next.content) === command,
            )
          );
        })
        .map((line) => finding('ci-weakened', 'ci-weakened', ctx, line)),
    );
  },
);
