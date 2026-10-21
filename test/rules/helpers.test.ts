import { describe, expect, it } from 'vitest';
import { countAssertions, countTests } from '../../src/rules/lib/count.js';
import { pairLines } from '../../src/rules/lib/pairing.js';
import { finding } from '../../src/rules/lib/create.js';
import { context } from './helpers.js';

describe('shared rule helpers', () => {
  it('counts supported test forms but not skipped declarations', () => {
    expect(
      countTests(
        'test("a"); it.concurrent("b"); test.failing("c"); it.sequential("d"); test.each([1])("e"); it.skip("f"); test.todo("g");',
      ),
    ).toBe(5);
    expect(countTests('describe("suite"); const title = "test";')).toBe(0);
  });
  it('counts assertions independent of matcher strength', () => {
    expect(
      countAssertions('expect(a).toBe(1); assert.equal(a,1); assert(a);'),
    ).toBe(3);
    expect(countAssertions('expect.anything(); assertion();')).toBe(0);
  });
  it('pairs within three changed positions and ignores context positions', () => {
    const ctx = context('strong', 'weak');
    ctx.file.hunks[0]?.lines.splice(
      1,
      0,
      ...Array.from({ length: 9 }, () => ({
        type: 'ctx' as const,
        content: 'context',
      })),
    );
    expect(pairLines(ctx.file, () => true)).toHaveLength(1);
    expect(
      pairLines(context('a\nb\nc\nd', 'z').file, (before) => before === 'a'),
    ).toHaveLength(0);
  });
  it('does not pair across hunks or reuse additions', () => {
    const ctx = context('a\nb', 'c');
    expect(pairLines(ctx.file, () => true)).toHaveLength(1);
    ctx.file.hunks = [
      { oldStart: 1, newStart: 1, lines: [{ type: 'del', content: 'a' }] },
      { oldStart: 10, newStart: 10, lines: [{ type: 'add', content: 'b' }] },
    ];
    expect(pairLines(ctx.file, () => true)).toHaveLength(0);
  });
  it('constructs removed-side findings and optional positions', () => {
    expect(
      finding('test-skip-added', 'test-disabled', context('', ''), {
        type: 'del',
        content: 'old',
        oldLine: 9,
      }),
    ).toMatchObject({ side: 'removed', before: 'old', line: 9 });
    expect(
      finding('test-skip-added', 'test-disabled', context('', ''), {
        type: 'add',
        content: 'new',
      }),
    ).not.toHaveProperty('line');
  });
});
