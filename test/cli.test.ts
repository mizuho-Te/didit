import { describe, expect, it } from 'vitest';
import { runCli } from '../src/cli-app.js';

describe('CLI', () => {
  it('prints the supplied package version', async () => {
    expect(await runCli(['--version'], '0.1.0')).toEqual({
      exitCode: 0,
      stdout: '0.1.0\n',
      stderr: '',
    });
  });
  it('provides help for the supported inspection command', async () => {
    const result = await runCli(['--help'], '0.1.0');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('didit [check] [options]');
    expect(result.stderr).toBe('');
  });
  it.each([
    ['--unknown'],
    ['--fail-on', 'invalid'],
    ['--base'],
    ['--staged', '--head', 'HEAD'],
  ])('rejects invalid usage %j', async (...args) => {
    const result = await runCli(args, '0.1.0');
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).not.toBe('');
  });
  it('lists implemented rules in Japanese', async () => {
    const result = await runCli(['rules', '--lang', 'ja'], '0.1.0');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      'test-skip-added [high] テストがスキップされました',
    );
  });
});
