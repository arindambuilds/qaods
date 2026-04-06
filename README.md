# Q-AODS — AI-Orchestrated Development System

> A structured, score-gated multi-agent pipeline for AI-assisted software development, built with XState v5, Next.js, and TypeScript.

---

## The Problem

Most AI coding tools fire a single prompt and hope for the best. There is no structured retry logic, no audit trail, no way to know whether the output actually met the requirements, and no clean separation between the orchestration layer and the agents doing the work.

Q-AODS solves this by running every task through a formal finite state machine that coordinates four agents in sequence, scores the result against a quality threshold, and automatically iterates up to a configurable limit before surfacing a typed failure with full context.

---

## Key Features

- **XState v5 FSM orchestration** — a `createMachine` definition drives the full pipeline: `IDLE → PENDING → STRATEGIST → RESEARCHER → EXECUTOR → AUDITOR → MERGED / ITERATE / FAILED`.
- **Score-gated retry loop** — the Auditor scores output 0–100; anything below the HSCC threshold (85) triggers an automatic iteration, up to `MAX_ITERATIONS` (2).
- **Structured logging** — a transport-based `QAODSLogger` with `ConsoleTransport` (pretty in dev, JSON lines in prod), `LocalStorageTransport`, and a no-op `RemoteTransport` stub. All log events carry `level`, `domain`, `event`, `timestamp`, and `sessionId`.
- **Append-only audit trail** — `auditLogger` records exactly five FSM trigger points (`AUDIT_STARTED`, `AUDIT_RESULT`, `TASK_MERGED`, `ITERATION_TRIGGERED`, `TASK_FAILED`) keyed by task ID in localStorage.
- **Versioned persistence adapter** — `LocalStoragePersistenceAdapter` stores tasks under `qaods:task:{userId}:{taskId}` with a `PersistedTask` wrapper and a migration system (`v0 → v1`) for schema upgrades. Designed to be swapped for a Supabase or Postgres adapter with no changes to the FSM or agents.
- **Typed error taxonomy + retry helper** — `QAODSError` hierarchy (`ValidationError`, `FSMError`, `ExecutionError`, `AuditError`, `PersistenceError`, `NetworkError`) with `retryable` flags. `withAgentRetry` applies exponential backoff (500 ms → 1 s → 2 s) and short-circuits immediately on non-retryable errors.
- **Dev tooling** — `FSMInspector` overlay (dev-only), `QAODSErrorBoundary` React class component, `devSeeds` for pre-populating the adapter, and dynamic `@xstate/inspect` wiring.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Component Layer  (src/components/qaods/)               │
│  TaskForm · TaskList · TaskDetail · PromptPanel         │
│  AuditLogViewer · QAODSErrorBoundary · FSMInspector     │
└────────────────────────┬────────────────────────────────┘
                         │ useMachine / send
┌────────────────────────▼────────────────────────────────┐
│  FSM Control Layer  (src/lib/qaods/machine.ts)          │
│  qaodsMachine — XState v5 createMachine                 │
│  States: IDLE · PENDING · STRATEGIST · RESEARCHER       │
│          EXECUTOR · AUDITOR · ITERATE · MERGED · FAILED │
└──┬──────────┬──────────┬──────────┬──────────┬──────────┘
   │          │          │          │          │
┌──▼──┐  ┌───▼───┐  ┌───▼───┐  ┌───▼───┐  ┌──▼──────────┐
│Strat│  │Prompt │  │Execut │  │Auditor│  │Infrastructure│
│egist│  │Genera-│  │or     │  │       │  │              │
│     │  │tor    │  │       │  │score  │  │logger        │
│valid│  │Prompt │  │delta  │  │0-100  │  │auditLogger   │
│plan │  │Payload│  │files  │  │passed?│  │persistence   │
└─────┘  └───────┘  └───────┘  └───────┘  │migrations    │
                                           │errors/retry  │
                                           └──────────────┘
```

**Layer breakdown:**

- `src/app/qaods/page.tsx` — page root; owns `useMachine`, loads tasks on mount, passes slices to children.
- `src/components/qaods/` — pure UI components, each wrapped in `React.memo`.
- `src/lib/qaods/machine.ts` — XState v5 machine; all agent invocations happen here via `fromPromise` + `withAgentRetry`.
- `src/lib/qaods/strategist.ts` — validates task, produces `StrategyResult` with `executionPlan`.
- `src/lib/qaods/promptGenerator.ts` — builds structured `PromptPayload` with budget enforcement and delta audit history on iterations.
- `src/lib/qaods/executor.ts` — runs the execution step, returns `ExecutionResult` (`delta`, `filesChanged`, `status`).
- `src/lib/qaods/auditor.ts` — scores output 0–100, returns `AuditResult` with `AuditBreakdown`.
- `src/lib/qaods/logger.ts` — transport-based structured logger singleton.
- `src/lib/qaods/auditLogger.ts` — append-only audit trail, localStorage-backed.
- `src/lib/qaods/persistence.ts` — async `PersistenceAdapter` interface + `LocalStoragePersistenceAdapter`.
- `src/lib/qaods/migrations.ts` — schema migration runner (`migrateTask`).
- `src/lib/qaods/errors.ts` — typed error hierarchy.
- `src/lib/qaods/retry.ts` — `withAgentRetry` with exponential backoff.

---

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm** 9+

### Repo structure

```
qaods/           ← Next.js app (next.config.ts, package.json, app/ router)
  app/qaods/     ← serves the /qaods route
  node_modules/  ← install here
