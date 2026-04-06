const { execSync } = require('child_process');

const PORTS = [3000, 3001, 4000];

console.log('[KILL-PORT] Checking for processes on ports:', PORTS.join(', '));

// Use PowerShell to get processes on ports (more reliable on Windows)
for (const port of PORTS) {
  try {
    const ps = `
      Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | 
      Select-Object -ExpandProperty OwningProcess | 
      Sort-Object -Unique
    `;
    const result = execSync(`powershell -Command "${ps}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const pids = result.trim().split('\n').filter(pid => pid && /^\d+$/.test(pid.trim()));
    
    for (const pid of pids) {
      const cleanPid = pid.trim();
      try {
        execSync(`taskkill /F /PID ${cleanPid}`, { stdio: 'ignore' });
        console.log(`[KILL-PORT] Killed process ${cleanPid} on port ${port}`);
      } catch {
        console.log(`[KILL-PORT] Could not kill process ${cleanPid}`);
      }
    }
    
    if (pids.length === 0) {
      console.log(`[KILL-PORT] No process on port ${port}`);
    }
  } catch (error) {
    console.log(`[KILL-PORT] Error checking port ${port}: ${error.message}`);
  }
}

console.log('[KILL-PORT] Port cleanup complete');
