import { describe, expect, it } from 'vitest';
import { parseBlobContents, parseBlobSizes } from '../../src/git/batch.js';
import { gitInputBuffer, GitError } from '../../src/git/exec.js';

const first = 'a'.repeat(40);
const second = 'b'.repeat(40);
describe('Git batch protocol', () => {
  it('parses byte lengths without interpreting blob bytes as protocol', () => {
    const data = Buffer.from(`日本語\n${second} blob 0\n\0tail`);
    const output = Buffer.concat([
      Buffer.from(`${first} blob ${String(data.length)}\n`),
      data,
      Buffer.from(`\n${second} blob 0\n\n`),
    ]);
    const sizes = parseBlobSizes(
      Buffer.from(`${first} blob ${String(data.length)}\n${second} blob 0\n`),
      [first, second],
    );
    const parsed = parseBlobContents(output, [first, second], sizes);
    expect(parsed.get(first)).toEqual(data);
    expect(parsed.get(second)).toEqual(Buffer.alloc(0));
  });
  it('rejects missing, duplicate, malformed, and non-blob size records', () => {
    for (const output of [
      '',
      `${first} missing\n`,
      `${first} commit 3\n`,
      `${first} blob 9007199254740992\n`,
      `${first} blob 3\n${first} blob 3\n`,
      `${second} blob 3\n`,
    ]) {
      expect(() => parseBlobSizes(Buffer.from(output), [first])).toThrow();
    }
    expect(() =>
      parseBlobSizes(Buffer.from(`${first} blob 0\n`), [first, second]),
    ).toThrow();
  });
  it('rejects malformed, truncated, reordered, and trailing blob responses', () => {
    for (const output of [
      '',
      `${first} blob 3\nabc`,
      `${first} blob 3\nab\n`,
      `${second} blob 3\nabc\n`,
      `${first} blob 4\nabc\n`,
      `${first} blob 3\nabc\nextra`,
    ]) {
      expect(() =>
        parseBlobContents(Buffer.from(output), [first], new Map([[first, 3]])),
      ).toThrow();
    }
    expect(() =>
      parseBlobContents(Buffer.from(`${first} blob 0\n\n`), [first], new Map()),
    ).toThrow();
  });
  it('rejects an early Git exit with large stdin without an unhandled pipe error', async () => {
    await expect(
      gitInputBuffer(
        process.cwd(),
        ['not-a-command'],
        Buffer.alloc(1024 * 1024, 65),
      ),
    ).rejects.toBeInstanceOf(GitError);
  });
});
