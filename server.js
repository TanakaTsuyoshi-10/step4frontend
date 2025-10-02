const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

// Azure では PORT が渡らないケースがあるため 8080 を最終フォールバックに
const PORT = process.env.PORT || process.env.WEBSITES_PORT || 8080;
const entry = path.join(__dirname, '.next', 'standalone', 'server.js');

console.log('[startup] PORT =', PORT);
console.log('[startup] entry =', entry);
console.log('[startup] entry exists =', fs.existsSync(entry));

// Next standalone をそのまま spawn（next を require しない）
const child = spawn('node', [entry, '-p', String(PORT)], {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(PORT) },
});

child.on('exit', (code) => {
  console.log('[startup] standalone server exited with code', code);
  process.exit(code ?? 1);
});