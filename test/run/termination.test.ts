import { ChildProcess, spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCommand } from '../../src/run/runner.js';
import { killProcessTree } from '../../src/run/kill.js';

vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return { ...original, spawn: vi.fn() };
});
vi.mock('../../src/run/kill.js', () => ({ killProcessTree: vi.fn() }));

function childProcess(): ChildProcess {
  const child = Object.assign(new ChildProcess(), {
    pid: 12345,
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  });
  vi.mocked(spawn).mockReturnValue(child);
  return child;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(killProcessTree).mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('per-command termination lifecycle', () => {
  it('shares one termination across timeout, abort, exit, and final cleanup', async () => {
    const child = childProcess();
    const controller = new AbortController();
    const pending = runCommand('test', '.', 1, controller.signal);
    await vi.advanceTimersByTimeAsync(1000);
    controller.abort();
    child.emit('exit', null, 'SIGKILL');
    child.emit('close', null, 'SIGKILL');
    expect((await pending).timedOut).toBe(true);
    expect(killProcessTree).toHaveBeenCalledExactlyOnceWith(12345);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not signal an exited group again when later cleanup would return EPERM', async () => {
    const child = childProcess();
    const denied = Object.assign(new Error('kill EPERM'), { code: 'EPERM' });
    vi.mocked(killProcessTree)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(denied);
    const pending = runCommand('test', '.', 1);
    child.emit('exit', 0, null);
    child.emit('close', 0, null);
    expect((await pending).exitCode).toBe(0);
    expect(killProcessTree).toHaveBeenCalledTimes(1);
  });

  it('awaits the same in-flight termination after the command closes', async () => {
    const child = childProcess();
    let finish: () => void = () => undefined;
    vi.mocked(killProcessTree).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const pending = runCommand('test', '.', 1);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(1000);
    child.emit('exit', null, 'SIGKILL');
    child.emit('close', null, 'SIGKILL');
    await Promise.resolve();
    expect(settled).toBe(false);
    finish();
    expect((await pending).timedOut).toBe(true);
    expect(killProcessTree).toHaveBeenCalledTimes(1);
  });

  it('propagates the original permission error without retrying or masking it', async () => {
    childProcess();
    const denied = Object.assign(new Error('kill EPERM'), { code: 'EPERM' });
    vi.mocked(killProcessTree).mockRejectedValue(denied);
    const pending = runCommand('test', '.', 1);
    const assertion = expect(pending).rejects.toBe(denied);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(killProcessTree).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
