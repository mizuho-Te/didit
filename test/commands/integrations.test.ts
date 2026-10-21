import { readFile, symlink, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { init } from '../../src/commands/init.js';
import { MAX_HOOK_INPUT_BYTES, runHook } from '../../src/commands/hook.js';
import { createRepo, type TestRepo } from '../helpers/repo.js';
import skipRule from '../../src/rules/test-skip-added.js';

const repos: TestRepo[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(repos.splice(0).map((repo) => repo.cleanup()));
});
async function fixture() {
  const repo = await createRepo();
  repos.push(repo);
  return repo;
}
async function read(repo: TestRepo, file: string) {
  return readFile(path.join(repo.path, file), 'utf8');
}

describe('initialization', () => {
  it('places configuration in the repository root when invoked from a subdirectory', async () => {
    const repo = await fixture();
    const nested = path.join(repo.path, 'nested', 'child');
    await mkdir(nested, { recursive: true });
    await init(undefined, nested, 'en');
    expect(JSON.parse(await read(repo, '.didit.json'))).toEqual({
      failOn: 'high',
    });
    await expect(readFile(path.join(nested, '.didit.json'))).rejects.toThrow();
  });
  it('creates config and gitignore once without inventing a test command', async () => {
    const repo = await fixture();
    await init(undefined, repo.path, 'en');
    const config = await read(repo, '.didit.json'),
      ignore = await read(repo, '.gitignore');
    expect(JSON.parse(config)).toEqual({ failOn: 'high' });
    expect(ignore).toBe('.didit/\n');
    await init(undefined, repo.path, 'en');
    expect(await read(repo, '.didit.json')).toBe(config);
    expect(await read(repo, '.gitignore')).toBe(ignore);
  });
  it('preserves config bytes and CRLF ignores, including an existing root rule', async () => {
    const repo = await fixture();
    const config = '{ // custom\n "run": "npm test"\n}\n';
    await repo.write('.didit.json', config);
    await repo.write('.gitignore', 'dist/\r\nnode_modules/');
    await init(undefined, repo.path);
    expect(await read(repo, '.didit.json')).toBe(config);
    expect(await read(repo, '.gitignore')).toBe(
      'dist/\r\nnode_modules/\r\n.didit/\r\n',
    );
    await repo.write('.gitignore', 'dist/\r\n/.didit/\r\n');
    await init(undefined, repo.path);
    expect(await read(repo, '.gitignore')).toBe('dist/\r\n/.didit/\r\n');
  });
  it.each([
    ['agents', 'AGENTS.md'],
    ['cursor', '.cursor/rules/didit.mdc'],
    ['copilot', '.github/copilot-instructions.md'],
  ])(
    'keeps %s byte-identical on repetition and preserves non-marker content',
    async (target, file) => {
      const repo = await fixture();
      await repo.write(file, 'Personal instructions\r\n');
      await init(target, repo.path, 'en');
      const once = await read(repo, file);
      expect(once).toContain(
        'Personal instructions\r\n\r\n<!-- didit:start -->\r\n',
      );
      expect(once).toContain('npx --no-install didit --run "<test command>"');
      expect(once.replaceAll('\r\n', '')).not.toContain('\n');
      await init(target, repo.path, 'en');
      expect(await read(repo, file)).toBe(once);
      await repo.write(file, once + 'Trailing instructions\r\n');
      await init(target, repo.path, 'ja');
      const japanese = await read(repo, file);
      expect(japanese).toContain('<テストコマンド>');
      expect(japanese).toMatch(/^Personal instructions\r\n/);
      expect(japanese).toMatch(/Trailing instructions\r\n$/);
      await init(target, repo.path, 'ja');
      expect(await read(repo, file)).toBe(japanese);
    },
  );
  it.each(['agents', 'cursor', 'copilot', 'claude'])(
    'initializes absent %s paths idempotently',
    async (target) => {
      const repo = await fixture();
      await init(target, repo.path, 'en');
      const paths: Record<string, string> = {
        agents: 'AGENTS.md',
        cursor: '.cursor/rules/didit.mdc',
        copilot: '.github/copilot-instructions.md',
        claude: '.claude/settings.json',
      };
      const file = paths[target];
      if (file === undefined) throw new Error('Missing test path');
      const once = await read(repo, file);
      await init(target, repo.path, 'en');
      expect(await read(repo, file)).toBe(once);
    },
  );
  it('merges Claude settings while retaining unknown nested fields and other hooks', async () => {
    const repo = await fixture();
    const original = {
      permissions: { allow: ['Read'] },
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: 'other' }] },
        ],
        Stop: [
          {
            matcher: '',
            custom: { keep: true },
            hooks: [{ type: 'prompt', prompt: 'Check carefully', custom: 1 }],
          },
        ],
      },
    };
    await repo.write(
      '.claude/settings.json',
      JSON.stringify(original, null, 4).replaceAll('\n', '\r\n'),
    );
    await init('claude', repo.path);
    const once = await read(repo, '.claude/settings.json');
    const parsed: unknown = JSON.parse(once);
    expect(parsed).toEqual({
      ...original,
      hooks: {
        ...original.hooks,
        Stop: [
          ...original.hooks.Stop,
          {
            hooks: [
              {
                type: 'command',
                command: 'npx --no-install didit hook claude',
              },
            ],
          },
        ],
      },
    });
    expect(
      z
        .object({ hooks: z.object({ Stop: z.array(z.unknown()) }) })
        .parse(parsed).hooks.Stop,
    ).toHaveLength(2);
    expect(once.replaceAll('\r\n', '')).not.toContain('\n');
    await init('claude', repo.path);
    expect(await read(repo, '.claude/settings.json')).toBe(once);
  });
  it('does not reformat an existing nested didit hook', async () => {
    const repo = await fixture();
    const source =
      '{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"other"},{"type":"command","command":"npx --no-install didit hook claude","timeout":99}]}]}}';
    await repo.write('.claude/settings.json', source);
    await init('claude', repo.path);
    expect(await read(repo, '.claude/settings.json')).toBe(source);
  });
  it.each(['', '{', 'null', '{"hooks":[]}', '{"hooks":{"Stop":{}}}'])(
    'rejects malformed settings without replacing them: %s',
    async (source) => {
      const repo = await fixture();
      await repo.write('.claude/settings.json', source);
      await expect(init('claude', repo.path, 'en')).rejects.toThrow(
        'Invalid Claude settings',
      );
      expect(await read(repo, '.claude/settings.json')).toBe(source);
    },
  );
  it.each([
    '<!-- didit:start -->',
    '<!-- didit:end -->',
    '<!-- didit:start --><!-- didit:start --><!-- didit:end -->',
  ])('rejects unmatched or nested markers: %s', async (source) => {
    const repo = await fixture();
    await repo.write('AGENTS.md', source);
    await expect(init('agents', repo.path, 'en')).rejects.toThrow('markers');
    expect(await read(repo, 'AGENTS.md')).toBe(source);
  });
  it('rejects unknown targets before file creation', async () => {
    const repo = await fixture();
    await expect(init('unknown', repo.path, 'en')).rejects.toThrow(
      'Unknown integration target',
    );
    expect(await repo.git(['status', '--porcelain'])).toBe('');
  });
  it('rejects symlinked integration directories without modifying their destination', async () => {
    const repo = await fixture(),
      outside = await fixture();
    await mkdir(path.join(outside.path, 'settings'));
    await outside.write('settings/settings.json', '{"keep":true}');
    await symlink(
      path.join(outside.path, 'settings'),
      path.join(repo.path, '.claude'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    await expect(init('claude', repo.path, 'en')).rejects.toThrow(
      'symbolic links',
    );
    expect(await read(outside, 'settings/settings.json')).toBe('{"keep":true}');
  });
});

