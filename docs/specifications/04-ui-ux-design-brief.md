# UI/UX Design Brief
## Project: TrustLayer — Gated & Explainable Authorization Gateway for Autonomous Agentic Commerce on Razorpay

---

## 1. Visual Identity, Theme System & Dual Mode Architecture

TrustLayer features a modern, adaptive **Dual Theme (Light & Dark Mode)** with an accessible toggle switch in the global header, powered by `next-themes` and Tailwind CSS custom color variables.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THEME SYSTEM MATRIX                               │
├──────────────────────┬─────────────────────────────┬────────────────────────┤
│ Token                │ Light Mode (Warm Editorial) │ Dark Mode (Midnight SOC│
├──────────────────────┼─────────────────────────────┼────────────────────────┤
│ Background (`bg`)    │ #FFFBF4 (Warm Cream Linen)  │ #0B0F19 (Midnight Slate│
│ Card Surface         │ #FFFFFF (Crisp White)       │ #111827 (Dark Obsidian)│
│ Border & Dividers    │ #F1EBE0 (Warm Sand Oatmeal) │ #1F2937 (Gunmetal Gray)│
│ Primary Text         │ #18181B (Deep Charcoal)     │ #F9FAFB (Off-White)    │
│ Muted Text           │ #71717A (Neutral Slate)     │ #9CA3AF (Muted Gray)   │
│ Brand Primary        │ #0C2340 / #0066CC (Navy/Blue│ #0082FB (Electric Blue)│
│ Success (ALLOW)      │ #059669 (Emerald Green)     │ #10B981 (Neon Emerald) │
│ Warning (HITL Queue) │ #D97706 (Warm Amber)        │ #F59E0B (Amber Flame)  │
│ Danger (DENY/Kill)   │ #DC2626 (Crimson Red)       │ #EF4444 (Vivid Crimson)│
│ Subtle Hover/Active  │ #F7F2E8 (Soft Cream Tint)   │ #1E293B (Deep Slate)   │
└──────────────────────┴─────────────────────────────┴────────────────────────┘
```

### 1.1 Light Mode Aesthetic Philosophy (`#FFFBF4` + `#F1EBE0`)
* **Tone:** High-end, editorial, warm financial document aesthetic (reminiscent of Stripe / Linear / Bloomberg modern design).
* **Card Elevation:** Pure `#FFFFFF` floating card surfaces with crisp `#F1EBE0` borders and soft ambient box-shadows (`box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05)`).
* **Contrast & Legibility:** Deep charcoal `#18181B` text with high WCAG AAA contrast ratio on the warm cream `#FFFBF4` canvas.

### 1.2 Dark Mode Aesthetic Philosophy (`#0B0F19` + `#1F2937`)
* **Tone:** Security Operations Center (SOC) / Cyber Threat Intelligence console.
* **Card Elevation:** Obsidian `#111827` cards with `#1F2937` borders and subtle glowing telemetry indicators.
* **Visual Hierarchy:** Electric Razorpay blue and neon status badges (Emerald, Amber, Crimson).

---

## 2. Global Theme Toggle Component Spec

* **Component:** `components/theme-toggle.tsx`
* **Technology:** `next-themes` with `attribute="class"` and `defaultTheme="system"`.
* **Visual Design:**
  * Animated pill toggle with `Sun` (`#D97706` in Light Mode) and `Moon` (`#38BDF8` in Dark Mode) icons from Lucide.
  * Smooth 200ms spring transition via Framer Motion.
  * Supports 3 states: Light, Dark, System Preference.
* **Header Position:** Top-right utility bar, adjacent to the "Razorpay Test Mode" live indicator badge.

---

## 3. Page-by-Page Wireframes & Layout Specs

### 3.1 Navigation & Global Header
* **Top Bar Elements:**
  * **Logo:** TrustLayer shield icon + "TrustLayer for Razorpay"
  * **Environment Badge:** Pulsing Green dot — `"Razorpay Test Mode (Active)"`
  * **Global Stats Bar:** Total Gated Volume (₹), Total Transactions, Blocked Anomalies, Pending Approvals
  * **Theme Switcher:** Dual-mode Sun/Moon animated toggle
  * **Quick Action:** `"Open Agent Simulator"` button

---

### 3.2 Page 1: Live Dashboard (`/`)
* **Layout:** 3-Column Bento Grid:
  * **Top Metrics Row (4 Bento Cards):**
    * Card 1: **Total Processed Volume (₹)** — Large formatted currency with percentage change.
    * Card 2: **Auto-Approved Ratio (%)** — Circular progress ring / gauge.
    * Card 3: **Anomalies & Hallucinations Blocked (Count)** — Shield alert badge with danger count.
    * Card 4: **Pending Approvals Queue (Badge)** — Pulsing amber indicator.
  * **Main Left Column (65% width): Live Transaction Stream**
    * Real-time scrolling feed of incoming agent proposals.
    * Each card displays:
      * Timestamp & `agent_id`
      * Amount in INR & Merchant Name
      * Decision Badge (`ALLOW` in emerald, `PENDING_APPROVAL` in amber, `DENY` in crimson)
      * Expandable **"Explainability Drawer"**: shows Agent Intent, Reasoning text, and Policy Evaluation matrix.
  * **Right Column (35% width): Quick Simulator & Pending Approvals Widget**
    * Live cards of pending step-up approvals with 1-click **"Approve"** and **"Decline"** buttons.
    * Agent Simulator card to trigger demo scenarios with a single click.

---

### 3.3 Page 2: Human-in-the-Loop Approvals Queue (`/approvals`)
* **Purpose:** Dedicated review center for high-value and flagged transactions.
* **Components:**
  * Filter tabs: `Pending (Count)`, `Approved`, `Rejected`, `Expired`.
  * **Detailed Review Modal:**
    * Order Details: Amount (₹), Currency, Merchant ID, Timestamp.
    * **Agent Intelligence Inspector:**
      * Prompt Context / Stated Goal
      * Reasoning Breakdown
      * Risk Score Meter (Low / Medium / High)
    * Policy Breach Reason (e.g. *"Amount exceeds autonomous ₹5,000 threshold"*).
    * Action Bar: `Reject Request` (Red) vs `Approve & Create Razorpay Order` (Green).

---

### 3.4 Page 3: Policy & Spend Guardrails (`/policies`)
* **Components:**
  * **Spend Limits Card:** Interactive inputs for Per-Order Cap (₹), Daily Cap (₹), and Velocity Limits (Txns/min).
  * **Merchant Whitelist Table:** Add/Remove approved Razorpay Merchant IDs and Merchant Category Codes (e.g. SaaS, Cloud, Hardware).
  * **Currency & Region Toggles:** Toggle Domestic (INR) vs International currencies.
  * **Save & Deploy Button:** Updates in-memory policy engine instantly with zero server restarts.

---

### 3.5 Page 4: Agent Registry & Kill-Switch (`/agents`)
* **Components:**
  * Grid of registered AI Agents (e.g. `ProcurementBot-v1`, `SaaS-Renewal-Agent`, `ShoppingAssistant`).
  * Card metadata: Agent Name, Public Key fingerprint, Total Spend to date, Status (`ACTIVE` / `REVOKED`).
  * **Emergency Kill-Switch Button:** High-visibility red button per agent. Clicking prompts a modal with immediate propagation.

---

### 3.6 Page 5: Cryptographic Audit Explorer (`/audit`)
* **Components:**
  * Search by `razorpay_order_id`, `audit_id`, or `agent_id`.
  * Hash-chain verification badge: *"Cryptographic Ledger Valid — 0 Tampering Detected"*.
  * Interactive timeline viewer showing the complete cryptographic block:
    * Previous Hash $\rightarrow$ Current Hash
    * Agent Signature $\rightarrow$ Policy Evaluation Result $\rightarrow$ Razorpay Response Payload.

---

## 4. Micro-Interactions & Animation Guidelines

1. **Theme Transition:** Smooth 150ms CSS color and background transition (`transition: background-color 150ms ease, border-color 150ms ease`).
2. **New Transaction Ingestion:** Gentle slide-down animation with subtle green/amber highlight when a new agent proposal arrives via SSE.
3. **Approval Action:** Smooth card exit with checkmark animation when an admin approves an order, transitioning to show the generated Razorpay Order ID.
4. **Kill-Switch Activation:** Immediate visual state transition to striped warning background with disabled indicators.
5. **Simulator Run:** Step-by-step progress stepper:
   `[1. Agent Thinking]` $\rightarrow$ `[2. Policy Evaluating]` $\rightarrow$ `[3. Razorpay Executing]` $\rightarrow$ `[4. Audit Committing]`.
