import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { runCli } from '../../src/cli-app.js';

it('reproduces the synthetic demo with actual passing and skipped test counts', async () => {
  const setup = fileURLToPath(
    new URL('../../examples/demo/setup.mjs', import.meta.url),
  );
  const result = await promisify(execFile)(process.execPath, [setup]);
  const root = result.stdout.trim();
  try {
    const check = await runCli(
      ['--run', 'npm test', '--no-color'],
      '0.2.0',
      root,
    );
    expect(check.exitCode).toBe(1);
    expect(check.stdout).toContain('3 passed / 0 failed / 0 skipped');
    expect(check.stdout).toContain('2 passed / 0 failed / 1 skipped');
    expect(check.stdout).toContain('high 5 / medium 1 / low 0');
    expect(check.stdout).toContain('[run-skipped-increased]');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
