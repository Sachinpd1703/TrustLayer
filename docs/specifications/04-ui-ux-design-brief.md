# UI/UX Design Brief
## Project: TrustLayer — Gated & Explainable Authorization Gateway for Autonomous Agentic Commerce on Razorpay

---

## 1. Visual Identity, Theme & Design System

### 1.1 Brand Aesthetic
* **Theme:** Sleek, high-trust Fintech / Security Operations Center (SOC) aesthetic.
* **Palette:**
  * **Background:** Deep Midnight Slate (`#0B0F19` dark mode / `#F8FAFC` clean light mode)
  * **Card Surface:** Dark Obsidian (`#111827` / `#FFFFFF`) with subtle border glow (`#1F2937`)
  * **Brand Primary:** Razorpay Electric Blue (`#0C2340` / `#0082FB`) and Emerald Trust (`#10B981`)
  * **Alert / Danger:** Crimson Shield (`#EF4444`) for denials, kill-switches, and blocks
  * **Warning / Pending:** Amber Flame (`#F59E0B`) for human step-up approvals
* **Typography:**
  * Primary Sans: `Inter` or `Geist Sans`
  * Monospace / Code / Hashes: `JetBrains Mono` or `Geist Mono`

---

## 2. Page-by-Page Wireframes & Layout Specs

### 2.1 Navigation & Global Header
* **Top Bar Elements:**
  * **Logo:** TrustLayer shield icon + "TrustLayer for Razorpay"
  * **Environment Badge:** Pulsing Green dot — `"Razorpay Test Mode (Active)"`
  * **Global Stats Bar:** Total Gated Volume (₹), Total Transactions, Blocked Anomalies, Pending Approvals
  * **Quick Action:** `"Open Agent Simulator"` button

---

### 2.2 Page 1: Live Dashboard (`/`)
* **Layout:** 3-Column Bento Grid:
  * **Top Metrics Row:**
    * Card 1: **Total Processed Volume (₹)**
    * Card 2: **Auto-Approved Ratio (%)**
    * Card 3: **Anomalies & Hallucinations Blocked (Count)**
    * Card 4: **Pending Approvals Queue (Badge)**
  * **Main Left Column (65% width): Live Transaction Stream**
    * Real-time scrolling feed of incoming agent proposals.
    * Each card displays:
      * Timestamp & `agent_id`
      * Amount in INR & Merchant Name
      * Decision Badge (`ALLOW` in green, `PENDING_APPROVAL` in amber, `DENY` in red)
      * Expandable **"Explainability Drawer"**: shows Agent Intent, Reasoning text, and Policy Evaluation matrix.
  * **Right Column (35% width): Quick Simulator & Pending Approvals Widget**
    * Live cards of pending step-up approvals with 1-click **"Approve"** and **"Decline"** buttons.
    * Agent Simulator card to trigger demo scenarios with a single click.

---

### 2.3 Page 2: Human-in-the-Loop Approvals Queue (`/approvals`)
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

### 2.4 Page 3: Policy & Spend Guardrails (`/policies`)
* **Components:**
  * **Spend Limits Card:** Interactive inputs for Per-Order Cap (₹), Daily Cap (₹), and Velocity Limits (Txns/min).
  * **Merchant Whitelist Table:** Add/Remove approved Razorpay Merchant IDs and Merchant Category Codes (e.g. SaaS, Cloud, Hardware).
  * **Currency & Region Toggles:** Toggle Domestic (INR) vs International currencies.
  * **Save & Deploy Button:** Updates in-memory policy engine instantly with zero server restarts.

---

### 2.5 Page 4: Agent Registry & Kill-Switch (`/agents`)
* **Components:**
  * Grid of registered AI Agents (e.g. `ProcurementBot-v1`, `SaaS-Renewal-Agent`, `ShoppingAssistant`).
  * Card metadata: Agent Name, Public Key fingerprint, Total Spend to date, Status (`ACTIVE` / `REVOKED`).
  * **Emergency Kill-Switch Button:** High-visibility red button per agent. Clicking prompts a modal with immediate propagation.

---

### 2.6 Page 5: Cryptographic Audit Explorer (`/audit`)
* **Components:**
  * Search by `razorpay_order_id`, `audit_id`, or `agent_id`.
  * Hash-chain verification badge: *"Cryptographic Ledger Valid — 0 Tampering Detected"*.
  * Interactive timeline viewer showing the complete cryptographic block:
    * Previous Hash $\rightarrow$ Current Hash
    * Agent Signature $\rightarrow$ Policy Evaluation Result $\rightarrow$ Razorpay Response Payload.

---

## 3. Micro-Interactions & Animation Guidelines

1. **New Transaction Ingestion:** Gentle slide-down animation with subtle green/amber highlight when a new agent proposal arrives via SSE.
2. **Approval Action:** Smooth card exit with confetti / checkmark animation when an admin approves an order, transitioning to show the generated Razorpay Order ID.
3. **Kill-Switch Activation:** Immediate visual state transition to striped warning background with disabled indicators.
4. **Simulator Run:** Step-by-step progress stepper:
   `[1. Agent Thinking]` $\rightarrow$ `[2. Policy Evaluating]` $\rightarrow$ `[3. Razorpay Executing]` $\rightarrow$ `[4. Audit Committing]`.
