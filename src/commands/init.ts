import {
  lstat,
  mkdir,
  readFile,
  realpath,
  writeFile,
  rename,
  rm,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { git, GitError } from '../git/exec.js';
import { integrationMessages } from '../i18n/integration-messages.js';
import { resolveLanguage } from '../i18n/index.js';
import type { Language } from '../rules/types.js';

const start = '<!-- didit:start -->';
const end = '<!-- didit:end -->';
const command = 'npx --no-install didit hook claude';
const settingsSchema = z.looseObject({
  hooks: z
    .looseObject({
      Stop: z
        .array(
          z.looseObject({
            hooks: z.array(
              z.looseObject({
                type: z.string(),
                command: z.string().optional(),
              }),
            ),
          }),
        )
        .optional(),
    })
    .optional(),
});

function missing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
async function safeTarget(
  root: string,
  relative: string,
  lang: Language,
): Promise<string> {
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error(integrationMessages(lang).unsafePath);
    } catch (error: unknown) {
      if (!missing(error)) throw error;
    }
  }
  return current;
}
async function readOptional(target: string): Promise<string> {
  try {
    return await readFile(target, 'utf8');
  } catch (error: unknown) {
    if (missing(error)) return '';
    throw error;
  }
}
async function replaceFile(target: string, content: string): Promise<void> {
  const temporary = `${target}.${randomUUID()}.tmp`;
  let mode: number | undefined;
  try {
    mode = (await lstat(target)).mode & 0o777;
  } catch (error: unknown) {
    if (!missing(error)) throw error;
  }
  try {
    await writeFile(temporary, content, {
      flag: 'wx',
      ...(mode === undefined ? {} : { mode }),
    });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}
function newline(source: string): string {
  return source.includes('\r\n') ? '\r\n' : '\n';
}
function instructions(source: string, lang: Language): string {
  const eol = newline(source);
  const block = `${start}${eol}${integrationMessages(lang).instructions}${eol}${end}`;
  const markers = [...source.matchAll(/<!-- didit:(start|end) -->/g)];
  if (markers.length === 0)
    return (
      source +
      (source && !source.endsWith('\n') ? eol : '') +
      (source ? eol : '') +
      block +
      eol
    );
  let result = '',
    cursor = 0;
  for (let i = 0; i < markers.length; i += 2) {
    const opening = markers[i],
      closing = markers[i + 1];
    if (opening?.[1] !== 'start' || closing?.[1] !== 'end')
      throw new Error(integrationMessages(lang).invalidMarkers);
    result += source.slice(cursor, opening.index) + block;
    cursor = closing.index + end.length;
  }
  return result + source.slice(cursor);
}
async function initializeClaude(target: string, lang: Language): Promise<void> {
  let source: string;
  try {
    source = await readFile(target, 'utf8');
  } catch (error: unknown) {
    if (!missing(error)) throw error;
    source = '{}';
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error(integrationMessages(lang).invalidSettings);
  }
  const parsed = settingsSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(integrationMessages(lang).invalidSettings);
  const settings = parsed.data;
  const stop = settings.hooks?.Stop ?? [];
  if (
    stop.some((entry) =>
      entry.hooks.some(
        (hook) => hook.type === 'command' && hook.command === command,
      ),
    )
  )
    return;
  settings.hooks = {
    ...settings.hooks,
    Stop: [...stop, { hooks: [{ type: 'command', command }] }],
  };
  await mkdir(path.dirname(target), { recursive: true });
  await replaceFile(
    target,
    JSON.stringify(settings, null, 2).replaceAll('\n', newline(source)) +
      newline(source),
  );
}

export async function init(
  target: string | undefined,
  cwd = process.cwd(),
  lang: Language = resolveLanguage(),
): Promise<string> {
  const text = integrationMessages(lang);
  const targets: Record<string, string> = {
    agents: 'AGENTS.md',
    cursor: '.cursor/rules/didit.mdc',
    copilot: '.github/copilot-instructions.md',
    claude: '.claude/settings.json',
  };
  if (target !== undefined && !Object.hasOwn(targets, target))
    throw new Error(`${text.invalidTarget}: ${target}`);
  let root = await realpath(cwd);
  try {
    root = await realpath(
      (await git(root, ['rev-parse', '--show-toplevel'])).replace(/\r?\n$/, ''),
    );
  } catch (error: unknown) {
    if (!(error instanceof GitError && error.exitCode === 128)) throw error;
  }
  if (target === undefined) {
    const config = await safeTarget(root, '.didit.json', lang);
    const ignore = await safeTarget(root, '.gitignore', lang);
    try {
      await writeFile(
        config,
        JSON.stringify({ failOn: 'high' }, null, 2) + '\n',
        { flag: 'wx' },
      );
    } catch (error: unknown) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'EEXIST'
      ))
        throw error;
    }
    const source = await readOptional(ignore);
    if (
      !source
        .split(/\r?\n/)
        .some((line) => line.trim() === '.didit/' || line.trim() === '/.didit/')
    ) {
      const eol = newline(source);
      await replaceFile(
        ignore,
        source +
          (source && !source.endsWith('\n') ? eol : '') +
          '.didit/' +
          eol,
      );
    }
  } else {
    const relative = targets[target];
    if (relative === undefined) throw new Error(text.invalidTarget);
    const destination = await safeTarget(root, relative, lang);
    if (target === 'claude') await initializeClaude(destination, lang);
    else {
      const source = await readOptional(destination);
      const result = instructions(source, lang);
      if (source !== result) {
        await mkdir(path.dirname(destination), { recursive: true });
        await replaceFile(destination, result);
      }
    }
  }
  return text.initialized + '\n';
}
