# RootNode - Project Handover Document

**Generated:** 2026-04-07  
**Author:** AI Assistant (Claude/OpenCode)  
**Status:** Ready for new environment

---

## 1. Project Overview

**RootNode - Agentic Service Buyer on Algorand**

An autonomous AI agent system for purchasing external API services with payments enforced on the Algorand blockchain via x402 protocol.

### Core Functionality
- Employee submits task via React frontend
- AI interpreter (Gemini) determines service type
- System discovers best provider, validates policy, processes payment via x402
- Smart contracts record spend and anchor receipts immutably
- Frontend displays real-time transaction proof from blockchain

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React - Port 5173)                                     │
│ - Task submission, results, metrics, receipts                    │
│ - Lora Explorer links for transaction verification               │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP :3001
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Express - Port 3001)                                    │
│ - AI Interpreter (Gemini)                                        │
│ - x402 Client for provider payments                              │
│ - Contract interactions via subprocess                           │
│ - KMD wallet management                                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Algorand LocalNet (:4001)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ SMART CONTRACTS (Algorand TypeScript/Puya)                       │
│ - PolicyContract (App ID: 1065) - Category whitelist, spend limits│
│ - SpendTrackerContract (App ID: 1061) - Immutable spend audit    │
│ - ReceiptAnchorContract (App ID: 1063) - Receipt hash anchoring  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ MOCK x402 PROVIDER SERVER (Port 4000)                            │
│ - Weather, Medical, Satellite, Routing, Finance endpoints         │
│ - Returns 402 for payment, then data                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Current State

### 3.1 Deployed Contracts

| Contract | App ID | Address | Status |
|----------|--------|---------|--------|
| PolicyContract | 1065 | TW7OBZK... | Deployed |
| SpendTrackerContract | 1061 | 4EZRKAB... | Deployed |
| ReceiptAnchorContract | 1063 | R2AGV63... | Deployed |

**Config file:** `projects/RootNode-backend/.contract-config.json`

### 3.2 Running Services

| Service | Port | Command |
|---------|------|---------|
| Algorand LocalNet | 4001 (algod), 4002 (kmd), 8980 (indexer) | `algokit localnet start` |
| Backend | 3001 | `cd projects/RootNode-backend && npm run dev` |
| Mock Provider | 4000 | `cd projects/RootNode-mock-provider && npm run dev` |
| Frontend | 5173 | `cd projects/RootNode-frontend && npm run dev` |

### 3.3 Wallet Configuration

- **Wallet:** DEPLOYER (in LocalNet KMD)
- **Account:** HZBVD5XH... (used for contract signing)
- **Config:** `projects/RootNode-backend/.wallet-config.json`

---

## 4. Key Technical Decisions

### 4.1 Subprocess Approach for Contract Calls

**Problem:** Direct `algosdk` calls with manual method selector encoding fail with "assert failed pc=218" at string length validation.

**Solution:** Created `scripts/callContract.cjs` that uses `AtomicTransactionComposer` for proper ABI encoding. Backend spawns subprocess to call contracts.

**Files:**
- `projects/RootNode-backend/scripts/callContract.cjs` - Subprocess script
- `projects/RootNode-backend/src/services/contractService.ts` - Uses subprocess

**Usage:**
```javascript
const result = await callContractSubprocess('recordSpend', {
  agentAddress,
  serviceId,
  amountMicroAlgos: Number(amountMicroAlgos)
});
```

### 4.2 Lora Explorer Integration

Transaction links in frontend use Lora Explorer for localnet visualization:

**URL Format:** `https://lora.algokit.io/localnet/transaction/{txId}`

**Files updated:**
- `projects/RootNode-frontend/src/components/TransactionFeed.tsx`
- `projects/RootNode-frontend/src/components/ReceiptLog.tsx`

### 4.3 Contract App ID Discovery

After localnet reset, contract IDs changed. Always verify with:

```bash
cat projects/RootNode-backend/.contract-config.json
```

Also update `projects/RootNode-backend/src/config.ts` if needed.

---

## 5. Setup Instructions for New System

### 5.1 Prerequisites
- Docker Desktop (for LocalNet)
- Node.js 18+
- npm
- AlgoKit CLI (`npm install -g @algorandfoundation/algokit`)

### 5.2 Step-by-Step Setup

