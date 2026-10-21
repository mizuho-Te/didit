import { afterEach, describe, expect, it, vi } from 'vitest';
import { killProcessTree } from '../../src/run/kill.js';

const platform = Object.getOwnPropertyDescriptor(process, 'platform');
afterEach(() => {
  vi.restoreAllMocks();
  if (platform) Object.defineProperty(process, 'platform', platform);
});

function mockPosixKill() {
  Object.defineProperty(process, 'platform', { value: 'darwin' });
  return vi.spyOn(process, 'kill');
}

describe('POSIX process-group termination', () => {
  it('targets the entire process group with SIGKILL', async () => {
    const kill = mockPosixKill().mockReturnValue(true);
    await killProcessTree(12345);
    expect(kill).toHaveBeenCalledExactlyOnceWith(-12345, 'SIGKILL');
  });
  it('accepts an already absent process group', async () => {
    const absent = Object.assign(new Error('kill ESRCH'), { code: 'ESRCH' });
    mockPosixKill().mockImplementation(() => {
      throw absent;
    });
    await expect(killProcessTree(12345)).resolves.toBeUndefined();
  });
  it('preserves genuine permission errors', async () => {
    const denied = Object.assign(new Error('kill EPERM'), { code: 'EPERM' });
    mockPosixKill().mockImplementation(() => {
      throw denied;
    });
    await expect(killProcessTree(12345)).rejects.toBe(denied);
  });
  it('preserves unexpected errors', async () => {
    const failure = new Error('unexpected');
    mockPosixKill().mockImplementation(() => {
      throw failure;
    });
    await expect(killProcessTree(12345)).rejects.toBe(failure);
  });
});
