# Round 1 Presentation Storyline

## 1. Purpose

This document defines the storyline for the Round 1 presentation of the:

# AI Agent Governance Platform for Banking

The presentation should not attempt to explain every component, policy, database table, threat, or sequence diagram developed during research.

Instead, it should communicate one clear idea:

> **As AI agents gain the ability to take real actions, financial institutions need an independent governance layer that controls what those agents are actually allowed to execute.**

The presentation should answer five questions:

1. What problem are we solving?
2. Why does the problem matter?
3. What is our solution?
4. How does the solution work?
5. Why is the solution valuable and feasible?

---

# 2. Core Story

The complete presentation should follow this narrative:

AI is evolving
from

"Answer my question"

to

"Perform this task"

        ↓

Agents can now use

APIs
Databases
Tools
Internal Services
Payment Systems

        ↓

This creates a new question:

"What is an AI agent actually allowed to do?"

        ↓

Traditional security controls help,
but autonomous actions introduce
dynamic context, risk and approval needs.

        ↓

Our Solution

AI Agent Governance Platform

        ↓

Every sensitive agent action is evaluated using:

Identity
+
Permissions
+
Context
+
Risk
+
Policy
+
Human Oversight

        ↓

Decision

ALLOW
REQUIRE APPROVAL
DENY

        ↓

Only authorized actions reach
protected banking systems.

---

# 3. Presentation Principle

The judges should understand the main idea within the first 3–4 slides.

Do NOT begin with:

- OPA
- Rego
- Cedar
- Kubernetes
- PostgreSQL
- MCP
- Database schemas
- Detailed security architecture

Those technologies support the solution.

They are not the story.

Start with:

AI Agent
    ↓
Real-World Action
    ↓
Financial Risk
    ↓
Need for Governance

---

# 4. Recommended Presentation Structure

Recommended deck:

1. Title / Vision
2. The Shift: Chatbots → AI Agents
3. The Problem
4. The Governance Gap
5. Our Solution
6. How It Works
7. Banking Use Case
8. Human Oversight & Kill Switch
9. Architecture
10. Security & Governance
11. Business Impact
12. Success Metrics
13. Technology & Feasibility
14. Scalability / Roadmap
15. Closing

The exact number can be reduced if the hackathon imposes a slide limit.

---

# 5. Slide 1 — Title

## AI Agent Governance Platform

### Enabling Controlled AI Autonomy in Banking

Possible subtitle:

> Govern what AI agents can access, decide and execute.

Keep this slide extremely simple.

Visual concept:

        AI Agent
            ↓
      GOVERNANCE
            ↓
      Banking Systems

Optional footer:

Team Name | Hackathon | 2026

### Speaker Message

"AI agents are moving from generating answers to taking real actions. In banking, that creates a critical question: who controls what an autonomous AI agent is actually allowed to do?"

---

# 6. Slide 2 — The Shift

## From Chatbots to Autonomous Agents

Traditional AI:

User
 ↓
Chatbot
 ↓
Response

Modern AI Agent:

User
 ↓
AI Agent
 ↓
Reason
 ↓
Select Tool
 ↓
Call API
 ↓
Take Action

Agents can interact with:

- APIs
- Databases
- Internal services
- Payment systems
- Enterprise tools

### Key Message

> AI is no longer only generating information. It is increasingly capable of creating real-world side effects.

### Visual

Use a simple comparison:

CHATBOT

Question
   ↓
AI
   ↓
Answer


AI AGENT

Goal
   ↓
AI
   ↓
Plan
   ↓
Tool
   ↓
Action

---

# 7. Slide 3 — The Problem

## What Happens When an AI Agent Can Move Money?

Example:

User:

"Pay the approved vendor invoice."

        ↓

Payment Agent

        ↓

Determines Vendor

        ↓

Selects Payment Tool

        ↓

Generates Transaction

        ↓

Payment API

Now ask:

### Who decides whether the agent should actually be allowed to execute it?

Potential risks:

- Excessive permissions
- Incorrect reasoning
- Prompt manipulation
- Compromised agents
- Unsafe tool calls
- Unauthorized transactions
- Lack of accountability

### Key Message

> Agent intelligence should not automatically imply agent authority.

This sentence should be visually prominent.

---

# 8. Slide 4 — The Governance Gap

## Authentication Is Not Enough

