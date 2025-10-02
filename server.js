/**
 * Azure の $PORT を使って Next の standalone サーバを起動するだけのラッパー。
 * ※ ここで 'next' は import しないこと（node_modules を要求するため）
 */
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PORT = process.env.PORT || process.env.WEBSITES_PORT || 3000;
const entry = path.join(__dirname, '.next', 'standalone', 'server.js');

// 事前検証ログ
console.log('[startup] PORT =', PORT);
console.log('[startup] entry =', entry);
console.log('[startup] entry exists =', fs.existsSync(entry));

const child = spawn('node', [entry, '-p', String(PORT)], {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(PORT) },
});

child.on('exit', (code) => {
  console.log('[startup] standalone server exited with code', code);
  process.exit(code ?? 1);
});