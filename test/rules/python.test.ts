import { describe, expect, it } from 'vitest';
import { runRules } from '../../src/rules/index.js';
import { context } from './helpers.js';
const inspect = async (before: string, after: string) =>
  runRules(context(before, after, { path: 'test_api.py', language: 'py' }));
const has = async (id: string, before: string, after: string) =>
  (await inspect(before, after)).some((item) => item.ruleId === id);
describe('Python extensions', () => {
  it('counts synchronous and async test definitions', async () => {
    expect(
      await has(
        'test-case-removed',
        'def test_a():\n pass\ndef test_b():\n pass',
        'def test_a():\n pass',
      ),
    ).toBe(true);
    expect(
      await has('test-case-removed', 'async def test_a():\n pass', ''),
    ).toBe(true);
    expect(
      await has(
        'test-case-removed',
        'def test_a():\n pass',
        'def test_renamed():\n pass',
      ),
    ).toBe(false);
    expect(await has('test-case-removed', 'def helper():\n pass', '')).toBe(
      false,
    );
  });
  it('counts assert statements, unittest assertions, and raises independently', async () => {
    expect(
      await has('assertion-count-decreased', 'assert a\nassert b', 'assert a'),
    ).toBe(true);
    expect(
      await has(
        'assertion-count-decreased',
        'self.assertEqual(a,1)\npytest.raises(Error)',
        'self.assertEqual(a,1)',
      ),
    ).toBe(true);
    expect(await has('assertion-count-decreased', 'assert a', 'assert b')).toBe(
      false,
    );
    expect(
      await has('assertion-count-decreased', 'def test_a():\n assert a', ''),
    ).toBe(false);
  });
  it('detects weakened Python assertions only in the weakening direction', async () => {
    expect(
      await has('assertion-weakened', 'assert res.status == 200', 'assert res'),
    ).toBe(true);
    expect(
      await has(
        'assertion-weakened',
        'self.assertEqual(a,1)',
        'self.assertTrue(a)',
      ),
    ).toBe(true);
    expect(await has('assertion-weakened', 'assert a', 'assert a == 1')).toBe(
      false,
    );
    expect(
      await has('assertion-weakened', 'assert a == 1', 'assert a == 2'),
    ).toBe(false);
    expect(
      await has('assertion-weakened', 'assert a == 1', 'assert a is not None'),
    ).toBe(false);
  });
  it('compares expected values while preserving the actual expression', async () => {
    expect(
      await has('expected-value-changed', 'assert a == 1', 'assert a == 2'),
    ).toBe(true);
    expect(
      await has(
        'expected-value-changed',
        'self.assertEqual(fn(a,b), [1,2])',
        'self.assertEqual(fn(a,b), [3,4])',
      ),
    ).toBe(true);
    expect(
      await has('expected-value-changed', 'assert a == 1', 'assert b == 2'),
    ).toBe(false);
    expect(
      await has(
        'expected-value-changed',
        'self.assertEqual(a, 1)',
        'self.assertEqual(b, 2)',
      ),
    ).toBe(false);
  });
  it('detects empty except bodies and ignores substantive error handling', async () => {
    expect(await has('empty-catch-added', '', 'except Exception: pass')).toBe(
      true,
    );
    expect(await has('empty-catch-added', '', 'except Exception:\n pass')).toBe(
      true,
    );
    expect(await has('empty-catch-added', '', 'except Exception: raise')).toBe(
      false,
    );
    expect(
      await has('empty-catch-added', '', 'except Exception:\n log(error)'),
    ).toBe(false);
  });
});
