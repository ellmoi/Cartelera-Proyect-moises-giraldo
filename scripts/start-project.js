const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const jsonServerCli = path.join(root, 'node_modules', 'json-server', 'lib', 'bin.js');
const staticServer = path.join(root, 'scripts', 'static-server.js');
const children = [];
let closing = false;

// Crea un proceso hijo y conserva su referencia para detenerlo con Ctrl+C.
function start(command, args) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', windowsHide: false });
  children.push(child);
  child.on('exit', (code) => {
    if (!closing && code !== 0) {
      console.error(`Un servidor terminó inesperadamente con código ${code}.`);
      shutdown(code || 1);
    }
  });
  return child;
}

function openBrowser(url) {
  // Cada sistema operativo utiliza una orden diferente para abrir una URL.
  const platform = process.platform;
  if (platform === 'win32') spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  else if (platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

function shutdown(code = 0) {
  // Cierra los dos servidores para liberar los puertos 3000 y 5500.
  if (closing) return;
  closing = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 150).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => {
  for (const child of children) if (!child.killed) child.kill('SIGTERM');
});

// JSON Server convierte db/db.json en la API local del puerto 3000.
start(process.execPath, [jsonServerCli, 'db/db.json', '--port', '3000']);
// El servidor estático publica la interfaz en el puerto 5500.
start(process.execPath, [staticServer]);

setTimeout(() => {
  console.log('\nTHE MOI CINEMAS está disponible en http://localhost:5500');
  console.log('Presiona Ctrl+C para detener el proyecto.\n');
  openBrowser('http://localhost:5500');
}, 1000);
