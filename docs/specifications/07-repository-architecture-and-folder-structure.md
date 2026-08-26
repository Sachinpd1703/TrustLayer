# Repository Architecture & Folder Structure Specification
## Project: TrustLayer — Gated & Explainable Authorization Gateway for Autonomous Agentic Commerce on Razorpay

---

## 1. Architectural Paradigm: Domain-Driven Modular Gateway

TrustLayer is architected as a full-stack, domain-driven TypeScript application powered by **Next.js 14/15 (App Router)**. It adheres to **Clean Architecture** principles across 4 orthogonal layers:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Presentation Layer (React 18/19, Tailwind, Dual-Theme, Bento UI)    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. API Gateway & Transport Layer (Next.js App Router API Routes + SSE) │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Core Domain & Security Engine (Policy PDP/PEP, IAM, Hash Chain, ML) │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Infrastructure & Integration (Prisma + PostgreSQL, Razorpay SDK)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Directory Structure

```text
TrustLayer/
├── 📁 .github/                   # CI/CD workflows, linting, test pipelines
│   └── 📁 workflows/
│       └── 📝 ci.yml
│
├── 📁 docs/                      # Complete specifications, diagrams & research
│   ├── 📁 architecture/
│   ├── 📁 diagram/
│   ├── 📁 research/
│   └── 📁 specifications/
│       ├── 📝 01-product-requirements-document.md
│       ├── 📝 02-technical-requirements-document.md
│       ├── 📝 03-app-flow-document.md
│       ├── 📝 04-ui-ux-design-brief.md
│       ├── 📝 05-backend-schema-document.md
│       ├── 📝 06-implementation-plan.md
│       └── 📝 07-repository-architecture-and-folder-structure.md
│
├── 📁 prisma/                    # PostgreSQL Database Schema & Seeding
│   ├── 📝 schema.prisma          # Prisma schema with Postgres models & indexes
│   └── 📝 seed.ts                # Initial mock agents, policies, and test data
│
├── 📁 public/                    # Static assets, SVG badges, brand logos
│
├── 📁 src/                       # Application Source Code
│   ├── 📁 app/                   # Next.js App Router (Pages & API Endpoints)
│   │   ├── 📁 (dashboard)/       # Dashboard Route Group
│   │   │   ├── 📝 layout.tsx     # Dashboard Shell (Sidebar + Header + Sonner Toaster)
│   │   │   ├── 📝 page.tsx       # Live Traffic Stream & Bento Metrics Dashboard
│   │   │   ├── 📁 approvals/     # Human-in-the-Loop (HITL) Queue Page
│   │   │   │   └── 📝 page.tsx
│   │   │   ├── 📁 policies/      # Policy & Spend Guardrails Config Page
│   │   │   │   └── 📝 page.tsx
│   │   │   ├── 📁 agents/        # Agent Registry & Emergency Kill-Switch Page
│   │   │   │   └── 📝 page.tsx
│   │   │   ├── 📁 audit/         # Cryptographic Audit Explorer Page
│   │   │   │   └── 📝 page.tsx
│   │   │   └── 📁 simulator/     # Interactive AI Agent Test Runner Page
│   │   │       └── 📝 page.tsx
│   │   │
│   │   ├── 📁 api/               # Machine-to-Machine Gateway APIs
│   │   │   └── 📁 v1/
│   │   │       ├── 📁 agent/
│   │   │       │   └── 📁 propose-payment/
│   │   │       │       └── 📝 route.ts  # POST /api/v1/agent/propose-payment (Core PEP)
│   │   │       ├── 📁 approvals/
│   │   │       │   ├── 📝 route.ts      # GET /api/v1/approvals (List pending)
│   │   │       │   └── 📁 [id]/
│   │   │       │       └── 📁 decide/
│   │   │       │           └── 📝 route.ts # POST /api/v1/approvals/:id/decide
│   │   │       ├── 📁 agents/
│   │   │       │   ├── 📝 route.ts      # GET/POST /api/v1/agents
│   │   │       │   └── 📁 [agentId]/
│   │   │       │       └── 📁 kill-switch/
│   │   │       │           └── 📝 route.ts # POST emergency suspension
│   │   │       ├── 📁 policies/
│   │   │       │   └── 📝 route.ts      # GET/PUT /api/v1/policies
│   │   │       ├── 📁 audit/
│   │   │       │   ├── 📝 route.ts      # GET /api/v1/audit (Query logs)
│   │   │       │   └── 📁 verify/
│   │   │       │       └── 📝 route.ts  # GET /api/v1/audit/verify (Verify hash-chain)
│   │   │       ├── 📁 webhooks/
│   │   │       │   └── 📁 razorpay/
│   │   │       │       └── 📝 route.ts  # Ingest Razorpay payment capture webhooks
│   │   │       └── 📁 events/
│   │   │           └── 📁 stream/
│   │   │               └── 📝 route.ts  # Server-Sent Events (SSE) for real-time UI
│   │   │
│   │   ├── 📝 layout.tsx         # Root Layout (Theme Provider, Global Fonts)
│   │   └── 📝 globals.css        # Tailwind CSS + Custom Dual-Theme CSS variables
│   │
│   ├── 📁 components/            # UI Components (Client & Server)
│   │   ├── 📁 layout/            # Shell Components
│   │   │   ├── 📝 header.tsx     # Top Navbar, Environment Badge & Stats
│   │   │   ├── 📝 sidebar.tsx    # Navigation Menu
│   │   │   └── 📝 theme-toggle.tsx # Light/Dark Sun/Moon switch
│   │   ├── 📁 dashboard/         # Dashboard Specific Widgets
│   │   │   ├── 📝 metrics-bento.tsx     # 4 Bento Cards (Volume, Pass %, Blocked, Pending)
│   │   │   ├── 📝 live-stream-feed.tsx  # Real-time scrolling transaction cards
│   │   │   ├── 📝 transaction-card.tsx   # Individual transaction item with badges
│   │   │   └── 📝 explainability-drawer.tsx # LLM Intent, Reasoning & Policy Matrix
│   │   ├── 📁 approvals/         # Human-in-the-Loop Components
│   │   │   ├── 📝 approval-list.tsx
│   │   │   └── 📝 approval-modal.tsx    # 1-Click Approve/Reject Dialog
│   │   ├── 📁 simulator/         # Interactive Demo Components
│   │   │   ├── 📝 scenario-runner.tsx   # Presets: Allowed, Approval, Blocked
│   │   │   └── 📝 execution-stepper.tsx # [Thinking -> Evaluating -> Razorpay -> Audit]
│   │   └── 📁 ui/                # shadcn/ui primitives (Button, Dialog, Badge, Tabs, Sonner, etc.)
│   │
│   ├── 📁 hooks/                 # Custom React Hooks
│   │   ├── 📝 use-live-stream.ts # Server-Sent Events (SSE) consumer hook
│   │   └── 📝 use-approvals.ts   # Approvals state, polling & mutation hook
│   │
│   ├── 📁 lib/                   # Core Business Logic & Infrastructure
│   │   ├── 📝 config.ts          # Zod-validated Environment Variables
│   │   ├── 📁 db/
│   │   │   └── 📝 prisma.ts      # Global Prisma Client Singleton
│   │   ├── 📁 engine/            # CORE POLICY DECISION POINT (PDP)
│   │   │   ├── 📝 policy-evaluator.ts   # Evaluates Spend Caps, MCCs, Merchant Whitelist
│   │   │   ├── 📝 velocity-tracker.ts   # In-Memory/Redis Sliding-Window Rate Limiter
│   │   │   ├── 📝 risk-scorer.ts        # Prompt Injection heuristic & Anomaly detector
│   │   │   └── 📝 decision-router.ts    # Routes ALLOW / REQUIRE_APPROVAL / DENY
│   │   ├── 📁 security/          # Cryptography & Security Modules
│   │   │   ├── 📝 agent-auth.ts         # Ed25519 signature validation & Replay checks
│   │   │   └── 📝 audit-chain.ts        # SHA-256 Hash Chaining & Merkle Integrity
│   │   ├── 📁 razorpay/          # Razorpay Integration Adapter
│   │   │   ├── 📝 client.ts             # Official Razorpay Node SDK Client
│   │   │   └── 📝 webhook-verifier.ts   # HMAC-SHA256 Signature validator
│   │   ├── 📁 events/            # Real-Time Event Bus
│   │   │   └── 📝 event-bus.ts          # Broadcasts new txns to SSE subscribers
│   │   ├── 📁 agent-sdk/         # Lightweight Agent Client SDK
│   │   │   └── 📝 client.ts             # Helper to construct and sign payment proposals
│   │   └── 📁 types/             # TypeScript Types & Zod Schemas
│   │       ├── 📝 schemas.ts            # Zod validation schemas for all requests
│   │       └── 📝 index.ts              # Exported interfaces & enums
│   │
│   └── 📁 mcp/                   # Anthropic Model Context Protocol (MCP) Server
│       └── 📝 server.ts          # Exposes `propose_razorpay_payment` tool to AI models
│
├── 📁 scripts/                   # Utility & Demo Scripts
│   ├── 📝 simulate-traffic.ts    # CLI bot generating continuous mock agent traffic
│   └── 📝 verify-ledger.ts       # CLI script proving hash-chain cryptographic integrity
│
├── 📝 .env.example               # Template environment variables
├── 📝 docker-compose.yml         # Local PostgreSQL container configuration
├── 📝 next.config.mjs            # Next.js configuration
├── 📝 tailwind.config.ts         # Tailwind configuration with Dual Theme variables
├── 📝 tsconfig.json              # TypeScript strict configuration
└── 📝 package.json               # Dependencies & build scripts
```

