import { describe, expect, it } from 'vitest';
import { addedHunks, parseUnifiedDiff } from '../../src/diff/parse.js';
import {
  classifyLanguage,
  isExcluded,
  isTestFile,
  normalizePath,
} from '../../src/diff/classify.js';

describe('unified diff parsing', () => {
  it('tracks both line numbers across replacements and separate hunks', () => {
    expect(
      parseUnifiedDiff(
        '--- a/a\n+++ b/a\n@@ -2,3 +2,3 @@ context\n same\n-before\n+after\n last\n@@ -20 +20 @@\n-old\n+new\n\\ No newline at end of file\n',
      ),
    ).toEqual([
      {
        oldStart: 2,
        newStart: 2,
        lines: [
          { type: 'ctx', content: 'same', oldLine: 2, newLine: 2 },
          { type: 'del', content: 'before', oldLine: 3 },
          { type: 'add', content: 'after', newLine: 3 },
          { type: 'ctx', content: 'last', oldLine: 4, newLine: 4 },
        ],
      },
      {
        oldStart: 20,
        newStart: 20,
        lines: [
          { type: 'del', content: 'old', oldLine: 20 },
          { type: 'add', content: 'new', newLine: 20 },
        ],
      },
    ]);
  });
  it('handles zero-length sides, empty content and header-looking content', () => {
    expect(parseUnifiedDiff('@@ -0,0 +1,2 @@\n+++ content\n+\n')).toEqual([
      {
        oldStart: 0,
        newStart: 1,
        lines: [
          { type: 'add', content: '++ content', newLine: 1 },
          { type: 'add', content: '', newLine: 2 },
        ],
      },
    ]);
    expect(parseUnifiedDiff('@@ -1,1 +0,0 @@\n-x\n')).toEqual([
      {
        oldStart: 1,
        newStart: 0,
        lines: [{ type: 'del', content: 'x', oldLine: 1 }],
      },
    ]);
    expect(parseUnifiedDiff('Binary files a and b differ')).toEqual([]);
    expect(addedHunks('')).toEqual([]);
    expect(addedHunks('a\nb\n')[0]?.lines).toHaveLength(2);
    expect(addedHunks('a\nb')[0]?.lines).toHaveLength(2);
  });
});
describe('path classification', () => {
  it.each([
    'a.test.ts',
    'nested/a.spec.cts',
    '__tests__/deep/a.mjs',
    'test_a.py',
    'a_test.py',
    'tests/deep/a.py',
    'conftest.py',
  ])('recognizes test path %s', (path) => {
    expect(isTestFile(path)).toBe(true);
  });
  it('supports custom globs and Windows separators without overmatching', () => {
    expect(normalizePath('a\\b')).toBe('a/b');
    expect(isTestFile('a\\b.test.ts')).toBe(true);
    expect(isTestFile('checks/a.ts', ['checks/**'])).toBe(true);
    expect(isTestFile('latest.ts')).toBe(false);
    expect(isTestFile('tests/readme.md')).toBe(false);
  });
  it.each([
    ['a.mts', 'ts'],
    ['a.jsx', 'js'],
    ['a.py', 'py'],
    ['a.jsonc', 'json'],
    ['a.yml', 'yaml'],
    ['a.toml', 'toml'],
    ['a.md', 'other'],
  ])('classifies %s', (path, language) => {
    expect(classifyLanguage(path)).toBe(language);
  });
  it('adds exclusions without replacing defaults', () => {
    expect(isExcluded('node_modules/a/x.js', ['fixtures/**'])).toBe(true);
    expect(isExcluded('fixtures/x.js', ['fixtures/**'])).toBe(true);
    expect(isExcluded('nested/a.min.js')).toBe(true);
    expect(isExcluded('.didit/handoff.json')).toBe(true);
    expect(isExcluded('package-lock.json')).toBe(true);
    expect(isExcluded('src/a.ts')).toBe(false);
  });
});