Knowing:

"Who is this agent?"

does not answer:

"Should this specific action be allowed right now?"

An agent may have:

Valid Identity ✓

but request:

High-Risk Action ✕

Authorization may depend on:

Agent Identity
+
Permission
+
Action
+
Resource
+
Transaction Context
+
Risk
+
Policy
+
Approval

### Key Message

> Autonomous systems require context-aware governance at the moment of action.

Do not claim that traditional IAM is obsolete.

Instead say:

> Existing IAM remains foundational. Our platform adds an AI-agent-specific governance and action-control layer.

---

# 9. Slide 5 — Our Solution

## AI Agent Governance Platform

Introduce the main architecture.

                  AI Agent
                      |
                Action Request
                      |
                      v
          +------------------------+
          |   Governance Gateway   |
          +------------------------+
          | Identity               |
          | Permissions            |
          | Risk                   |
          | Policy                 |
          | Guardrails             |
          | Human Approval         |
          | Audit                  |
          +-----------+------------+
                      |
             +--------+--------+
             |        |        |
             v        v        v
           ALLOW   APPROVAL   DENY
             |
             v
        Tool Executor
             |
             v
       Banking Systems

### Main Principle

> **AI agents propose. Governance decides. Trusted systems execute.**

This should become the memorable phrase of the presentation.

---

# 10. Slide 6 — How It Works

## Every Sensitive Action Passes Through Governance

Show the workflow:

1.

Agent requests an action

        ↓

2.

Identity + status verified

        ↓

3.

Permission checked

        ↓

4.

Context and risk evaluated

        ↓

5.

Policy evaluated

        ↓

6.

ALLOW / REQUIRE APPROVAL / DENY

        ↓

7.

Authorized action executes

        ↓

8.

Complete lifecycle audited

### Important

Keep this visual.

Do not explain implementation classes or database tables.

---

# 11. Slide 7 — Banking Use Case

## One Agent. Three Decisions.

This should be one of the strongest slides.

### Scenario A

PaymentAgent

Pay $250

Risk:

LOW

        ↓

ALLOW

        ↓

EXECUTE

---

### Scenario B

PaymentAgent

Pay $2,500

Risk:

MEDIUM

        ↓

REQUIRE APPROVAL

        ↓

Human Approves

        ↓

Re-Authorize

        ↓

EXECUTE

---

### Scenario C

PaymentAgent

Pay $25,000

Risk:

HIGH

        ↓

DENY

        ↓

NO EXECUTION

### Footer

> Transaction thresholds are illustrative and institution-configurable.

### Key Message

The same agent can receive different authorization decisions depending on context.

That demonstrates:

**Controlled Autonomy**

---

# 12. Slide 8 — Human Oversight & Kill Switch

## Humans Stay in Control

Show two mechanisms.

### Human-in-the-Loop

Sensitive Action

        ↓

REQUIRE APPROVAL

        ↓

Authorized Employee

        ↓

Approve / Reject

        ↓

Re-Authorization

        ↓

Execution

Important:

Approval does not directly execute the action.

The platform re-evaluates current authority before execution.

---

### Agent Kill Switch

PaymentAgent

ACTIVE

        ↓

Suspicious Behavior

        ↓

Administrator

DISABLE

        ↓

PaymentAgent

DISABLED

        ↓

Future Actions

DENY

### Key Message

> Autonomy can be granted, constrained and revoked.

---

# 13. Slide 9 — System Architecture

Now show the actual technical architecture.

Suggested diagram:

+---------------------------+
|      AI Agent Layer       |
|                           |
| Payment / Support / etc.  |
+-------------+-------------+
              |
              v
+---------------------------+
|    Governance Gateway     |
+-------------+-------------+
              |
    +---------+---------+
    |         |         |
    v         v         v
 Identity   Risk    Permissions
    |         |         |
    +---------+---------+
              |
              v
+---------------------------+
| Authorization Service     |
|                           |
| OPA + Rego                |
+-------------+-------------+
              |
      +-------+-------+
      |       |       |
      v       v       v
    ALLOW  APPROVAL  DENY
      |
      v
+---------------------------+
| Controlled Tool Executor  |
+-------------+-------------+
              |
              v
+---------------------------+
| Protected Banking APIs    |
+---------------------------+

Supporting systems:

