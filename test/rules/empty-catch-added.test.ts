import { describe, expect, it } from 'vitest';
import rule from '../../src/rules/empty-catch-added.js';
import { check, context } from './helpers.js';

describe('empty-catch-added', () => {
  it('detects example 1', async () => {
    expect(
      (await check(rule, '', 'try { run(); } catch {}')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 2', async () => {
    expect(
      (await check(rule, '', 'promise.catch(() => undefined)')).length,
    ).toBeGreaterThan(0);
  });
  it('detects example 3', async () => {
    expect(
      (await check(rule, '', 'catch (error) {\n // intentionally ignore\n}'))
        .length,
    ).toBeGreaterThan(0);
  });
  it('detects example 4', async () => {
    expect(
      (await check(rule, '', 'catch { /* ignore */ }')).length,
    ).toBeGreaterThan(0);
  });
  it('ignores example 1', async () => {
    expect(
      (await check(rule, '', 'catch (error) { throw error; }')).length,
    ).toBe(0);
  });
  it('ignores example 2', async () => {
    expect(
      (await check(rule, '', 'promise.catch(() => fallback())')).length,
    ).toBe(0);
  });
  it('ignores example 3', async () => {
    expect(
      (await check(rule, '', 'catch (error) {\n log(error);\n}')).length,
    ).toBe(0);
  });
  it('localizes findings', async () => {
    const ctx = context('', 'try { run(); } catch {}');
    ctx.lang = 'ja';
    expect((await rule.check(ctx))[0]?.message).toMatch(/[ぁ-んァ-ン一-龯]/);
  });
  it('does not report unchanged context lines', async () => {
    const ctx = context('', 'try { run(); } catch {}');
    for (const hunk of ctx.file.hunks)
      for (const line of hunk.lines) line.type = 'ctx';
    expect(await rule.check(ctx)).toEqual([]);
  });
});

it('detects multiline comment-only blocks but not an unchanged closing brace', async () => {
  expect(
    await check(rule, '', 'catch {\n /* intentionally\n ignored */\n}'),
  ).toHaveLength(1);
  const ctx = context('', 'catch {\n}');
  const closing = ctx.file.hunks[0]?.lines[1];
  if (closing) closing.type = 'ctx';
  expect(await rule.check(ctx)).toEqual([]);
});
