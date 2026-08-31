const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const pidFile = path.join(root, '.cine-server.pid');
const jsonServerCli = path.join(root, 'node_modules', 'json-server', 'lib', 'bin.js');
const staticServer = path.join(root, 'scripts', 'static-server.js');

// Este archivo es utilizado por el acceso directo de Windows. Inicia ambos
// servidores ocultos y guarda sus PID para que stop-background.js pueda cerrarlos.
function isRunning(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
function readPids() {
  // Acepta el formato actual con dos PID y el formato antiguo con un solo PID.
  if (!fs.existsSync(pidFile)) return null;
  try {
    const text = fs.readFileSync(pidFile, 'utf8').trim();
    if (/^\d+$/.test(text)) return { api: Number(text) };
    return JSON.parse(text);
  } catch { return null; }
}

const previous = readPids();
if (previous && isRunning(previous.api) && isRunning(previous.frontend)) process.exit(0);
if (previous) {
  for (const pid of [previous.api, previous.frontend]) {
    if (Number.isInteger(pid) && isRunning(pid)) { try { process.kill(pid, 'SIGTERM'); } catch {} }
  }
}
fs.rmSync(pidFile, { force: true });

if (!fs.existsSync(jsonServerCli)) {
  console.error('Falta JSON Server. Ejecuta npm install una vez.');
  process.exit(1);
}

const options = { cwd: root, detached: true, stdio: 'ignore', windowsHide: true };
const api = spawn(process.execPath, [jsonServerCli, 'db/db.json', '--port', '3000'], options);
const frontend = spawn(process.execPath, [staticServer], options);
api.unref(); frontend.unref();
fs.writeFileSync(pidFile, JSON.stringify({ api: api.pid, frontend: frontend.pid }), 'utf8');
