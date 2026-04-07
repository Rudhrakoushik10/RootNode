const http = require('http');
const data = JSON.stringify({ task: 'Get weather for Chennai' });
const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/task',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(data);
req.end();