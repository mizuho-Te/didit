import { createRule, finding } from './lib/create.js';
import { isCode } from './lib/patterns.js';
export default createRule(
  'empty-catch-added',
  'medium',
  'error-swallowed',
  isCode,
  (ctx) =>
    ctx.file.hunks.flatMap((hunk) => {
      const result = [];
      for (const [index, line] of hunk.lines.entries()) {
        if (line.type !== 'add') continue;
        if (ctx.file.language === 'py') {
          const next = hunk.lines[index + 1];
          if (
            /^\s*except\b.*:\s*pass\s*(?:#.*)?$/.test(line.content) ||
            (/^\s*except\b.*:\s*(?:#.*)?$/.test(line.content) &&
              next?.type === 'add' &&
              /^\s*pass\s*(?:#.*)?$/.test(next.content))
          )
            result.push(
              finding('empty-catch-added', 'error-swallowed', ctx, line),
            );
          continue;
        }

        const content = line.content
          .replace(/\/\*.*?\*\//g, '')
          .replace(/\/\/.*$/, '');
        let empty =
          /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}|\.catch\(\s*\(\s*\w*\s*\)\s*=>\s*(?:\{\s*\}|undefined|null)\s*\)/.test(
            content,
          );
        if (/\bcatch\s*(?:\([^)]*\))?\s*\{\s*$/.test(content)) {
          const following: string[] = [];
          for (const next of hunk.lines.slice(index + 1)) {
            if (next.type !== 'add') break;
            following.push(next.content);
          }
          const clean = following
            .join('\n')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/[^\n]*/g, '');
          empty = /^\s*\}\s*;?(?:\s*$|\n)/.test(clean);
        }
        if (empty)
          result.push(
            finding('empty-catch-added', 'error-swallowed', ctx, line),
          );
      }
      return result;
    }),
);
