import { spawn } from 'node:child_process';
import type { resolveConfig } from '../config.js';
import { createWorktree, linkDependencies } from '../git/worktree.js';
import type { ResolvedRange } from '../git/range.js';
import { runMessages } from '../i18n/run-messages.js';
import type { Report, RunResult } from '../rules/types.js';
import { killProcessTree } from './kill.js';
import { readJunit } from './parsers/junit.js';
import { parseVitest } from './parsers/vitest.js';
import { parseJest } from './parsers/jest.js';
import { parsePytest } from './parsers/pytest.js';
export const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
export interface CommandResult {
  startedAt: string;
  durationMs: number;
  exitCode: number | null;
  timedOut: boolean;
  output: string;
  logTail: string;
}
export async function runCommand(
  command: string,
  cwd: string,
  timeoutSec: number,
  signal?: AbortSignal,
): Promise<CommandResult> {
  const started = Date.now();
  const child = spawn(command, {
    cwd,
    shell: true,
    detached: process.platform !== 'win32',
    env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output: Buffer = Buffer.alloc(0);
  let timedOut = false;
  function capture(chunk: Buffer): void {
    output =
      chunk.length >= MAX_OUTPUT_BYTES
        ? chunk.subarray(chunk.length - MAX_OUTPUT_BYTES)
        : Buffer.concat([
            output.subarray(
              Math.max(0, output.length + chunk.length - MAX_OUTPUT_BYTES),
            ),
            chunk,
          ]);
  }
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  // Reuse the same operation across timeout, abort, exit, and final cleanup.
  // Re-signalling an already terminated group can fail while it is being reaped.
  let termination: Promise<void> | undefined;
  function terminate(): Promise<void> {
    termination ??= killProcessTree(child.pid);
    return termination;
  }
  let stop: () => void = () => undefined;
  const completion = new Promise<number | null>((resolve, reject) => {
    stop = () => {
      void terminate().catch(reject);
    };
    child.once('error', reject);
    child.once('exit', stop);
    child.once('close', (code) => {
      resolve(code);
    });
  });
  const timer = setTimeout(() => {
    timedOut = true;
    stop();
  }, timeoutSec * 1000);
  signal?.addEventListener('abort', stop, { once: true });
  if (signal?.aborted) stop();
  try {
    const exitCode = await completion;
    const text = output.toString('utf8');
    return {
      startedAt: new Date(started).toISOString(),
      durationMs: Date.now() - started,
      exitCode,
      timedOut,
      output: text,
      logTail: text
        .replace(/\r\n/g, '\n')
        .replace(/\n$/, '')
        .split('\n')
        .slice(-50)
        .join('\n'),
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', stop);
    await terminate();
  }
}
type ResolvedConfig = ReturnType<typeof resolveConfig>;
export async function executeRuns(
  range: ResolvedRange,
  config: ResolvedConfig,
): Promise<NonNullable<Report['runs']>> {
  const command = config.run;
  if (!command) throw new Error(runMessages(config.lang).missingCommand);
  const testCommand: string = command;
  const controller = new AbortController();
  const interrupt = () => {
    controller.abort();
  };
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  const cleanup: (() => Promise<void>)[] = [];
  function checkInterrupted(): void {
    if (controller.signal.aborted)
      throw new Error(runMessages(config.lang).interrupted);
  }
  async function execute(side: 'base' | 'current'): Promise<RunResult> {
    checkInterrupted();
    const sha = range[side].sha;
    const isolated = side === 'base' || range.mode !== 'worktree';
    let cwd = range.root;
    if (isolated) {
      const worktree = await createWorktree(
        range.root,
        sha,
        side === 'current' && range.mode === 'staged',
      );
      cleanup.push(worktree.cleanup);
      cwd = worktree.path;
      checkInterrupted();
      if (!(side === 'base' && config.baseRun.setup))
        await linkDependencies(range.root, cwd, config.baseRun.linkDirs);
    }
    async function invoke(actual: string, test: boolean): Promise<RunResult> {
      checkInterrupted();
      const raw = await runCommand(
        actual,
        cwd,
        config.timeoutSec,
        controller.signal,
      );
      checkInterrupted();
      const result: RunResult = {
        side,
        command: actual,
        sha,
        dirty: side === 'current' && range.current.dirty,
        startedAt: raw.startedAt,
        durationMs: raw.durationMs,
        exitCode: raw.exitCode,
        timedOut: raw.timedOut,
        parser: 'none',
        logTail: raw.logTail,
      };
      if (!test) return result;
      if (config.junit) {
        result.counts = await readJunit(cwd, config.junit, config.lang);
        result.parser = 'junit';
      } else {
        const parsers = [
          ['vitest', parseVitest],
          ['jest', parseJest],
          ['pytest', parsePytest],
        ] as const;
        for (const [parser, parse] of parsers) {
          const counts = parse(raw.output);
          if (counts) {
            result.counts = counts;
            result.parser = parser;
            break;
          }
        }
      }
      return result;
    }
    if (side === 'base' && config.baseRun.setup) {
      const setup = await invoke(config.baseRun.setup, false);
      if (setup.exitCode !== 0 || setup.timedOut) return setup;
    }
    return invoke(testCommand, true);
  }
  async function cleanupAll(): Promise<void> {
    const results = await Promise.allSettled(
      cleanup.reverse().map((remove) => remove()),
    );
    const errors = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason as unknown] : [],
    );
    if (errors.length)
      throw new AggregateError(errors, runMessages(config.lang).cleanupFailed);
  }
  try {
    const current = await execute('current');
    if (!config.baseRun.enabled) return { current };
    return { current, base: await execute('base') };
  } finally {
    try {
      await cleanupAll();
    } finally {
      process.off('SIGINT', interrupt);
      process.off('SIGTERM', interrupt);
    }
  }
}