- PostgreSQL
- Audit
- Approval Service
- Agent Registry
- Tool Registry

### Key Message

The AI model never becomes the final security authority.

---

# 14. Slide 10 — Defense in Depth

## Governance Is More Than One Policy Check

Show layers:

                    ACTION
                      ↓
              Agent Authentication
                      ↓
               Agent Lifecycle
                      ↓
                 Permission
                      ↓
                Tool Guardrail
                      ↓
               Risk Evaluation
                      ↓
              Policy Evaluation
                      ↓
               Human Approval
                      ↓
             Execution Validation
                      ↓
                   AUDIT

Possible controls:

**Before**

- Authentication
- Input validation
- Permission checks
- Risk evaluation

**During**

- Policy enforcement
- Approval
- Rate limits
- Tool restrictions

**After**

- Audit
- Monitoring
- Investigation
- Incident response

### Key Message

> No single control is trusted to protect the entire workflow.

---

# 15. Slide 11 — Business Impact

## Why This Matters to Financial Institutions

Use four major outcomes.

### Safer AI Adoption

Enable agents to interact with sensitive systems without unrestricted authority.

### Controlled Automation

Automatically execute low-risk actions while escalating sensitive operations.

### Faster Incident Response

Immediately disable agents or revoke permissions when problems occur.

### Accountability

Trace:

Who
→ Requested What
→ Under Which Policy
→ With What Risk
→ Who Approved
→ What Executed

### Main Message

> The platform enables organizations to increase AI autonomy without losing operational control.

---

# 16. Slide 12 — Success Metrics

## How We Measure Success

Do not show 24 metrics.

Use five.

### Governance Coverage

Target:

100% of identified sensitive agent actions routed through governance.

### Authorization Accuracy

All predefined ALLOW / APPROVAL / DENY policy tests produce expected outcomes.

### Unauthorized Execution Prevention

Denied test actions:

0 protected-service executions.

### Audit Completeness

Critical governance actions remain traceable end-to-end.

### Performance

Measure:

- Authorization latency
- Throughput
- Approval turnaround time

### Important

These are prototype/pilot validation targets, not claimed production results.

---

# 17. Slide 13 — Technology & Feasibility

## Built Using Proven Enterprise Technologies

Show layers rather than a logo wall.

### Agent Layer

LLM Tool Calling

Optional MCP Integration

        ↓

### Governance

Java + Spring Boot

        ↓

### Policy

Open Policy Agent

Rego

        ↓

### Data

PostgreSQL

        ↓

### Dashboard

Next.js + React + TypeScript

        ↓

### Deployment

Docker

Kubernetes at enterprise scale

### Key Message

> The innovation is the governance architecture—not reinventing infrastructure that already works.

---

# 18. Slide 14 — Scalability & Roadmap

## From Concept to Enterprise Governance

### Phase 1

Proof of Concept

- Governance Gateway
- Permissions
- OPA
- Risk
- Mock banking services

        ↓

### Phase 2

Controlled Pilot

- Enterprise IAM
- Internal APIs
- Human approval
- Observability

        ↓

### Phase 3

Enterprise

- Horizontal scaling
- Distributed policy evaluation
- Central policy lifecycle
- SIEM integration

        ↓

### Phase 4

Multi-Agent Governance

- Large agent registry
- Large tool ecosystem
- Regional enforcement
- Governance control plane

### Key Message

> Start simple. Preserve an architecture that can evolve.

---

# 19. Slide 15 — Closing

Return to the original question.

## As AI Agents Gain More Capability...

The question is no longer only:

> "What can the AI do?"

The more important enterprise question becomes:

> **"What should this AI be allowed to do?"**

Then present:

# AI Agent Governance Platform

Identity

+

Permissions

+

Risk

+

Policy

+

Human Oversight

+

Auditability

        ↓

# Controlled AI Autonomy

Final statement:

> **AI agents propose. Governance decides. Trusted systems execute.**

End here.

Do not end with the technology stack.

End with the idea.

---

# 20. Story Arc

The emotional/intellectual progression should be:

### 1. Curiosity

"AI can now take actions."

        ↓

### 2. Concern

"What if those actions affect money or customer data?"

        ↓

### 3. Gap

"Authentication alone does not determine whether every autonomous action is appropriate."

        ↓

### 4. Solution

