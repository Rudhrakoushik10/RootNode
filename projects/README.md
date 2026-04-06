# RootNode - Agentic Service Buyer on Algorand

An autonomous AI agent system for purchasing external API services with payments enforced on the Algorand blockchain via x402 protocol.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                                │
│ Employee submits tasks, views results, metrics, receipts          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Node.js/Express)                                        │
│ AI Interpreter | Provider Discovery | x402 Client | Wallet       │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Algorand LocalNet
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ SMART CONTRACTS                                                  │
│ PolicyContract | SpendTracker | ReceiptAnchor                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ MOCK x402 PROVIDER SERVER (Node.js)                             │
│ Simulates service providers (weather, medical, etc.)             │
└─────────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Start Docker Desktop

LocalNet requires Docker to run.

### 2. Start Algorand LocalNet

```bash
algokit localnet start
```

Verify it's running:
```bash
algokit localnet status
```

### 3. Deploy Smart Contracts

Navigate to contracts folder and deploy:

```bash
cd projects/RootNode-contracts
npm install
algokit project run build
algokit project deploy localnet
```

This deploys:
- **PolicyContract** - Category whitelist & spend limits
- **SpendTrackerContract** - Immutable spend audit trail
- **ReceiptAnchorContract** - Immutable receipt hash record

### 4. Fund Backend Wallet

When you start the backend, it will print a wallet address. Fund it manually:

```bash
algokit send --from <SENDER_ADDRESS> --to <BACKEND_WALLET_ADDRESS> --amount 100
```

You can get accounts from localnet:
```bash
algokit wallet list
```

### 5. Start Backend Server

```bash
cd projects/RootNode-backend
npm install
npm run dev
```

The backend will:
- Connect to localnet via KMD
- Generate/use a backend wallet
- Print the wallet address for funding
- Wait for manual funding

### 6. Start Mock x402 Provider Server

```bash
cd projects/RootNode-mock-provider
npm install
npm run dev
```

This provides x402-protected endpoints:
- `GET /api/weather` - Weather data
- `GET /api/medical` - Medical records
- `GET /api/satellite` - Satellite imagery
- `GET /api/routing` - Route planning
- `GET /api/finance` - Financial data

### 7. Start Frontend

```bash
cd projects/RootNode-frontend
npm install
npm run dev
```

### 8. Test the Flow

Submit a task like: "Get weather for Chennai"

The backend will:
1. Interpret the task (AI/Gemini)
2. Select best provider
3. Validate against PolicyContract
4. Pay provider via x402
5. Anchor receipt on ReceiptAnchorContract
6. Return result to frontend

## x402 Payment Flow

```
1. Backend calls provider endpoint
2. Provider returns 402 + payment requirements
3. Backend constructs Algorand payment tx
4. Backend submits to localnet
5. Backend verifies payment on-chain
6. Backend retries with payment proof
7. Provider verifies and returns data
```

## Project Structure

```
projects/
├── RootNode-frontend/         # React frontend
├── RootNode-backend/          # Express backend
│   └── src/
│       ├── services/
│       │   ├── walletService.ts     # KMD + wallet management
│       │   ├── x402Client.ts        # x402 protocol client
│       │   ├── contractService.ts   # Contract interactions
│       │   ├── apiExecutor.ts       # Provider calls via x402
│       │   ├── policyEngine.ts      # Policy validation
│       │   └── receiptService.ts    # Receipt anchoring
│       └── index.ts
├── RootNode-contracts/        # Smart contracts
│   └── smart_contracts/
│       ├── policy/            # PolicyContract
│       ├── spend_tracker/     # SpendTrackerContract
│       ├── receipt_anchor/    # ReceiptAnchorContract
│       └── escrow/            # EscrowContract
└── RootNode-mock-provider/    # Mock x402 provider server
    └── src/index.ts
```

## Environment Variables

### Backend (.env)
```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=admin
MYSQL_DATABASE=rootnode_db
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
```

### Mock Provider (.env)
```
PORT=4000
ALGOD_SERVER=http://localhost:4001
ALGOD_TOKEN=aaaaa
PAYMENT_AMOUNT=1000000  # 1 ALGO in microAlgos
```

## Notes

- No GoPlausible facilitator - payments verified directly on Algorand blockchain
- Backend wallet persists across restarts (stored in .wallet-config.json)
- Contract app IDs stored in .contract-config.json
- Manual CLI funding is required once per wallet
