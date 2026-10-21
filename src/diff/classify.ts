import picomatch from 'picomatch';
import type { FileLanguage } from '../rules/types.js';

export const DEFAULT_EXCLUDES = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '.git/**',
  '.didit/**',
  '**/*.min.js',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'uv.lock',
  'poetry.lock',
];
export const DEFAULT_TEST_PATTERNS = [
  '**/*.{test,spec}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
  '**/__tests__/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
  '**/test_*.py',
  '**/*_test.py',
  '**/tests/**/*.py',
  '**/conftest.py',
];
export function normalizePath(path: string): string {
  return path.replaceAll('\\', '/');
}
export function classifyLanguage(path: string): FileLanguage {
  const extension = normalizePath(path).split('.').at(-1)?.toLowerCase();
  if (extension && ['ts', 'tsx', 'mts', 'cts'].includes(extension)) return 'ts';
  if (extension && ['js', 'jsx', 'mjs', 'cjs'].includes(extension)) return 'js';
  if (extension === 'py') return 'py';
  if (extension === 'json' || extension === 'jsonc') return 'json';
  if (extension === 'yaml' || extension === 'yml') return 'yaml';
  if (extension === 'toml') return 'toml';
  return 'other';
}
export function isTestFile(
  path: string,
  additional: readonly string[] = [],
): boolean {
  return picomatch([...DEFAULT_TEST_PATTERNS, ...additional], { dot: true })(
    normalizePath(path),
  );
}
export function isExcluded(
  path: string,
  additional: readonly string[] = [],
): boolean {
  return picomatch([...DEFAULT_EXCLUDES, ...additional], { dot: true })(
    normalizePath(path),
  );
}
