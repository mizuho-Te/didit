import { readdir, readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { SyntaxValidator } from 'fast-xml-validator';
import picomatch from 'picomatch';
import { z } from 'zod';
import { runMessages } from '../../i18n/run-messages.js';
import type { Language } from '../../rules/types.js';
import type { Counts } from './text.js';
const integer = z.coerce.number().int().nonnegative();
const attributes = z.object({
  '@_tests': integer,
  '@_failures': integer.optional(),
  '@_errors': integer.optional(),
  '@_skipped': integer.optional(),
});
const object = z.record(z.string(), z.unknown());
function collect(value: unknown): Counts[] {
  if (Array.isArray(value))
    return value.flatMap((item: unknown) => collect(item));
  const node = object.safeParse(value);
  if (!node.success) return [];
  if ('@_tests' in node.data) {
    const attrs = attributes.parse(node.data);
    const total = attrs['@_tests'];
    const failed = (attrs['@_failures'] ?? 0) + (attrs['@_errors'] ?? 0);
    const skipped = attrs['@_skipped'] ?? 0;
    if (failed + skipped > total)
      throw new Error(runMessages('en').invalidJunit);
    return [{ total, failed, skipped, passed: total - failed - skipped }];
  }
  return ['testsuites', 'testsuite'].flatMap((key) => collect(node.data[key]));
}
export function parseJunit(xml: string): Counts {
  SyntaxValidator.validate(xml);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error(runMessages('en').invalidJunit);
  const parsed: unknown = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
  }).parse(xml);
  const values = collect(parsed);
  if (!values.length) throw new Error(runMessages('en').invalidJunit);
  return values.reduce(
    (a, b) => ({
      passed: a.passed + b.passed,
      failed: a.failed + b.failed,
      skipped: a.skipped + b.skipped,
      total: a.total + b.total,
    }),
    { passed: 0, failed: 0, skipped: 0, total: 0 },
  );
}
export async function readJunit(
  root: string,
  glob: string,
  lang: Language,
): Promise<Counts> {
  const absolute = path.resolve(root, glob);
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  if (
    relative.startsWith('../') ||
    relative === '..' ||
    path.isAbsolute(relative)
  )
    throw new Error(runMessages(lang).unsafePath);
  const match = picomatch(relative, { dot: true });
  const reports: Counts[] = [];
  let bytes = 0;
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const file = path.join(directory, entry.name);
      const name = path.relative(root, file).replaceAll('\\', '/');
      if (entry.isDirectory()) {
        if (!['.git', 'node_modules', '.venv', 'venv'].includes(entry.name))
          await walk(file);
      } else if (entry.isFile() && match(name)) {
        bytes += (await lstat(file)).size;
        if (bytes > 5 * 1024 * 1024)
          throw new Error(runMessages(lang).invalidJunit);
        reports.push(parseJunit(await readFile(file, 'utf8')));
      }
    }
  }
  try {
    await walk(root);
  } catch (error: unknown) {
    throw new Error(runMessages(lang).invalidJunit, { cause: error });
  }
  if (!reports.length) throw new Error(runMessages(lang).invalidJunit);
  return reports.reduce(
    (a, b) => ({
      passed: a.passed + b.passed,
      failed: a.failed + b.failed,
      skipped: a.skipped + b.skipped,
      total: a.total + b.total,
    }),
    { passed: 0, failed: 0, skipped: 0, total: 0 },
  );
}
