import { spawn } from 'node:child_process';

const services = [
  spawn(process.execPath, ['apps/api/dist/main.js'], { stdio: 'inherit', env: process.env }),
  spawn(process.execPath, ['apps/web/server.js'], { stdio: 'inherit', env: process.env }),
];

let stopping = false;
let failed = false;

function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const service of services) {
    if (!service.killed) service.kill(signal);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stop(signal));
}

for (const service of services) {
  service.on('exit', (code, signal) => {
    if (!stopping) {
      failed = true;
      console.error(`A service exited unexpectedly (${signal ?? `code ${code}`}).`);
      stop();
    }
  });
}

await Promise.all(services.map((service) => new Promise((resolve) => service.on('exit', resolve))));
process.exitCode = failed ? 1 : 0;
