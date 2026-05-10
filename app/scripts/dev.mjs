
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
}

function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolveFn, reject) => {
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

async function buildOnce(entry, configFile) {
  return new Promise((resolveFn, reject) => {
    const p = run('npx', ['vite', 'build', '--config', configFile, '--mode', 'development'], {
      env: { ...process.env, ENTRY: entry },
    });
    p.on('exit', (code) => (code === 0 ? resolveFn() : reject(new Error(`build failed: ${entry}`))));
  });
}

const children = [];
function shutdown() {
  for (const c of children) {
    try { c.kill('SIGTERM'); } catch {  }
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

(async () => {
  console.log('[dev] rebuilding main + preload via electron-forge...');
  await new Promise((resolveFn, reject) => {
    const p = run('npx', ['electron-forge', 'package', '--skip-package'], { stdio: 'ignore' });
    p.on('exit', (code) => (code === 0 ? resolveFn() : reject(new Error('forge build failed'))));
  }).catch(async () => {
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
