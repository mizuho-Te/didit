import { parse, type ParseError } from 'jsonc-parser';
import { z } from 'zod';
const objectSchema = z.record(z.string(), z.unknown());
export function jsonObject(content: string | null): Record<string, unknown> {
  if (content === null) return {};
  const errors: ParseError[] = [];
  const value: unknown = parse(content, errors, { allowTrailingComma: true });
  if (errors.length) throw new SyntaxError(JSON.stringify(errors));
  return objectSchema.parse(value);
}
export function objectValue(value: unknown): Record<string, unknown> {
  return value === undefined ? {} : objectSchema.parse(value);
}
