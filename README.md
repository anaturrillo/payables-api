# Payables — Backend

NestJS + SQLite API for the Payables invoice management app. Handles bills, approvers, cost centers, products, approval rules, and OCR via Anthropic Claude.

## Prerequisites

- Node.js 20+

## Installation

```bash
npm install
```

## Environment setup

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key used for invoice OCR |
| `PORT` | Port to listen on (default: `3000`) |

## Modes

### Development (ts-node, no build step)

Runs directly from TypeScript source with ts-node. No compilation needed — just save and restart.

```bash
npm run dev
```

Server starts on `http://localhost:3000`.

### Production (compiled)

Compile TypeScript first, then run the compiled output with Node.

```bash
npm run build   # compiles src/ → dist/
npm start       # runs dist/main.js
```

### Serving the frontend too (single server)

Copy the built frontend build into `public/` and the backend will serve it automatically alongside the API. All API routes are prefixed with `/api`; everything else serves `index.html` for client-side routing.

```bash
# From the payables/ directory:
npm run build
rm -rf ../payables-api/public
cp -r dist ../payables-api/public

# Then start the backend (dev or production mode)
npm run dev     # or: npm run build && npm start
```

The full app is then available at `http://localhost:3000`.

## Database

SQLite database is created automatically at `payables.db` on first run.

To seed initial data (approvers, cost centers, products):

```bash
npm run seed
```

## Other commands

```bash
npm test          # Run tests once
npm run test:watch  # Run tests in watch mode
```
