import { getBackendAccount } from '../services/walletService.js';
import { isContractInitialized } from '../services/contractService.js';
import config from '../config.js';

interface ActivityEntry {
  timestamp: Date;
  ip: string;
  method: string;
  path: string;
  status: number;
  duration: number;
}

interface StatusSnapshot {
  activeConnections: number;
  totalRequests: number;
  recentActivity: ActivityEntry[];
  uptime: number;
}

class ConnectionTracker {
  private activeConnections: number = 0;
  private totalRequests: number = 0;
  private recentActivity: ActivityEntry[] = [];
  private startTime: Date;
  private maxRecentActivity: number = 5;

  constructor() {
    this.startTime = new Date();
  }

  recordRequest(ip: string, method: string, path: string, status: number, duration: number): void {
    this.totalRequests++;
    this.activeConnections--;

    const entry: ActivityEntry = {
      timestamp: new Date(),
      ip,
      method,
      path,
      status,
      duration,
    };

    this.recentActivity.unshift(entry);
    if (this.recentActivity.length > this.maxRecentActivity) {
      this.recentActivity.pop();
    }

    this.logConnection(ip, method, path, status, duration);
  }

  startConnection(): void {
    this.activeConnections++;
  }

  getSnapshot(): StatusSnapshot {
    return {
      activeConnections: Math.max(0, this.activeConnections),
      totalRequests: this.totalRequests,
      recentActivity: [...this.recentActivity],
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
    };
  }

  resetRecentActivity(): void {
    this.recentActivity = [];
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  private formatTimestamp(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour12: false });
  }

  private getStatusIcon(status: number): string {
    if (status >= 200 && status < 300) return '✅';
    if (status >= 400 && status < 500) return '⚠️';
    if (status >= 500) return '❌';
    return '🔄';
  }

  logConnection(ip: string, method: string, path: string, status: number, duration: number): void {
    const icon = this.getStatusIcon(status);
    const time = this.formatTimestamp(new Date());
    console.log(`  ${icon} [${time}] ${method.padEnd(6)} ${path.padEnd(30)} ${String(status).padStart(3)} ${this.formatDuration(duration).padStart(8)} | ${ip}`);
  }

  formatStatus(): string {
    const snapshot = this.getSnapshot();
    const uptime = this.formatUptime(snapshot.uptime);
    
    // Check actual blockchain and contract status
    const account = getBackendAccount();
    const walletConnected = account !== null;
    const contractsInitialized = isContractInitialized();
    const blockchainStatus = walletConnected && contractsInitialized;
    
    // Use config port instead of env
    const port = config.server.port;

    let status = `
╔══════════════════════════════════════════════════════════════════════════╗
║                         ROOTNODE BACKEND SERVER                            ║
╠══════════════════════════════════════════════════════════════════════════╣`;

    status += `
║  Server                                                                 ║
║  ────────                                                               ║
║  Port: ${String(port).padEnd(10)} | Uptime: ${uptime.padEnd(35)}║`;

    const dbStatus = '✅ Connected';
    const blockchainIcon = blockchainStatus ? '✅' : walletConnected ? '⚠️' : '❌';
    const blockchainText = blockchainStatus ? 'Connected' : walletConnected ? 'Wallet OK, Contracts Pending' : 'Not connected';

    status += `
╠══════════════════════════════════════════════════════════════════════════╣
║  Connection Status                                                      ║
║  ───────────────────                                                    ║`;

    status += `
║  Database:    ${dbStatus.padEnd(53)}║
║  Blockchain:  ${blockchainIcon} ${blockchainText.padEnd(52)}║`;

    if (walletConnected && account) {
      status += `
║  Wallet:      ${account.addr.substring(0, 45).padEnd(53)}║`;
    }

    status += `
╠══════════════════════════════════════════════════════════════════════════╣
║  Traffic Statistics                                                     ║
║  ───────────────────                                                    ║
║  Active Connections: ${String(snapshot.activeConnections).padEnd(10)} | Total Requests: ${String(snapshot.totalRequests).padEnd(35)}║`;

    if (snapshot.recentActivity.length > 0) {
      status += `
╠══════════════════════════════════════════════════════════════════════════╣
║  Recent Activity                                                        ║
║  ─────────────────                                                     ║`;
      for (const activity of snapshot.recentActivity) {
        const icon = this.getStatusIcon(activity.status);
        const time = this.formatTimestamp(activity.timestamp);
        const statusStr = String(activity.status).padStart(3);
        const durationStr = this.formatDuration(activity.duration).padStart(6);
        status += `
║  ${icon} ${time} ${activity.method.padEnd(6)} ${activity.path.substring(0, 28).padEnd(28)} ${statusStr} ${durationStr}   ║`;
      }
    }

    status += `
╚══════════════════════════════════════════════════════════════════════════╝`;

    return status;
  }

  private formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }
}

const tracker = new ConnectionTracker();

export default tracker;

export function recordRequest(ip: string, method: string, path: string, status: number, duration: number): void {
  tracker.recordRequest(ip, method, path, status, duration);
}

export function startConnection(): void {
  tracker.startConnection();
}

export function getConnectionSnapshot(): StatusSnapshot {
  return tracker.getSnapshot();
}

export function getConnectionStatus(): string {
  return tracker.formatStatus();
}

export function resetRecentActivity(): void {
  tracker.resetRecentActivity();
}