"Put an independent governance layer between agents and sensitive systems."

        ↓

### 5. Understanding

"Identity + Permission + Risk + Policy → ALLOW / APPROVAL / DENY."

        ↓

### 6. Confidence

"Human approval, kill switches, auditing and controlled execution keep humans in control."

        ↓

### 7. Business Value

"This enables safer adoption of autonomous AI."

        ↓

### 8. Vision

"Controlled AI autonomy becomes reusable enterprise infrastructure."

---

# 21. What Existing Diagrams to Use

We already created many detailed diagrams.

Do NOT put all of them in the deck.

Primary diagrams:

### Use

`01-system-architecture.drawio`

Use for:

Slide 9 — System Architecture

---

### Use

Payment authorization sequence

Use a simplified version for:

Slide 7 — Banking Use Case

---

### Use

Agent Kill Switch sequence

Simplify for:

Slide 8 — Human Control

---

### Possibly Use

Component diagram

Only if the architecture slide needs additional detail.

---

### Keep in Supporting Documentation

- ER diagram
- Detailed authentication sequence
- Detailed approval sequence
- Policy internals
- Database architecture
- Detailed deployment architecture

These demonstrate technical depth but do not all belong in the main narrative.

---

# 22. What NOT to Put in the Main Presentation

Avoid overwhelming judges with:

- Database schemas
- Full ER diagram
- Rego code
- Java code
- API payloads
- Detailed RBAC tables
- Full threat model
- 10 sequence diagrams
- Kubernetes internals
- Every security risk
- Every research topic
- Every success metric

We researched these things so that:

**our architecture is defensible**

not so that:

**every research artifact must appear in the PPT.**

---

# 23. Technical Depth Strategy

Think of the presentation as three layers.

## Layer 1 — Main Deck

Simple.

Problem → Solution → Value.

---

## Layer 2 — Architecture

Enough technical detail to prove feasibility.

Governance Gateway

OPA

Risk

Permissions

Approval

Executor

---

## Layer 3 — Supporting Documentation

Deep technical material:

- Threat model
- API design
- Data model
- Policy model
- Sequence diagrams
- Security architecture
- Deployment architecture
- Research

If judges ask deeper questions, this work gives us strong answers.

---

# 24. Visual Design Direction

The presentation should visually communicate:

Security

Trust

Financial infrastructure

AI

Enterprise technology

Avoid making it look like a generic AI chatbot project.

Prefer:

- Clean architecture diagrams
- Minimal text
- Strong typography
- Consistent iconography
- Clear decision flows
- Small number of concepts per slide

Avoid:

- Huge paragraphs
- Excessive gradients
- Random AI-generated robots
- Too many logos
- Tiny architecture text
- Decorative elements that do not explain anything

---

# 25. Repeated Visual Language

Use the same decision terminology everywhere:

ALLOW

REQUIRE APPROVAL

DENY

Do not switch between:

ACCEPT

PASS

SUCCESS

AUTHORIZED

unless context specifically requires it.

Similarly use:

AI Agent

Governance Gateway

Policy Engine

Risk Engine

Tool Executor

Protected Banking Service

consistently.

---

# 26. Core Phrase

One phrase should appear multiple times:

> **AI agents propose. Governance decides. Trusted systems execute.**

Use it:

- When introducing the solution
- Around the architecture section
- On the final slide

This creates recall.

---

# 27. Secondary Phrase

Another useful phrase is:

> **Agent intelligence does not automatically imply agent authority.**

This is particularly useful on the problem slide.

---

# 28. Product Positioning

Do NOT position the project as:

"An OPA-based authorization system."

Do NOT position it as:

"An AI banking chatbot."

Do NOT position it as:

"A payment fraud detector."

Position it as:

> **An AI Agent Governance Platform that provides an independent authorization and control layer for autonomous actions in financial systems.**

OPA is one implementation technology inside that platform.

---

# 29. Innovation Positioning

The proposed innovation is the combination of:

Agent Identity

+

Tool Governance

+

Fine-Grained Authorization

+

Contextual Risk

+

Policy-as-Code

+

Human Approval

+

Controlled Execution

+

Lifecycle Controls

+

Auditability

around:

**AI-agent actions.**

The value comes from orchestrating these controls into a reusable governance layer.

---

# 30. Important Credibility Rules

During the presentation:

