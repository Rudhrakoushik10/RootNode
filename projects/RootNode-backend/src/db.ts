import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool: mysql.Pool | null = null;

pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'admin',
  database: process.env.MYSQL_DATABASE || 'rootnode_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export interface Service {
  id: number;
  name: string;
  provider: string;
  provider_wallet: string;
  price_algo: number;
  category: string;
  endpoint: string;
  description: string;
  rating: number;
  avg_response_time_ms: number;
}

export interface Transaction {
  id: number;
  service_name: string;
  status: string;
  amount_algo: number;
  txid: string | null;
  timestamp: string;
  note: string | null;
  reason: string | null;
  provider: string;
}

export interface Receipt {
  id: number;
  service_name: string;
  amount_algo: number;
  txid: string;
  receipt_hash: string;
  timestamp: string;
  hash_on_chain: boolean;
  provider: string;
}

export async function initializeDatabase(): Promise<void> {
  const createServicesTable = `
    CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      provider VARCHAR(255) NOT NULL,
      provider_wallet VARCHAR(255) NOT NULL,
      price_algo DECIMAL(10, 6) NOT NULL,
      category VARCHAR(100) NOT NULL,
      endpoint VARCHAR(500) NOT NULL,
      description TEXT,
      rating DECIMAL(3, 2) DEFAULT 4.0,
      avg_response_time_ms INT DEFAULT 500
    )
  `;

  const createTransactionsTable = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      service_name VARCHAR(255) NOT NULL,
      status ENUM('success', 'rejected', 'pending', 'refunded') NOT NULL,
      amount_algo DECIMAL(10, 6) NOT NULL,
      txid VARCHAR(100),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      note TEXT,
      reason TEXT,
      provider VARCHAR(255) NOT NULL
    )
  `;

  const createReceiptsTable = `
    CREATE TABLE IF NOT EXISTS receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      service_name VARCHAR(255) NOT NULL,
      amount_algo DECIMAL(10, 6) NOT NULL,
      txid VARCHAR(100),
      receipt_hash VARCHAR(255) NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      hash_on_chain BOOLEAN DEFAULT FALSE,
      provider VARCHAR(255) NOT NULL
    )
  `;

  try {
    await pool!.execute(createServicesTable);
    await pool!.execute(createTransactionsTable);
    await pool!.execute(createReceiptsTable);
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

export async function getServices(): Promise<Service[]> {
  const [rows] = await pool!.execute('SELECT * FROM services');
  return rows as Service[];
}

export async function getServiceByName(name: string): Promise<Service | null> {
  const [rows] = await pool!.execute('SELECT * FROM services WHERE name = ?', [name]);
  const services = rows as Service[];
  return services[0] || null;
}

export async function getTransactions(): Promise<Transaction[]> {
  const [rows] = await pool!.execute('SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 50');
  return rows as Transaction[];
}

export async function createTransaction(tx: Omit<Transaction, 'id'>): Promise<number> {
  const [result] = await pool!.execute(
    'INSERT INTO transactions (service_name, status, amount_algo, txid, note, reason, provider) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [tx.service_name, tx.status, tx.amount_algo, tx.txid, tx.note, tx.reason, tx.provider]
  );
  return (result as mysql.ResultSetHeader).insertId;
}

export async function getReceipts(): Promise<Receipt[]> {
  const [rows] = await pool!.execute('SELECT * FROM receipts ORDER BY timestamp DESC LIMIT 50');
  return rows as Receipt[];
}

export async function createReceipt(receipt: Omit<Receipt, 'id'>): Promise<number> {
  const [result] = await pool!.execute(
    'INSERT INTO receipts (service_name, amount_algo, txid, receipt_hash, hash_on_chain, provider) VALUES (?, ?, ?, ?, ?, ?)',
    [receipt.service_name, receipt.amount_algo, receipt.txid, receipt.receipt_hash, receipt.hash_on_chain, receipt.provider]
  );
  return (result as mysql.ResultSetHeader).insertId;
}

export async function getMetrics() {
  const [spent] = await pool!.execute('SELECT COALESCE(SUM(amount_algo), 0) as total FROM transactions WHERE status = ?', ['success']);
  const [count] = await pool!.execute('SELECT COUNT(*) as count FROM transactions WHERE status = ?', ['success']);
  const [rejections] = await pool!.execute('SELECT COUNT(*) as count FROM transactions WHERE status = ?', ['rejected']);
  const [refunds] = await pool!.execute('SELECT COUNT(*) as count FROM transactions WHERE status = ?', ['refunded']);

  const budget = 0.5;
  const totalSpent = (spent as any)[0].total;

  return {
    total_spent_algo: parseFloat(totalSpent) || 0,
    budget_algo: budget,
    remaining_algo: parseFloat((budget - totalSpent).toFixed(3)),
    services_purchased: (count as any)[0].count || 0,
    policy_rejections: (rejections as any)[0].count || 0,
    escrow_refunds: (refunds as any)[0].count || 0,
    categories_used: 3,
  };
}
