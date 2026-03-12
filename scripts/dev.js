#!/usr/bin/env node
/**
 * Local dev runner (no external deps).
 * Replaces `concurrently` so `npm run dev` works in a locked-down environment.
 */

const { spawn } = require('child_process');

const commands = [
  { name: 'content', cmd: 'npm', args: ['run', 'content-server:dev'] },
  { name: 'oracle',  cmd: 'npm', args: ['run', 'oracle:dev'] },
  { name: 'web',     cmd: 'npm', args: ['run', 'frontend:dev'] },
];

const children = [];

function start() {
  for (const c of commands) {
    const child = spawn(c.cmd, c.args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });
    child.on('exit', code => {
      if (code && code !== 0) {
        console.error(`[dev] ${c.name} exited with code ${code}`);
        process.exitCode = code;
      }
    });
    children.push(child);
  }
}

function shutdown(signal) {
  for (const ch of children) {
    try { ch.kill(signal); } catch {}
  }
}

process.on('SIGINT', () => { shutdown('SIGINT'); process.exit(0); });
process.on('SIGTERM', () => { shutdown('SIGTERM'); process.exit(0); });

start();

