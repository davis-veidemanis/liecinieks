// Manual dev launcher — works around electron-forge's broken `start` in this env.
// 1) Build main.ts + preload.ts once via Vite (forge plugin-vite would do this,
//    but we run it ourselves to keep control over the rest).
// 2) Start the renderer Vite dev server on 127.0.0.1:5173.
// 3) Wait until the server actually accepts a connection.
// 4) Launch Electron pointed at the built main.js.
// Killing the script (Ctrl-C) tears down both children.

import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Spawn a child process rooted at the repo, inheriting our stdio by default.
function run(cmd, args, opts = {}) {
  return spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
}

// Poll a URL until it accepts a GET response, or reject once the timeout elapses.
function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolveFn, reject) => {
    // One probe attempt; schedules another on failure until the deadline hits.
    const tick = () => {
      const req = request(url, { method: 'GET', timeout: 1000 }, (res) => {
        res.destroy();
        resolveFn();
      });
      req.on('error', () => {
        if (Date.now() > deadline) return reject(new Error(`Timeout waiting for ${url}`));
        setTimeout(tick, 200);
      });
      req.on('timeout', () => {
        req.destroy();
        if (Date.now() > deadline) return reject(new Error(`Timeout waiting for ${url}`));
        setTimeout(tick, 200);
      });
      req.end();
    };
    tick();
  });
}

// Run a one-shot Vite build for a given entry/config and resolve on success.
async function buildOnce(entry, configFile) {
  return new Promise((resolveFn, reject) => {
    const p = run('npx', ['vite', 'build', '--config', configFile, '--mode', 'development'], {
      env: { ...process.env, ENTRY: entry },
    });
    p.on('exit', (code) => (code === 0 ? resolveFn() : reject(new Error(`build failed: ${entry}`))));
  });
}

const children = [];
// Kill every tracked child process and exit cleanly.
function shutdown() {
  for (const c of children) {
    try { c.kill('SIGTERM'); } catch { /* noop */ }
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Top-level dev orchestration: build main+preload, boot the renderer dev server, then launch Electron.
(async () => {
  // Rebuild main + preload so any edits to them get picked up.
  // The forge package command does this as part of its build pipeline; calling
  // it here keeps dev runs in sync with changes to src/main.ts and
  // src/preload.ts without needing a manual `npm run package` step.
  console.log('[dev] rebuilding main + preload via electron-forge...');
  await new Promise((resolveFn, reject) => {
    const p = run('npx', ['electron-forge', 'package', '--skip-package'], { stdio: 'ignore' });
    p.on('exit', (code) => (code === 0 ? resolveFn() : reject(new Error('forge build failed'))));
  }).catch(async () => {
    // Fallback for forge versions without --skip-package: just do the full package.
    console.log('[dev] --skip-package unsupported, doing full package...');
    await new Promise((resolveFn, reject) => {
      const p = run('npm', ['run', 'package']);
      p.on('exit', (code) => (code === 0 ? resolveFn() : reject(new Error('npm run package failed'))));
    });
  });

  console.log('[dev] starting Vite renderer dev server...');
  const vite = run('npx', ['vite', '--config', 'vite.renderer.config.ts']);
  children.push(vite);

  await waitForServer('http://127.0.0.1:5173/');
  console.log('[dev] Vite ready. Launching Electron...');

  const electron = run('npx', ['electron', '.'], {
    env: { ...process.env, NODE_ENV: 'development' },
  });
  children.push(electron);

  electron.on('exit', (code) => {
    console.log(`[dev] Electron exited with code ${code}. Stopping Vite.`);
    shutdown();
  });
})().catch((err) => {
  console.error('[dev] startup failed:', err.message);
  shutdown();
});