---

## 3. Layer Responsibility & Data Flow

### 3.1 Transport & Gateway Routing (`src/app/api/v1/`)
* Ingests incoming HTTP requests from external AI agents, MCP clients, or webhooks.
* Applies schema validation via Zod (`src/lib/types/schemas.ts`).
* Enforces `< 15ms` internal latency budgets by orchestrating in-memory policy checks before touching external networks.

### 3.2 Policy Decision Point (PDP) (`src/lib/engine/`)
* **`policy-evaluator.ts`**: Pure functional evaluation engine that computes boolean compliance for spend limits, merchant allowlists, and currency constraints.
* **`velocity-tracker.ts`**: In-memory sliding-window ring buffer that records timestamped spend events for rolling 1h/24h caps.
* **`risk-scorer.ts`**: Heuristic evaluator detecting prompt injection keywords, price multiplier anomalies, and abnormal agent request intervals.

### 3.3 Security & Cryptographic Vault (`src/lib/security/`)
* **`agent-auth.ts`**: Validates Ed25519 signatures and rejects replayed timestamps ($> \pm 60\text{s}$).
* **`audit-chain.ts`**: Implements $H_n = \text{SHA256}(H_{n-1} + \text{Payload})$ to ensure zero retroactive log alteration.

### 3.4 Razorpay Execution Adapter (`src/lib/razorpay/`)
* Encapsulates official `razorpay` Node SDK.
* Injects isolated server-side `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
* Handles API timeouts, retries, and webhook HMAC signature verifications.

### 3.5 Real-Time Presentation Layer (`src/app/(dashboard)/` & `src/components/`)
* Next.js App Router with Server Components for fast initial paint and Client Components for dynamic SSE streams.
* Route grouping `src/app/(dashboard)/layout.tsx` isolates UI layout from backend API routes.
* Dual Theme (Warm Linen `#FFFBF4` Light Mode + Midnight Obsidian `#0B0F19` Dark Mode).
* Bento Grid metrics, expandable explainability drawers, and one-click human approval modals.
