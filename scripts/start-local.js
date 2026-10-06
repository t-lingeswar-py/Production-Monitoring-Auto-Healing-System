const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Production Monitoring & Auto-Healing Local Stack...\n');

const services = [
  { name: 'BACKEND    ', dir: '../app', script: 'src/index.js' },
  { name: 'AUTO-HEALER', dir: '../auto-healer', script: 'src/index.js' },
  { name: 'DASHBOARD  ', dir: '../dashboard', script: 'server.js' }
];

const children = [];

services.forEach(svc => {
  const child = spawn('node', [svc.script], {
    cwd: path.join(__dirname, svc.dir),
    stdio: 'pipe',
    shell: true
  });

  child.stdout.on('data', data => {
    process.stdout.write(`[${svc.name}] ${data.toString()}`);
  });

  child.stderr.on('data', data => {
    process.stderr.write(`[${svc.name} ERR] ${data.toString()}`);
  });

  children.push(child);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down local services...');
  children.forEach(child => child.kill());
  process.exit();
});
