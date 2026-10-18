// Lance Electron en retirant ELECTRON_RUN_AS_NODE : le terminal de VS Code la définit,
// ce qui ferait démarrer Electron comme un simple Node.js (sans fenêtre).
const { spawn } = require('node:child_process');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, ['.', ...process.argv.slice(2)], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
