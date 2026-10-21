import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { readHookInput } from '../../src/commands/hook-input.js';
import { MAX_HOOK_INPUT_BYTES } from '../../src/commands/hook.js';
import { runCli } from '../../src/cli-app.js';

async function* chunks(...values: unknown[]) {
  for (const value of values) yield await Promise.resolve(value);
}
describe('hook CLI boundary', () => {
  it('accepts bounded UTF-8 input split across chunks', async () => {
    expect(
      await readHookInput(
        chunks(Buffer.from('{"stop_'), 'hook_active":true}'),
        'en',
      ),
    ).toBe('{"stop_hook_active":true}');
  });
  it('rejects oversized and nontext chunks', async () => {
    await expect(
      readHookInput(chunks(Buffer.alloc(MAX_HOOK_INPUT_BYTES + 1)), 'en'),
    ).rejects.toThrow('1 MiB');
    await expect(readHookInput(chunks(42), 'en')).rejects.toThrow('JSON text');
  });
  it('honors active-hook guard even outside a repository', async () => {
    expect(
      await runCli(
        ['hook', 'claude'],
        '0.1.0',
        tmpdir(),
        '{"stop_hook_active":true}',
      ),
    ).toEqual({ exitCode: 0, stdout: '', stderr: '' });
  });
  it('reports hook input/runtime errors as nonblocking exit 1', async () => {
    const invalid = await runCli(
      ['hook', 'claude'],
      '0.1.0',
      tmpdir(),
      'not JSON',
    );
    expect(invalid.exitCode).toBe(1);
    expect(invalid.stdout).toBe('');
    expect(invalid.stderr).not.toBe('');
    const noRepo = await runCli(['hook', 'claude'], '0.1.0', tmpdir(), '{}');
    expect(noRepo.exitCode).toBe(1);
    expect(noRepo.stdout).toBe('');
    expect(
      (await runCli(['hook', 'unknown'], '0.1.0', tmpdir(), '{}')).exitCode,
    ).toBe(1);
  });
  it('lists all 20 file rules and 3 execution rules', async () => {
    const result = await runCli(['rules'], '0.1.0');
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim().split('\n')).toHaveLength(23);
    expect(result.stdout).toContain('run-skipped-increased');
  });
});