describe('Claude Stop hook', () => {
  it('returns a nonblocking error for rule failures without actionable findings', async () => {
    const repo = await fixture();
    await repo.write('sample.test.ts', 'test("example", () => {});');
    vi.spyOn(skipRule, 'check').mockRejectedValue(
      new Error('synthetic rule failure'),
    );
    const result = await runHook({}, repo.path);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('synthetic rule failure');
  });
  it('still blocks actionable findings when a different rule fails', async () => {
    const repo = await fixture();
    await repo.write('sample.test.ts', 'test.only("example", () => {});');
    vi.spyOn(skipRule, 'check').mockRejectedValue(
      new Error('synthetic rule failure'),
    );
    const result = await runHook({}, repo.path);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('synthetic rule failure');
    expect(result.stderr).toContain('[test-only-added]');
  });
  it('returns silent success before touching cwd or config when already active', async () => {
    expect(
      await runHook('{"stop_hook_active":true}', '/path/that/does/not/exist'),
    ).toEqual({ exitCode: 0, stderr: '' });
  });
  it('accepts empty objects and future fields, with no test execution by default', async () => {
    const repo = await fixture();
    await repo.write('run.cjs', 'throw new Error("must not execute");');
    await repo.commit('baseline');
    expect(await runHook({}, repo.path)).toEqual({ exitCode: 0, stderr: '' });
    expect(
      await runHook(
        {
          hook_event_name: 'Stop',
          stop_hook_active: false,
          future: { value: 1 },
        },
        repo.path,
      ),
    ).toEqual({ exitCode: 0, stderr: '' });
  });
  it.each([
    '{',
    '',
    'null',
    '[]',
    '1',
    '{"stop_hook_active":"true"}',
    '{"hook_event_name":"PreToolUse"}',
  ])('returns nonblocking error for malformed input %s', async (source) => {
    const result = await runHook(source);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('input');
  });
  it('caps JSON input before parsing', async () => {
    const result = await runHook(' '.repeat(MAX_HOOK_INPUT_BYTES + 1));
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('1 MiB');
  });
  it('returns nonblocking error for config and repository failures', async () => {
    const repo = await fixture();
    await repo.write('.didit.json', '{');
    expect((await runHook({}, repo.path)).exitCode).toBe(1);
    expect((await runHook({}, '/path/that/does/not/exist')).exitCode).toBe(1);
  });
  it('reports at most twenty findings on stderr with exit two', async () => {
    const repo = await fixture();
    await repo.write('sample.test.ts', '');
    await repo.commit('baseline');
    await repo.write(
      'sample.test.ts',
      Array.from(
        { length: 25 },
        (_, index) => `test.skip("case ${String(index)}", () => {});`,
      ).join('\n'),
    );
    const result = await runHook({}, repo.path);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('## didit');
    expect(result.stderr.match(/^- \*\*high\*\*/gm)).toHaveLength(20);
    expect(result.stderr).toContain('5 additional findings omitted');
  });
  it('honors failOn none and reasoned suppressions', async () => {
    const repo = await fixture();
    await repo.write('.didit.json', '{"failOn":"none"}');
    await repo.commit('baseline');
    await repo.write('sample.test.ts', 'test.skip("case", () => {});');
    expect((await runHook({}, repo.path)).exitCode).toBe(0);
    await repo.write('.didit.json', '{"failOn":"high"}');
    await repo.write(
      'sample.test.ts',
      '// didit-ok: retired integration\ntest.skip("case", () => {});',
    );
    expect((await runHook({}, repo.path)).exitCode).toBe(0);
  });
  it('runs only the configured synthetic command and returns its failing finding', async () => {
    const repo = await fixture();
    await repo.write(
      '.didit.json',
      JSON.stringify({
        run: 'node synthetic.cjs',
        baseRun: { enabled: false },
      }),
    );
    await repo.write(
      'synthetic.cjs',
      'process.stdout.write("Tests 1 failed | 1 total\\n"); process.exitCode = 1;',
    );
    await repo.commit('baseline');
    const result = await runHook({}, repo.path);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('[run-tests-failing]');
  });
});
