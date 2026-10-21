import { expect, it } from 'vitest';
import { ruleMessages as en } from '../src/i18n/en.js';
import { ruleMessages as ja } from '../src/i18n/ja.js';

it('provides matching nonempty English and Japanese rule keys', () => {
  expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
  for (const value of Object.values(ja))
    expect(value.length).toBeGreaterThan(0);
});
