import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, type ParseError } from 'jsonc-parser';
import { z } from 'zod';
import { configMessages } from './i18n/config-messages.js';
import { resolveLanguage } from './i18n/index.js';
import type { Options } from './options.js';
import type { Language } from './rules/types.js';

export const knownRuleIds = [
  'test-skip-added',
  'test-only-added',
  'py-test-skip-added',
  'test-file-deleted',
  'test-case-removed',
  'assertion-count-decreased',
  'assertion-weakened',
  'expected-value-changed',
  'snapshot-updated',
  'ts-suppress-added',
  'any-added',
  'lint-disable-added',
  'py-suppress-added',
  'tsconfig-loosened',
  'test-script-weakened',
  'coverage-threshold-lowered',
  'ci-weakened',
  'empty-catch-added',
  'test-env-branch-added',
  'didit-config-changed',
  'run-tests-failing',
  'run-test-count-decreased',
  'run-skipped-increased',
] as const;
const ruleId = z.enum(knownRuleIds);
export const configSchema = z.strictObject({
  failOn: z.enum(['high', 'medium', 'low', 'none']).default('high'),
  run: z.string().trim().min(1).optional(),
  junit: z.string().min(1).optional(),
  lang: z.enum(['en', 'ja']).optional(),
  exclude: z.array(z.string().min(1)).default([]),
  testFilePatterns: z.array(z.string().min(1)).default([]),
  rules: z
    .partialRecord(ruleId, z.enum(['high', 'medium', 'low', 'off']))
    .default({}),
  ignore: z
    .array(
      z.strictObject({
        rule: ruleId,
        path: z.string().min(1),
        reason: z.string().trim().min(1),
      }),
    )
    .default([]),
  maxFileSizeKb: z.number().positive().default(1024),
  timeoutSec: z.number().positive().default(600),
  baseRun: z
    .strictObject({
      enabled: z.boolean().default(true),
      linkDirs: z
        .array(z.string().min(1))
        .default(['node_modules', '.venv', 'venv']),
      setup: z.string().trim().min(1).nullable().default(null),
    })
    .prefault({}),
});
export type Config = z.infer<typeof configSchema>;
export type IgnoreEntry = Config['ignore'][number];

export async function loadConfig(
  root: string,
  explicitPath?: string,
  lang: Language = resolveLanguage(),
): Promise<Config> {
  const target =
    explicitPath === undefined
      ? path.join(root, '.didit.json')
      : path.resolve(root, explicitPath);
  const text = configMessages(lang);
  let source: string;
  try {
    source = await readFile(target, 'utf8');
  } catch (error: unknown) {
    if (
      explicitPath === undefined &&
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    )
      return configSchema.parse({});
    throw new Error(`${text.unreadable}: ${target}`, { cause: error });
  }
  const errors: ParseError[] = [];
  const value: unknown = parse(source, errors, { allowTrailingComma: true });
  if (errors.length) {
    const offset = errors[0]?.offset ?? 0;
    const prefix = source.slice(0, offset).split('\n');
    throw new Error(
      `${text.invalid}: ${target}: $: ${text.syntax} ${String(prefix.length)}:${String((prefix.at(-1)?.length ?? 0) + 1)}`,
    );
  }
  const result = configSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      `${text.invalid}: ${target}: ${result.error.issues.map((issue) => `${issue.path.join('.') || '$'} (${issue.code}${issue.code === 'unrecognized_keys' ? `: ${issue.keys.join(', ')}` : ''})`).join('; ')}`,
    );
  const override = result.data.rules['didit-config-changed'];
  if (override === 'off')
    throw new Error(
      `${text.invalid}: rules.didit-config-changed: ${text.protectedRule}`,
    );
  return result.data;
}

export function resolveConfig(options: Options, config: Config) {
  return {
    ...config,
    lang: resolveLanguage(options.lang, config.lang),
    failOn: options.failOn ?? config.failOn,
    run: options.run ?? config.run,
    junit: options.junit ?? config.junit,
    timeoutSec: options.timeout ?? config.timeoutSec,
    baseRun: {
      ...config.baseRun,
      enabled: options.baseRun && config.baseRun.enabled,
    },
  };
}
