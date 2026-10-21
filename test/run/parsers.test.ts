import { describe, expect, it } from 'vitest';
import { parseVitest } from '../../src/run/parsers/vitest.js';
import { parseJest } from '../../src/run/parsers/jest.js';
import { parsePytest } from '../../src/run/parsers/pytest.js';
import { parseJunit, readJunit } from '../../src/run/parsers/junit.js';
import { createRepo } from '../helpers/repo.js';
import { symlink } from 'node:fs/promises';
import path from 'node:path';
describe('test count parsers', () => {
  it.each([
    [
      parseVitest,
      ' Test Files  3 passed (3)\n      Tests  45 passed | 3 skipped (48)',
      45,
      0,
      3,
      48,
    ],
    [
      parseVitest,
      '      Tests  2 failed | 43 passed | 3 skipped (48)',
      43,
      2,
      3,
      48,
    ],
    [parseJest, 'Tests:       3 skipped, 45 passed, 48 total', 45, 0, 3, 48],
    [
      parseJest,
      'Tests:       2 failed, 3 skipped, 43 passed, 48 total',
      43,
      2,
      3,
      48,
    ],
    [
      parsePytest,
      '========== 45 passed, 3 skipped in 1.23s ==========',
      45,
      0,
      3,
      48,
    ],
    [
      parsePytest,
      '========== 2 failed, 43 passed, 3 skipped, 1 xfailed in 2.01s ==========',
      43,
      2,
      4,
      49,
    ],
    [
      parsePytest,
      '=== 1 xpassed, 1 error, 2 deselected in 0.50s ===',
      1,
      1,
      0,
      2,
    ],
  ] as const)(
    'reads summary %#',
    (parse, output, passed, failed, skipped, total) => {
      expect(parse(output)).toEqual({ passed, failed, skipped, total });
    },
  );
  it.each([parseVitest, parseJest, parsePytest])(
    'does not guess unknown output',
    (parse) => {
      expect(parse('All good!')).toBeUndefined();
    },
  );
  it('uses the last ANSI-stripped summary', () => {
    expect(
      parseVitest(
        ' Tests 99 passed (99)\n\u001b[32m Tests 2 passed (2)\u001b[0m',
      )?.total,
    ).toBe(2);
    expect(
      parseJest('Tests: 99 passed, 99 total\nTests: 2 passed, 2 total')?.total,
    ).toBe(2);
    expect(
      parsePytest('=== 99 passed in 1.0s ===\n=== 2 passed in 0.1s ===')?.total,
    ).toBe(2);
  });
  it('rejects inconsistent summary counts', () => {
    expect(parseVitest('Tests 3 passed (5)')).toBeUndefined();
  });
  it('counts JUnit failures and errors without nested double counting', () => {
    expect(
      parseJunit(
        '<testsuites tests="5" failures="1" errors="1" skipped="1"><testsuite tests="5" failures="1" errors="1" skipped="1"/></testsuites>',
      ),
    ).toEqual({ passed: 2, failed: 2, skipped: 1, total: 5 });
    expect(
      parseJunit(
        '<testsuites><testsuite tests="3"/><testsuite tests="2" skipped="1"/></testsuites>',
      ),
    ).toEqual({ passed: 4, failed: 0, skipped: 1, total: 5 });
  });
  it.each([
    '<testsuite tests="2">',
    '<testsuite tests="a"/>',
    '<testsuite tests="-1"/>',
    '<testsuite tests="1" failures="2"/>',
    '<other/>',
    '<!DOCTYPE foo><testsuite tests="1"/>',
  ])('rejects malformed JUnit %s', (xml) => {
    expect(() => parseJunit(xml)).toThrow();
  });
  it('aggregates globs, excludes links and dependencies, rejects missing files and escapes', async () => {
    const repo = await createRepo();
    const outside = await createRepo();
    try {
      await repo.write('reports/a.xml', '<testsuite tests="2"/>');
      await repo.write('reports/b.xml', '<testsuite tests="1" skipped="1"/>');
      await repo.write('node_modules/ignored.xml', '<testsuite tests="99"/>');
      await outside.write('outside.xml', '<testsuite tests="99"/>');
      await symlink(
        outside.path,
        path.join(repo.path, 'linked'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      expect((await readJunit(repo.path, '**/*.xml', 'en')).total).toBe(3);
      await expect(readJunit(repo.path, '../*.xml', 'en')).rejects.toThrow();
      await expect(readJunit(repo.path, 'missing.xml', 'ja')).rejects.toThrow();
      await repo.write('reports/invalid.xml', '<broken>');
      await expect(readJunit(repo.path, '**/*.xml', 'en')).rejects.toThrow();
    } finally {
      await repo.cleanup();
      await outside.cleanup();
    }
  });
});
