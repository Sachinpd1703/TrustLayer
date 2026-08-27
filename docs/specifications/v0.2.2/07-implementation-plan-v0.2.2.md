# Implementation Plan & Roadmap — TrustLayer v0.2.2

**Document Version:** 0.2.2  
**Target:** Phased Engineering Execution Checklist & Milestone Delivery Plan  
**Status:** Approved Roadmap  

---

## 1. Overview & Delivery Milestones

```text
Phase 1: Database Migration & Multi-Policy Architecture
   │
   ├── Phase 2: Dynamic Multi-Agent IAM & Key Provisioning
   │
   ├── Phase 3: Advanced Hierarchical Policy Engine (MCC, Temporal & Multi-Tier Caps)
   │
   ├── Phase 4: Omnichannel HITL Dispatcher (Telegram / WhatsApp / Slack)
   │
   └── Phase 5: Red-Team Hacker Sandbox & MCP Server Live Integration
```

---

## 2. Phased Execution Tasks

### Phase 1: Database Schema Expansion & Seed Migration
- [ ] Update `prisma/schema.prisma` with `Department`, `AgentToken`, `PolicyRule` multi-tier fields, and `WebhookIntegration`.
- [ ] Run `npx prisma db push` to synchronize live Supabase PostgreSQL schema.
- [ ] Update `prisma/seed.ts` with departments (`ENGINEERING`, `MARKETING`, `SALES`), multi-tier policies, and test agents.
- [ ] Run `npm run db:seed` to verify seed data.

### Phase 2: Dynamic Multi-Agent IAM & Key Provisioning
- [ ] Build `POST /api/v1/agents` with dynamic Ed25519 keypair generation and token hashing.
- [ ] Build interactive **"Add New Agent"** modal in `src/app/(dashboard)/agents/page.tsx`.
- [ ] Add live budget utilization progress bars on agent cards.
- [ ] Add 1-click Python & TypeScript SDK code snippet copy modals.

### Phase 3: Advanced Hierarchical Policy Engine
- [ ] Upgrade `src/lib/engine/policy-evaluator.ts` to support 4-tier approval matrix (`TIER_AUTONOMOUS`, `TIER_SINGLE_MANAGER`, `TIER_DUAL_CUSTODY`, `TIER_DENY`).
- [ ] Add MCC allow/deny filtering and temporal working-hours evaluation.
- [ ] Build **"Advanced Policy Rule Builder"** in `src/app/(dashboard)/policies/page.tsx`.

### Phase 4: Omnichannel Real-Time HITL Dispatcher
- [ ] Create `src/lib/notifications/omnichannel.ts` supporting Telegram Bot API & Slack Webhooks.
- [ ] Build `POST /api/v1/approvals/callback` for 1-click mobile approval HMAC verification.
- [ ] Update `/approvals` center to support dual-signatory multi-approval workflows.

### Phase 5: Red-Team Hacker Sandbox & MCP Tool Integration
- [ ] Build **"Red-Team Hacker Sandbox"** in `src/app/(dashboard)/simulator/page.tsx` with attack presets.
- [ ] Enhance `src/mcp/server.ts` to expose `propose_razorpay_payment` and `get_policy_limits` via standard stdio JSON-RPC.
- [ ] Expose `/.well-known/ai-commerce.json` merchant discovery endpoint.
- [ ] Run `npm run build` and verify clean TypeScript type-safety.

---

## 3. Verification & Quality Assurance Gate

1. **Build Gate:** `npm run build` exits with code 0.
2. **Type-Check Gate:** `npx tsc --noEmit` returns zero errors.
3. **Database Integrity:** Genesis hash chain passes continuous automated verification.
4. **Vercel Serverless Ready:** All dynamic routes function with zero IPv6/port 5432 timeouts.
