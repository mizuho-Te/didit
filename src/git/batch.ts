import { gitErrors } from '../i18n/git-errors.js';

export function parseBlobSizes(
  output: Buffer,
  expected: readonly string[],
): Map<string, number> {
  const sizes = new Map<string, number>();
  const wanted = new Set(expected);
  for (const line of output.toString('utf8').trimEnd().split('\n')) {
    const match = /^([a-f0-9]{40,64}) blob (\d+)$/.exec(line);
    const oid = match?.[1];
    const size = Number(match?.[2]);
    if (
      !oid ||
      !wanted.has(oid) ||
      sizes.has(oid) ||
      !Number.isSafeInteger(size)
    )
      throw new Error(gitErrors.invalidBlobSize);
    sizes.set(oid, size);
  }
  if (sizes.size !== wanted.size) throw new Error(gitErrors.missingBlobSize);
  return sizes;
}

export function parseBlobContents(
  output: Buffer,
  ids: readonly string[],
  sizes: ReadonlyMap<string, number>,
): Map<string, Buffer> {
  const blobs = new Map<string, Buffer>();
  let offset = 0;
  for (const oid of ids) {
    const newline = output.indexOf(10, offset);
    const size = sizes.get(oid);
    if (
      newline < 0 ||
      size === undefined ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      output.subarray(offset, newline).toString('ascii') !==
        `${oid} blob ${String(size)}` ||
      output[newline + size + 1] !== 10
    )
      throw new Error(gitErrors.invalidBlobContent);
    blobs.set(oid, output.subarray(newline + 1, newline + 1 + size));
    offset = newline + size + 2;
  }
  if (offset !== output.length) throw new Error(gitErrors.trailingBlobContent);
  return blobs;
}