```bash
# 1. Clone repository
git clone https://github.com/Rudhrakoushik10/RootNode.git
cd RootNode

# 2. Start Docker Desktop

# 3. Start LocalNet
algokit localnet start
algokit localnet status  # Verify running

# 4. Deploy contracts
cd projects/RootNode-contracts
npm install
algokit project run build
algokit project deploy localnet
# Note the App IDs from output

# 5. Update contract config if IDs changed
# Edit projects/RootNode-backend/src/config.ts
# Update contracts.policy_contract.app_id
# Update contracts.spend_tracker.app_id
# Update contracts.receipt_anchor.app_id

# 6. Start Backend
cd projects/RootNode-backend
npm install
npm run dev
# Copy wallet address shown in console

# 7. Fund backend wallet (in another terminal)
algokit wallet list  # Find sender
algokit send --from <SENDER> --to <BACKEND_ADDR> --amount 100

# 8. Start Mock Provider
cd projects/RootNode-mock-provider
npm install
npm run dev

# 9. Start Frontend
cd projects/RootNode-frontend
npm install
npm run dev
```

### 5.3 Testing the Flow

1. Open frontend at `http://localhost:5173`
2. Submit task: "Get weather for Chennai"
3. Verify:
   - Backend console shows contract calls
   - Frontend shows transaction with Lora link
   - Click link to see transaction on Lora Explorer

---

## 6. Important Files Reference

### Backend
| File | Purpose |
|------|---------|
| `src/services/contractService.ts` | Contract interactions (recordSpend, anchorReceipt) |
| `src/services/x402Client.ts` | x402 payment protocol client |
| `src/services/apiExecutor.ts` | Provider API execution |
| `src/config.ts` | Contract App IDs |
| `scripts/callContract.cjs` | Subprocess for ABI-encoded contract calls |
| `.contract-config.json` | Deployed contract IDs |
| `.wallet-config.json` | Wallet mnemonic |

### Smart Contracts
| File | Purpose |
|------|---------|
| `smart_contracts/spend_tracker/contract.algo.ts` | SpendTracker contract |
| `smart_contracts/receipt_anchor/contract.algo.ts` | ReceiptAnchor contract |
| `smart_contracts/policy/contract.algo.ts` | Policy contract |
| `smart_contracts/artifacts/*/ARC56.json` | App specs for clients |

### Frontend
| File | Purpose |
|------|---------|
| `src/components/TransactionFeed.tsx` | Transaction log with Lora links |
| `src/components/ReceiptLog.tsx` | Receipt log with Lora links |
| `src/components/TaskInput.tsx` | Task submission |
| `src/contracts/*Contract.ts` | Typed contract clients |

---

## 7. Outstanding Items

| Item | Priority | Status |
|------|----------|--------|
| Test `anchorReceiptOnChain` via subprocess | Medium | Code updated, needs testing |
| Full end-to-end demo | High | Needs verification |
| Verify Lora explorer links work | Medium | Links configured, needs verification |

### Known Issues

1. **Anchor Receipt Test Incomplete:** The `anchorReceiptOnChain` function was updated to use subprocess approach but full end-to-end testing was not completed before handover.

2. **Contract IDs May Change:** After localnet reset, contract App IDs may change. Always verify `.contract-config.json` matches `src/config.ts`.

3. **Manual Wallet Funding:** Backend wallet must be funded manually via CLI after startup.

---

## 11. Instructions to Continue Development on New System

### 11.1 Critical First Steps After Clone

```bash
# 1. Verify contract App IDs are consistent
cat projects/RootNode-backend/.contract-config.json
cat projects/RootNode-backend/src/config.ts
# Both files must have the SAME App IDs for:
# - spend_tracker
# - receipt_anchor  
# - policy_contract

# If they differ, update src/config.ts to match .contract-config.json
```

### 11.2 Quick Test - Verify Subprocess Contract Call

Before running the full flow, test the subprocess approach manually:

```bash
cd projects/RootNode-backend

# Test recordSpend (known working)
node scripts/callContract.cjs recordSpend '{"agentAddress":"HZBVD5XH7VFZUFBL6VPFGSQIONYHZB3LKS5IHPLDQIVZRBHGWGYA3LRTI","serviceId":"weather-api","amountMicroAlgos":100000}'

# Expected output: {"success":true,"txId":"...","confirmedRound":...}
```

### 11.3 Full End-to-End Testing Checklist

Follow these steps in order to verify the complete system:

#### Step 1: Start All Services
```bash
# Terminal 1 - LocalNet
algokit localnet start
algokit localnet status

# Terminal 2 - Backend
cd projects/RootNode-backend
npm run dev
# Note: backend will print wallet address - fund it

# Terminal 3 - Fund Backend Wallet
algokit wallet list
# Find an account with funds (usually has 10000+ ALGO)
algokit send --from <FUNDING_ACCOUNT> --to <BACKEND_WALLET> --amount 100

# Terminal 4 - Mock Provider
cd projects/RootNode-mock-provider
npm run dev

# Terminal 5 - Frontend
cd projects/RootNode-frontend
npm run dev
```

