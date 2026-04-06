# RootNode LocalNet Deployment Guide

This guide walks through deploying the complete RootNode system on Algorand LocalNet.

## Prerequisites

1. **Docker Desktop** - Required for LocalNet
2. **MySQL** - Database for services and transactions
3. **Node.js 18+** - For running backend and frontend

## Step 1: Start Docker Desktop

Make sure Docker Desktop is running before proceeding.

## Step 2: Setup MySQL Database

### Option A: Using MySQL CLI

```bash
mysql -u root -p < projects/RootNode-backend/sql/setup_database.sql
```

### Option B: Using MySQL Workbench

1. Connect to MySQL server
2. Open `projects/RootNode-backend/sql/setup_database.sql`
3. Execute the script

### Verify Database Setup

```sql
USE rootnode_db;
SELECT * FROM services;
```

You should see 6 services with endpoints pointing to `http://localhost:4000/api/...`

## Step 3: Start Algorand LocalNet

```bash
cd projects/RootNode-contracts
algokit localnet start
```

Verify LocalNet is running:
```bash
algokit localnet status
```

## Step 4: Deploy Smart Contracts

```bash
cd projects/RootNode-contracts
npm install
algokit project run build
algokit project deploy localnet
```

**Expected Output:**
```
Deploying PolicyContract: App ID 1234
Deploying SpendTrackerContract: App ID 1235
Deploying ReceiptAnchorContract: App ID 1236
Deploying EscrowContract: App ID 1237
```

**Note down the App IDs** - you'll need them for Step 6.

## Step 5: Configure Backend with Contract App IDs

After deployment, create/edit `projects/RootNode-backend/.contract-config.json`:

```json
{
  "policyContract": {
    "appId": <YOUR_POLICY_APP_ID>,
    "deployedAt": "<TIMESTAMP>"
  },
  "spendTrackerContract": {
    "appId": <YOUR_SPEND_TRACKER_APP_ID>,
    "deployedAt": "<TIMESTAMP>"
  },
  "receiptAnchorContract": {
    "appId": <YOUR_RECEIPT_ANCHOR_APP_ID>,
    "deployedAt": "<TIMESTAMP>"
  },
  "escrowContract": {
    "appId": <YOUR_ESCROW_APP_ID>,
    "deployedAt": "<TIMESTAMP>"
  }
}
```

## Step 6: Fund Backend Wallet

The backend will print a wallet address when started. Fund it:

```bash
# Get accounts from localnet wallet
algokit wallet list

# Send Algo to backend wallet
algokit send --from <SENDER_ADDRESS> --to <BACKEND_WALLET_ADDRESS> --amount 100
```

**Alternative using goal CLI:**
```bash
goal clerk send -f <SENDER> -t <BACKEND_WALLET> -a 100
```

## Step 7: Start Mock x402 Provider Server

```bash
cd projects/RootNode-mock-provider
npm install
npm run dev
```

**Expected Output:**
```
  RootNode Mock x402 Provider Server
  Port: 4000
  Algod: http://localhost:4001
  Payment Amount: 1 ALGO

Endpoints:
  GET /api/weather
  GET /api/medical
  GET /api/satellite
  GET /api/routing
  GET /api/finance
```

## Step 8: Start Backend Server

```bash
cd projects/RootNode-backend
npm install
npm run dev
```

**Expected Output:**
```
  🚀 Starting RootNode Backend Server...

  📦 Connecting to Database...
  ✅ Database connected successfully

  🔗 Initializing Blockchain connection...
  ✅ Blockchain wallet initialized
  ✅ Smart contracts initialized

  ╔═══════════════════════════════════════════════════════════════════╗
  ║              BACKEND WALLET - FUND REQUIRED                       ║
  ║  Address: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX   ║
  ╚═══════════════════════════════════════════════════════════════════╝
```

**If wallet needs funding, you'll see a warning. Go back to Step 6.**

## Step 9: Start Frontend

```bash
cd projects/RootNode-frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Step 10: Test the System

### Test 1: Health Check

```bash
curl http://localhost:3000/api/health
```

### Test 2: Submit a Task

```bash
curl -X POST http://localhost:3000/api/task \
  -H "Content-Type: application/json" \
  -d '{"task": "Get weather for Chennai"}'
```

### Test 3: Check Metrics

```bash
curl http://localhost:3000/api/metrics
```

### Test 4: Check Contracts Status

```bash
curl http://localhost:3000/api/contracts
```

## x402 Payment Flow

```
1. Frontend → Backend: Task request
2. Backend → AI: Interpret task
3. Backend → Database: Find provider
4. Backend → PolicyContract: Validate policy
5. Backend → Provider (localhost:4000): Request API
6. Provider → Backend: 402 Payment Required
7. Backend → Algorand: Submit payment tx
8. Backend → Provider: Retry with payment proof
9. Provider → Backend: Return data
10. Backend → SpendTracker: Record spend
11. Backend → ReceiptAnchor: Anchor receipt
12. Backend → Frontend: Return result
```

## Troubleshooting

### Database Connection Failed
```bash
# Check MySQL is running
mysql -u root -p -e "SHOW DATABASES;"
# Should show rootnode_db
```

### LocalNet Not Running
```bash
algokit localnet status
# If not running:
algokit localnet start
```

### Wallet Balance Low
```bash
# Check balance
curl http://localhost:3000/api/wallet
# Fund if needed
algokit send --from <SENDER> --to <WALLET> --amount 100
```

### Provider Connection Refused
```bash
# Check mock provider is running
curl http://localhost:4000/api/health
# If not running, start it
cd projects/RootNode-mock-provider && npm run dev
```

## Cleanup

To reset everything:

```bash
# Stop all servers (Ctrl+C)
# Reset localnet
algokit localnet reset
# Delete config files
rm projects/RootNode-backend/.wallet-config.json
rm projects/RootNode-backend/.contract-config.json
# Restart from Step 3
```

## Moving to TestNet

When ready for TestNet:

1. Update `.env` files with TestNet endpoints
2. Get TestNet Algo from dispenser
3. Deploy contracts to TestNet
4. Update `.contract-config.json`
5. Use real x402 providers (or deploy mock to TestNet)

See `TESTNET_MIGRATION.md` for detailed instructions.