Do not claim:

"AI agents are completely secure."

Say:

"The architecture reduces and controls the risks associated with autonomous actions."

Do not claim:

"OPA prevents fraud."

Say:

"OPA can serve as the policy decision engine used to evaluate authorization rules."

Do not claim:

"This guarantees regulatory compliance."

Say:

"The platform provides governance capabilities that can support organizational compliance controls."

Do not claim:

"Traditional IAM cannot handle AI."

Say:

"Existing IAM remains foundational; our architecture extends governance to dynamic AI-agent actions and context."

Do not invent:

- Fraud reduction percentages
- Cost savings percentages
- Transaction performance numbers
- Enterprise adoption numbers

without evidence.

---

# 31. Judge Questions We Should Be Ready For

### "Why can't normal IAM solve this?"

Answer:

IAM remains essential for identity and baseline permissions.

Our platform adds action-level governance using dynamic context such as risk, tool, resource, transaction parameters, agent state and human approval.

---

### "Why not simply restrict the AI agent?"

Because agents still need useful authority to automate workflows.

The goal is not zero authority.

The goal is:

**controlled authority.**

---

### "Why do you need OPA?"

It externalizes authorization logic from agent/application code and allows policies to be centrally defined, tested and versioned.

---

### "What happens if OPA says DENY?"

Nothing executes.

OPA decides.

The Governance Gateway and Tool Executor enforce that decision.

---

### "Can the AI bypass governance?"

Production deployment must ensure it cannot.

Protected credentials and network paths remain outside the agent and sensitive APIs accept requests only through trusted execution paths.

---

### "What if someone prompt-injects the agent?"

Prompt injection may influence the agent's reasoning, but it should not automatically expand the agent's authority.

Sensitive actions still pass through deterministic governance controls.

---

### "What if the agent is compromised?"

Administrators can revoke permissions or disable the agent through the kill switch.

Future governed requests are rejected.

---

### "What if someone changes the payment after approval?"

The approval is bound to the security-relevant request details.

A changed request requires fresh authorization/approval.

---

### "Does human approval mean the transaction immediately executes?"

No.

Approval updates the authorization context.

The system revalidates the request before execution.

---

### "Will governance slow everything down?"

It introduces overhead, which is why authorization latency is a core success metric.

Policy evaluation can eventually be distributed close to enforcement points.

---

### "Is this only for banking?"

Banking is the target use case because of the sensitivity of financial actions.

The underlying governance model could potentially apply to other high-risk enterprise environments.

---

# 32. One-Minute Story

If we had only one minute:

"AI is evolving from chatbots that answer questions into agents that can call APIs, access data and perform real actions.

In banking, that creates a critical problem: an AI agent may decide what it wants to do, but that doesn't mean it should automatically have the authority to do it.

Our AI Agent Governance Platform introduces an independent control layer between AI agents and sensitive banking systems.

Every action is evaluated using agent identity, permissions, contextual risk and organizational policy.

Low-risk actions can be automatically allowed, sensitive actions can require human approval, and prohibited or high-risk actions are denied before reaching the banking system.

The platform also provides audit trails, permission revocation and an agent kill switch.

Our principle is simple:

AI agents propose. Governance decides. Trusted systems execute."

---

# 33. Five-Slide Emergency Version

If the submission has a very small slide limit, compress everything into:

## Slide 1

Problem

AI Agents Can Act — But Who Controls Their Authority?

## Slide 2

Solution

AI Agent Governance Platform

## Slide 3

How It Works

Identity + Permission + Risk + Policy

→ ALLOW / APPROVAL / DENY

## Slide 4

Architecture + Banking Example

$250 → ALLOW

$2,500 → APPROVAL

$25,000 → DENY

## Slide 5

Impact + Vision

Controlled AI Autonomy

+

"AI agents propose. Governance decides. Trusted systems execute."

---

# 34. Final Presentation Rule

We have already done extensive research into:

- AI agents
- Governance
- Guardrails
- Risk
- IAM
- RBAC
- OPA
- Cedar
- Security
- Threat modeling
- Authorization
- Deployment
- Scalability

The presentation should make that depth **invisible but credible**.

The judges should think:

> "This is easy to understand."

and then, when they inspect the architecture:

> "They have actually thought through how this would work."

That is the objective of the Round 1 storyline.