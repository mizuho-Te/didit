import { execFile } from 'node:child_process';
export async function killProcessTree(pid: number | undefined): Promise<void> {
  if (pid === undefined) return;
  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      execFile(
        'taskkill',
        ['/PID', String(pid), '/T', '/F'],
        { shell: false },
        () => {
          resolve();
        },
      );
    });
  } else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch (error: unknown) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ESRCH'
      ))
        throw error;
    }
  }
}
