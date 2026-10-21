import { afterEach, describe, expect, it } from 'vitest';
import { configSchema, loadConfig, resolveConfig } from '../src/config.js';
import { parseOptions } from '../src/options.js';
import { createRepo, type TestRepo } from './helpers/repo.js';

const repos: TestRepo[] = [];
afterEach(async () => {
  await Promise.all(repos.splice(0).map((repo) => repo.cleanup()));
});
async function fixture(content?: string) {
  const repo = await createRepo();
  repos.push(repo);
  if (content !== undefined) await repo.write('.didit.json', content);
  return repo;
}
describe('configuration', () => {
  it('uses defaults only when the default file is absent', async () => {
    const repo = await fixture();
    expect(await loadConfig(repo.path)).toMatchObject({
      failOn: 'high',
      maxFileSizeKb: 1024,
      timeoutSec: 600,
      baseRun: {
        enabled: true,
        setup: null,
        linkDirs: ['node_modules', '.venv', 'venv'],
      },
    });
    await expect(loadConfig(repo.path, 'missing.json')).rejects.toThrow(
      'Cannot read configuration',
    );
  });
  it('reads JSONC comments, trailing commas, and all configuration fields', async () => {
    const repo = await fixture(
      `{ // project settings\n "failOn": "low", "run": "npm test", "junit": "reports/*.xml", "lang": "ja", "exclude": ["fixtures/**",], "testFilePatterns": ["checks/*.ts"], "rules": { "any-added": "off" }, "ignore": [{ "rule": "test-file-deleted", "path": "old/**", "reason": "retired" }], "maxFileSizeKb": 25, "timeoutSec": 20, "baseRun": { "enabled": false, "linkDirs": [], "setup": "npm ci" } }`,
    );
    expect(await loadConfig(repo.path)).toMatchObject({
      lang: 'ja',
      failOn: 'low',
      run: 'npm test',
      baseRun: { enabled: false, setup: 'npm ci' },
      rules: { 'any-added': 'off' },
    });
  });
  it.each([
    ['{"failOn":"urgent"}', 'failOn'],
    ['{"timeoutSec":0}', 'timeoutSec'],
    ['{"maxFileSizeKb":-1}', 'maxFileSizeKb'],
    ['{"unknown":true}', 'unknown'],
    ['{"rules":{"typo":"off"}}', 'rules'],
    [
      '{"ignore":[{"rule":"any-added","path":"**","reason":"  "}]}',
      'ignore.0.reason',
    ],
    ['{"baseRun":{"enabled":"no"}}', 'baseRun.enabled'],
    ['{"rules":{"didit-config-changed":"off"}}', 'rules.didit-config-changed'],
    ['', '$'],
  ])('rejects invalid config %s with a field path', async (source, field) => {
    const repo = await fixture(source);
    await expect(loadConfig(repo.path)).rejects.toThrow(field);
  });
  it('reports precise JSONC syntax locations and localized errors', async () => {
    const repo = await fixture('{\n"failOn": ???\n}');
    await expect(loadConfig(repo.path)).rejects.toThrow('line 2:');
    await expect(loadConfig(repo.path, undefined, 'ja')).rejects.toThrow(
      '設定が不正',
    );
  });
  it('resolves CLI over config while preserving disabled base runs', () => {
    const config = configSchema.parse({
      failOn: 'low',
      run: 'old',
      junit: 'old.xml',
      timeoutSec: 10,
      baseRun: { enabled: false },
    });
    expect(resolveConfig(parseOptions([]).options, config)).toMatchObject({
      failOn: 'low',
      timeoutSec: 10,
      baseRun: { enabled: false },
    });
    expect(
      resolveConfig(
        parseOptions([
          '--fail-on',
          'none',
          '--run',
          'new',
          '--junit',
          'new.xml',
          '--timeout',
          '3',
          '--lang',
          'ja',
        ]).options,
        config,
      ),
    ).toMatchObject({
      failOn: 'none',
      run: 'new',
      junit: 'new.xml',
      timeoutSec: 3,
      lang: 'ja',
      baseRun: { enabled: false },
    });
    expect(
      resolveConfig(
        parseOptions(['--no-base-run']).options,
        configSchema.parse({}),
      ).baseRun.enabled,
    ).toBe(false);
  });
  it('allows planned run rules and severity overrides', () => {
    expect(
      configSchema.parse({
        rules: { 'run-tests-failing': 'medium', 'didit-config-changed': 'low' },
      }).rules,
    ).toEqual({ 'run-tests-failing': 'medium', 'didit-config-changed': 'low' });
  });
});