src/             ← TypeScript source (lib, components, app) used by the Next.js app
```

The runnable Next.js application lives in the `qaods/` subdirectory. All `npm` commands must be run from **inside `qaods/`**, not the repo root.

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/arindambuilds/qaods.git

# 2. Enter the Next.js app directory
cd qaods/qaods

# 3. Install dependencies
npm install

# 4. Start the dev server
npm run dev
```

The terminal will print:

```
▲ Next.js 16.x.x
- Local: http://localhost:3000
```

Open **[http://localhost:3000/qaods](http://localhost:3000/qaods)** in your browser.

> **Troubleshooting — "localhost refused to connect":**
> - Make sure you ran `npm install` and `npm run dev` from inside the `qaods/qaods/` directory, not the repo root.
> - The repo root `package.json` has no Next.js — running `npm run dev` there will do nothing.
> - If port 3000 is already in use, Next.js will automatically try 3001, 3002, etc. Check the terminal output for the actual URL.
> - To stop a previous server: `Ctrl+C` in the terminal running it, or `npx kill-port 3000`.

---

## Running the Pipeline

### Create a task

1. Click **+ New Task** in the top-right corner.
2. Fill in a title, description, component name, and file path.
3. Click **Create Task** — the FSM immediately transitions from `IDLE → PENDING` and begins the pipeline.

### Watch the pipeline progress

The FSM state is shown next to the **TASK DETAIL** header. You will see it move through:

```
IDLE → PENDING → STRATEGIST → RESEARCHER → EXECUTOR → AUDITOR → MERGED
```

If the audit score is below 85 and iterations remain, it loops:

```
AUDITOR → ITERATE → RESEARCHER → EXECUTOR → AUDITOR → ...
```

### Trigger the failure path

To force a `FAILED` outcome, open `src/lib/qaods/auditor.ts` and temporarily lower the simulated scores so the average falls below 85. After two iterations the FSM will transition to `FAILED` and display the error code and message in the Task Detail panel.

Alternatively, click **Reject** in the Task Detail panel while the FSM is in the `AUDITOR` state.

### Reset

Click **Reset** in the Task Detail panel (visible in `FAILED` state) to clear the FSM context and return to `IDLE`.

### Dev inspector

In development mode, a fixed overlay in the bottom-right corner shows the live FSM state and full context JSON. The `@xstate/inspect` devtools are also wired automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19, Tailwind CSS v4 |
| State machine | [XState](https://stately.ai/docs) v5 + `@xstate/react` v4 |
| Persistence | `localStorage` (versioned, migration-ready) |
| Dev tooling | `@xstate/inspect`, FSMInspector overlay, devSeeds |

---

## Status & Roadmap

This is a **local-first architecture prototype**. The agent layer (strategist, executor, auditor) uses simulated logic — the contracts, FSM topology, error handling, logging, and persistence are production-grade and ready for real integrations.

Potential next steps:

- [ ] Swap `LocalStoragePersistenceAdapter` for a Supabase or Postgres adapter.
- [ ] Wire real LLM calls (OpenAI / Anthropic) into the executor and auditor agents.
- [ ] Add a `REVIEW` state between `AUDITOR` and `MERGED` for human-in-the-loop approval.
- [ ] Expose a REST/WebSocket API so the FSM can be driven from a CLI or CI pipeline.
- [ ] Add property-based tests (fast-check) to validate FSM guard exclusivity and audit score invariants.

---

## Security & Hardening

### Current state (local-first prototype)

- **Single-user, no auth** — this is a local-first prototype. There are no server-side secrets, no authentication layer, and no multi-user isolation beyond scoped localStorage keys (`qaods:task:{userId}:{taskId}`).
- **No secrets in localStorage** — the persistence adapter stores only task metadata (title, description, component, filePath, priority, tags, status). `PromptPayload` (which may contain sensitive task context) is explicitly never persisted.
- **No `localStorage.clear()`** — all cleanup goes through the scoped adapter (`deleteTask`, `deleteLog`). No bulk wipes.
- **No unsafe HTML** — zero `dangerouslySetInnerHTML` usage. All user-supplied strings are rendered as plain text via React's default escaping.
- **Structured logging with metadata only** — log events at `info` level carry only IDs, scores, character counts, and status flags — not raw prompt text or full user input. Full prompt content is only emitted at `debug` level (suppressed in production via `filterLevel: 'warn'`).
- **HTTP security headers** — `next.config.ts` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `X-XSS-Protection`, and `Permissions-Policy` on all routes.
- **Dev tooling is dev-only** — `@xstate/inspect`, `FSMInspector`, and `devSeeds` are all guarded by `process.env.NODE_ENV === 'development'` and `typeof window !== 'undefined'` checks. The inspect import uses an indirect string to prevent Turbopack from bundling it in production.

### Future SaaS hardening checklist

- [ ] **Auth layer** — add NextAuth / Auth.js / Supabase Auth; gate all routes and API endpoints.
- [ ] **Content-Security-Policy** — add a nonce-based CSP header in `next.config.ts` once the auth/API layer is in place.
- [ ] **HTTPS + HSTS** — enforce `Strict-Transport-Security` at the CDN/reverse-proxy layer (Vercel/Cloudflare handle this automatically).
- [ ] **Server-side input validation** — add Zod schemas on all API routes / server actions before any DB writes.
- [ ] **Move logs to backend** — replace `LocalStorageTransport` with a `RemoteTransport` that POSTs to `/api/logs` (already stubbed) with auth headers; add rate limiting.
- [ ] **Secrets management** — use environment variables (`.env.local`, Vercel env) for API keys; never commit `.env` files.
- [ ] **Supabase RLS** — when swapping the persistence adapter, enable Row-Level Security policies scoped to `userId`/`teamId`.

---

## License

[MIT](LICENSE)
