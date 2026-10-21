import { performance } from 'node:perf_hooks';
import { expect, it } from 'vitest';
import { runCli } from '../../src/cli-app.js';
import { createRepo } from '../helpers/repo.js';

it('inspects 50 files and 2,000 changed lines in under one second', async () => {
  const repo = await createRepo();
  try {
    await repo.write('README.md', 'Synthetic performance fixture.\n');
    await repo.commit('test: create performance fixture');
    await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        repo.write(
          `src/file-${String(index)}.ts`,
          Array.from(
            { length: 40 },
            (_, line) => `export const value${String(line)} = ${String(line)};`,
          ).join('\n') + '\n',
        ),
      ),
    );
    const start = performance.now();
    const result = await runCli(['--format', 'json'], '0.1.0', repo.path);
    const duration = performance.now() - start;
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"filesChanged": 50');
    expect(duration).toBeLessThan(1000);
    console.log(
      `Full inspection benchmark: ${duration.toFixed(1)}ms (${process.platform}, ${process.arch}, Node ${process.version})`,
    );
  } finally {
    await repo.cleanup();
  }
});