#### Step 2: Submit Test Task via API
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"task":"Get weather for Chennai"}'
```

#### Step 3: Verify Backend Console Shows
```
🔥 recordSpendOnChain - Using subprocess approach 🔥
✅✅✅ SPEND RECORD CONFIRMED ON-CHAIN - txId: <TXID> round: <ROUND>

🔥 anchorReceiptOnChain - Using subprocess approach 🔥
✅✅✅ RECEIPT ANCHORED ON-CHAIN - txId: <TXID> round: <ROUND>
```

#### Step 4: Verify Frontend
1. Open `http://localhost:5173`
2. Check TransactionFeed - should show transaction with Lora link
3. Check ReceiptLog - should show receipt with Lora link
4. Click Lora links - should open `https://lora.algokit.io/localnet/transaction/<TXID>`

#### Step 5: Verify On-Chain State
```bash
# Check contract state via AlgoKit
cd projects/RootNode-contracts

# Read SpendTracker global state
algokit client read global --app-id 1061

# Read ReceiptAnchor global state  
algokit client read global --app-id 1063
```

### 11.4 If anchorReceiptOnChain Fails

The `anchorReceipt` method expects `byte[]` type. If it fails:

1. Check the receipt hash format (should be hex string)
2. The subprocess script converts it: `Buffer.from(params.receiptHash, 'hex')`
3. Verify `receiptAnchorContract.appId` is correct in both config files

### 11.5 Debugging Contract Calls

```bash
# View recent transactions on localnet
algokit client list --limit 20

# Get specific transaction details
algokit client read --txid <TXID>

# Check contract logs
algokit client read local --app-id <APPID> --address <WALLET>
```

### 11.6 Quick Fix - Reset LocalNet and Redeploy

If everything is broken and you need a clean start:

```bash
# 1. Stop all services
# 2. Reset localnet
algokit localnet reset

# 3. Redeploy contracts
cd projects/RootNode-contracts
algokit project deploy localnet
# COPY the new App IDs from output!

# 4. Update BOTH files with new IDs:
# - projects/RootNode-backend/.contract-config.json
# - projects/RootNode-backend/src/config.ts

# 5. Restart all services
```

### 11.7 Verification Success Criteria

The system is working correctly when:

- [ ] `recordSpendOnChain` returns real txId (verified in backend console)
- [ ] `anchorReceiptOnChain` returns real txId (verified in backend console)
- [ ] Frontend TransactionFeed shows transaction with Lora link
- [ ] Frontend ReceiptLog shows receipt with Lora link
- [ ] Clicking Lora links opens valid transaction page
- [ ] Contract state reflects new transactions (totalSpent, totalReceipts increment)

---

## 8. Environment Variables

### Backend (.env)
```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=admin
MYSQL_DATABASE=rootnode_db
GEMINI_API_KEY=<your_api_key>
PORT=3001
```

### Mock Provider (.env)
```
PORT=4000
ALGOD_SERVER=http://localhost:4001
ALGOD_TOKEN=aaaaa
PAYMENT_AMOUNT=1000000
```

---

## 9. Troubleshooting

### LocalNet Connection Errors
```bash
algokit localnet status
algokit localnet reset
```

### Contract Call Failures
- Check contract IDs match in `.contract-config.json` and `src/config.ts`
- Verify wallet is funded
- Check backend console for subprocess errors

### Frontend Not Showing Transactions
- Verify backend is running and connected to LocalNet
- Check browser console for API errors
- Verify contract calls returned txId

---

## 10. Git History

| Commit | Description |
|--------|-------------|
| `1cb8fbf` | Initial commit - "feat: Agentic Service Buyer on Algorand - complete system" |
| `efd2ae7` | Latest - "feat: Add contract integration, Lora explorer, subprocess calling, frontend improvements" |

**This handover covers:** All changes including contract integration, Lora explorer, subprocess calling approach, and frontend improvements.

---

## 12. Key Contacts / Notes for Next Developer

- **Original Developer:** AI Assistant (Claude/OpenCode)
- **Project Purpose:** Demo for blockchain transaction verification on Algorand
- **Key Demo Goal:** Show real blockchain txIds and Lora explorer links in frontend

### If You Need Help
1. AlgoKit docs: https://dev.algorand.co
2. Algorand Foundation repos: https://github.com/algorandfoundation
3. Puya (TypeScript contracts): https://github.com/algorandfoundation/puya-ts
4. x402 Protocol: https://x402.org

---

*End of Handover Document*
