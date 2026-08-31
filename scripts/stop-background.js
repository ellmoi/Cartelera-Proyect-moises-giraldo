const fs = require('node:fs');
const path = require('node:path');
const pidFile = path.resolve(__dirname, '..', '.cine-server.pid');
// Si no existe el registro de PID, el proyecto ya estaba detenido.
if (!fs.existsSync(pidFile)) process.exit(0);
let pids;
try {
  const text = fs.readFileSync(pidFile, 'utf8').trim();
  pids = /^\d+$/.test(text) ? { api: Number(text) } : JSON.parse(text);
} catch { pids = {}; }
for (const pid of [pids.api, pids.frontend]) {
  // SIGTERM solicita el cierre de JSON Server y del servidor del frontend.
  if (!Number.isInteger(pid) || pid <= 0) continue;
  try { process.kill(pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
}
fs.rmSync(pidFile, { force: true });
