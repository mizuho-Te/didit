import { z } from 'zod';
import { messages, resolveLanguage } from './i18n/index.js';

export const optionsSchema = z.object({
  base: z.string().optional(),
  head: z.string().optional(),
  staged: z.boolean().default(false),
  format: z.enum(['text', 'json', 'markdown']).default('text'),
  failOn: z.enum(['high', 'medium', 'low', 'none']).optional(),
  lang: z.enum(['en', 'ja']).optional(),
  quiet: z.boolean().default(false),
  color: z.boolean().default(true),
  run: z.string().optional(),
  baseRun: z.boolean().default(true),
  junit: z.string().optional(),
  timeout: z.coerce.number().positive().optional(),
  handoff: z.boolean().default(false),
  goal: z.string().optional(),
  outDir: z.string().default('.didit'),
  config: z.string().optional(),
});
export type Options = z.infer<typeof optionsSchema>;
export interface Invocation {
  command: 'check' | 'rules' | 'init' | 'hook' | 'help' | 'version';
  target?: string;
  options: Options;
}
const values: Record<string, string> = {
  '--base': 'base',
  '--head': 'head',
  '--format': 'format',
  '--fail-on': 'failOn',
  '--lang': 'lang',
  '--run': 'run',
  '--junit': 'junit',
  '--timeout': 'timeout',
  '--goal': 'goal',
  '--out-dir': 'outDir',
  '--config': 'config',
};
const flags: Record<string, readonly [string, boolean]> = {
  '--staged': ['staged', true],
  '--quiet': ['quiet', true],
  '--no-color': ['color', false],
  '--no-base-run': ['baseRun', false],
  '--handoff': ['handoff', true],
};
export function parseOptions(args: readonly string[]): Invocation {
  const languageIndex = args.indexOf('--lang');
  const text = messages(
    resolveLanguage(languageIndex < 0 ? undefined : args[languageIndex + 1]),
  );
  const input: Record<string, unknown> = {};
  let command: Invocation['command'] = 'check';
  let target: string | undefined;
  let commandSeen = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === '--help' || arg === '-h') {
      command = 'help';
      continue;
    }
    if (arg === '--version' || arg === '-V') {
      command = 'version';
      continue;
    }
    const equals = arg.indexOf('=');
    const key = equals < 0 ? arg : arg.slice(0, equals);
    const valueKey = values[key];
    if (valueKey !== undefined) {
      const value = equals < 0 ? args[++i] : arg.slice(equals + 1);
      if (value === undefined || value === '')
        throw new Error(`${text.missingValue}: ${key}`);
      input[valueKey] = value;
      continue;
    }
    const flag = flags[arg];
    if (flag !== undefined) {
      input[flag[0]] = flag[1];
      continue;
    }
    if (!commandSeen && ['check', 'rules', 'init', 'hook'].includes(arg)) {
      command = z.enum(['check', 'rules', 'init', 'hook']).parse(arg);
      commandSeen = true;
      continue;
    }
    if (
      (command === 'init' || command === 'hook') &&
      target === undefined &&
      !arg.startsWith('-')
    ) {
      target = arg;
      continue;
    }
    throw new Error(`${text.invalidOption}: ${arg}`);
  }
  const result = optionsSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      `${text.invalidOption}: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  if (result.data.staged && result.data.head !== undefined)
    throw new Error(text.incompatible);
  return {
    command,
    ...(target === undefined ? {} : { target }),
    options: result.data,
  };
}
