const { spawn } = require('child_process');

const action = process.argv[2];
const params = process.argv[3] || '{}';

const child = spawn('node', [
  'scripts/callContract.cjs',
  action,
  params
], {
  cwd: process.cwd(),
  stdio: 'inherit'
});

child.on('exit', (code) => process.exit(code));