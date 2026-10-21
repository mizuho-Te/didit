#!/usr/bin/env node
import { runCli } from './cli-app.js';

const result = await runCli(process.argv.slice(2), '0.2.0');
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.exitCode;
