import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { log } from 'node:console';

const requested = process.argv[2];
const root = requested
  ? path.resolve(requested)
  : await mkdtemp(path.join(tmpdir(), 'didit-demo-'));
if (requested) await mkdir(root);
function git(...args) {
  return execFileSync(
    'git',
    ['-c', 'core.hooksPath=', '-c', 'commit.gpgsign=false', ...args],
    { cwd: root, shell: false, encoding: 'utf8' },
  );
}
async function write(file, content) {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}
const manifest = {
  name: 'didit-synthetic-demo',
  version: '1.0.0',
  private: true,
  scripts: { test: 'node runner.cjs' },
};
const baseTests = `const { total, currency } = require('./src/cart.cjs');
it("discount cap", () => { expect(total()).toBe(900); });
it("total matches spec", () => { expect(total()).toBe(900); });
it("currency is present", () => { expect(currency()).toBe("JPY"); });
`;
const runner = `// Synthetic demo harness: real assertions, a Vitest-style summary, no external dependencies.
const assert = require('node:assert/strict');
const cases = [];
function it(name, run) { cases.push({ name, run, skipped: false }); }
it.skip = (name, run) => { cases.push({ name, run, skipped: true }); };
function expect(actual) { return {
  toBe(expected) { assert.equal(actual, expected); },
  toBeDefined() { assert.notEqual(actual, undefined); },
}; }
global.it = it; global.expect = expect;
require('./cart.test.cjs');
let passed = 0, failed = 0, skipped = 0;
for (const entry of cases) {
  if (entry.skipped) { skipped++; continue; }
  try { entry.run(); passed++; } catch (error) { failed++; console.error(entry.name + ': ' + String(error)); }
}
const parts = [];
if (failed) parts.push(failed + ' failed');
parts.push(passed + ' passed');
if (skipped) parts.push(skipped + ' skipped');
console.log('Tests ' + parts.join(' | ') + ' (' + cases.length + ')');
process.exitCode = failed || (cases.length === 0 && !process.argv.includes('--passWithNoTests')) ? 1 : 0;
`;
try {
  git('init', '--quiet', '--initial-branch=main');
  await write('.gitignore', 'node_modules/\n.didit/\n');
  await write('package.json', JSON.stringify(manifest, null, 2) + '\n');
  await write('runner.cjs', runner);
  await write('cart.test.cjs', baseTests);
  await write(
    'src/cart.cjs',
    'exports.total = () => 900; exports.currency = () => "JPY";\n',
  );
  await write('src/api.ts', 'export const message: string = "ok";\n');
  git('add', '--all');
  git(
    '-c',
    'user.name=didit Demo',
    '-c',
    'user.email=didit-demo@example.invalid',
    'commit',
    '--quiet',
    '-m',
    'test: create synthetic passing baseline',
  );
  await write(
    'src/cart.cjs',
    'exports.total = () => 1; exports.currency = () => "JPY";\n',
  );
  await write(
    'cart.test.cjs',
    baseTests
      .replace('it("discount cap"', 'it.skip("discount cap"')
      .replace(
        'it("total matches spec", () => { expect(total()).toBe(900); });',
        'it("total matches spec", () => { expect(total()).toBeDefined(); });',
      ),
  );
  await write(
    'src/api.ts',
    '// @ts-expect-error\nexport const message: string = 123;\n',
  );
  manifest.scripts.test += ' --passWithNoTests';
  await write('package.json', JSON.stringify(manifest, null, 2) + '\n');
  log(root.replaceAll('\\', '/'));
} catch (error) {
  await rm(root, { recursive: true, force: true });
  throw error;
}
