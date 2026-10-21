import { describe, expect, it } from 'vitest';
import { parseOptions } from '../src/options.js';
import { messages, resolveLanguage } from '../src/i18n/index.js';

describe('options and locale', () => {
  it('accepts explicit check and equals options', () => {
    expect(
      parseOptions(['check', '--base=main', '--fail-on=medium', '--no-color'])
        .options,
    ).toMatchObject({ base: 'main', failOn: 'medium', color: false });
  });
  it('uses documented precedence', () => {
    expect(
      resolveLanguage('en', 'ja', { DIDIT_LANG: 'ja', LANG: 'ja_JP' }),
    ).toBe('en');
    expect(resolveLanguage(undefined, 'en', { DIDIT_LANG: 'ja' })).toBe('ja');
    expect(resolveLanguage(undefined, 'en', { LANG: 'ja_JP' })).toBe('en');
    expect(
      resolveLanguage(undefined, undefined, { LC_ALL: 'ja_JP', LANG: 'en_US' }),
    ).toBe('ja');
    expect(
      resolveLanguage(undefined, undefined, { LC_ALL: 'en_US', LANG: 'ja_JP' }),
    ).toBe('en');
  });
  it('parses later milestone switches without executing commands', () => {
    expect(
      parseOptions([
        'init',
        'agents',
        '--handoff',
        '--no-base-run',
        '--timeout',
        '2',
        '--run',
        'npm test',
      ]).target,
    ).toBe('agents');
    expect(parseOptions(['-h']).command).toBe('help');
    expect(parseOptions(['-V']).command).toBe('version');
  });
  it.each([
    ['--timeout', '0'],
    ['--lang', 'xx'],
    ['--format', 'xml'],
    ['--base='],
    ['check', 'extra'],
  ])('rejects malformed options %j', (...args) => {
    expect(() => parseOptions(args)).toThrow();
  });
  it('has identical UI locale keys', () => {
    expect(Object.keys(messages('en'))).toEqual(Object.keys(messages('ja')));
  });
});
