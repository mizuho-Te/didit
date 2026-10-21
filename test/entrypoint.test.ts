import { afterEach, expect, it, vi } from 'vitest';

const originalArgv = process.argv;
const originalExitCode = process.exitCode;
afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
  vi.resetModules();
});
it('wires the version response to stdout and the process exit code', async () => {
  process.argv = ['node', 'cli.js', '--version'];
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  await import('../src/cli.js');
  expect(stdout).toHaveBeenCalledWith('0.2.0\n');
  expect(stderr).toHaveBeenCalledWith('');
  expect(process.exitCode).toBe(0);
});
