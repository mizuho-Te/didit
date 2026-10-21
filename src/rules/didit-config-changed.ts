import { ZodError } from 'zod';
import { ruleConfigDetails as en } from '../i18n/en.js';
import { ruleConfigDetails as ja } from '../i18n/ja.js';
import { createRule, finding } from './lib/create.js';
import { jsonObject, objectValue } from './lib/json.js';
const rank: Record<string, number> = { low: 0, medium: 1, high: 2, none: 3 };
export default createRule(
  'didit-config-changed',
  'medium',
  'didit-config',
  (file) => file.path === '.didit.json' || file.oldPath === '.didit.json',
  async (ctx) => {
    const base = await ctx.getBaseContent();
    const current = await ctx.getCurrentContent();
    const messages = ctx.lang === 'ja' ? ja : en;
    const details: string[] = [messages[ctx.file.status]];
    try {
      const before = jsonObject(base);
      const after = jsonObject(current);
      const oldRules = objectValue(before.rules),
        newRules = objectValue(after.rules);
      for (const [key, value] of Object.entries(newRules))
        if (value === 'off' && oldRules[key] !== 'off')
          details.push(`rules.${key}: off`);
      if (
        typeof after.failOn === 'string' &&
        (rank[after.failOn] ?? -1) >
          (rank[typeof before.failOn === 'string' ? before.failOn : 'high'] ??
            2)
      )
        details.push(
          `failOn: ${typeof before.failOn === 'string' ? before.failOn : 'high'} → ${after.failOn}`,
        );
      if (Array.isArray(after.ignore)) {
        const previous: unknown[] = Array.isArray(before.ignore)
          ? before.ignore
          : [];
        const added: unknown[] = after.ignore.filter(
          (item: unknown) =>
            !previous.some(
              (old: unknown) => JSON.stringify(old) === JSON.stringify(item),
            ),
        );
        if (added.length) details.push(`ignore: ${JSON.stringify(added)}`);
      }
    } catch (error: unknown) {
      if (!(error instanceof SyntaxError) && !(error instanceof ZodError))
        throw error;
      details.push(messages.parseFailure);
    }
    return [
      finding('didit-config-changed', 'didit-config', ctx, undefined, {
        detail: details.join('; '),
      }),
    ];
  },
);
