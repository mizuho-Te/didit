import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);

export interface TestRepo {
  path: string;
  git(args: readonly string[]): Promise<string>;
  write(relativePath: string, content: string): Promise<void>;
  commit(message: string): Promise<string>;
  cleanup(): Promise<void>;
}

export async function createRepo(): Promise<TestRepo> {
  const directory = (
    await mkdtemp(path.join(tmpdir(), 'didit-test-'))
  ).replaceAll('\\', '/');
  async function git(args: readonly string[]): Promise<string> {
    const { stdout } = await execute(
      'git',
      ['-c', 'core.hooksPath=', '-c', 'commit.gpgsign=false', ...args],
      {
        cwd: directory,
        shell: false,
        env: {
          ...process.env,
          GIT_CONFIG_NOSYSTEM: '1',
          GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
        },
      },
    );
    return stdout.trimEnd();
  }
  async function cleanup(): Promise<void> {
    await rm(directory, { recursive: true, force: true });
  }
  try {
    await git(['init', '--initial-branch=main']);
    await git(['config', 'user.name', 'didit Test']);
    await git(['config', 'user.email', 'didit-test@example.invalid']);
    await git(['config', 'core.autocrlf', 'false']);
    return {
      path: directory,
      git,
      async write(relativePath, content) {
        const normalized = relativePath.replaceAll('\\', '/');
        const parts = normalized.split('/');
        if (
          path.isAbsolute(normalized) ||
          /^[A-Za-z]:/.test(normalized) ||
          parts.includes('..') ||
          parts.includes('.git') ||
          normalized === ''
        ) {
          throw new Error(
            'Test file path must stay inside the repository and outside .git',
          );
        }
        const target = path.join(directory, normalized);
        await mkdir(path.dirname(target), { recursive: true });
        const parent = await realpath(path.dirname(target));
        const root = await realpath(directory);
        const relative = path.relative(root, parent);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          throw new Error('Test file parent must stay inside the repository');
        }
        await writeFile(target, content, { encoding: 'utf8', flag: 'w' });
      },
      async commit(message) {
        await git(['add', '--all']);
        await git(['commit', '-m', message]);
        return git(['rev-parse', 'HEAD']);
      },
      cleanup,
    };
  } catch (error: unknown) {
    await cleanup();
    throw error;
  }
}
