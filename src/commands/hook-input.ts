import { MAX_HOOK_INPUT_BYTES } from './hook.js';
import { messages } from '../i18n/index.js';
import type { Language } from '../rules/types.js';

export async function readHookInput(
  stream: AsyncIterable<unknown>,
  lang: Language,
): Promise<string> {
  const buffers: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of stream) {
    if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk))
      throw new Error(messages(lang).invalidHookInput);
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_HOOK_INPUT_BYTES)
      throw new Error(messages(lang).largeHookInput);
    buffers.push(buffer);
  }
  return Buffer.concat(buffers).toString('utf8');
}
