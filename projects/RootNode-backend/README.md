# RootNode Backend

Backend server for the Agentic Service Buyer on Algorand.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

3. Create MySQL database:
```sql
CREATE DATABASE rootnode_db;
```

4. Start server:
```bash
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/task` | Submit task for processing |
| GET | `/api/metrics` | Get spending metrics |
| GET | `/api/transactions` | Get transaction history |
| GET | `/api/receipts` | Get receipt log |
| GET | `/api/contracts` | Get contract states |
| GET | `/api/services` | List available API services |

## Task Flow

1. User submits task via POST `/api/task`
2. AI Interpreter extracts intent and category
3. Service Registry finds matching providers
4. Provider Comparison selects best provider
5. Policy Engine validates against rules
6. API Executor calls selected provider
7. Receipt generated with SHA-256 hash
8. Transaction recorded in database
