# Round 1 Pitch Script

## 1. Purpose

This document contains the speaking script for the Round 1 presentation of:

# AI Agent Governance Platform for Banking

The script follows the presentation storyline defined in:

`08-presentation-storyline.md`

The objective is to explain the solution clearly while keeping the presentation:

- Simple
- Technical enough to establish credibility
- Business-oriented
- Easy to follow
- Memorable

The central message is:

> **AI agents propose. Governance decides. Trusted systems execute.**

---

# Slide 1 — Title

## AI Agent Governance Platform

### Enabling Controlled AI Autonomy in Banking

### Speaker Script

"AI is rapidly evolving from systems that simply answer questions into autonomous agents that can actually perform tasks.

These agents can call APIs, access databases, interact with internal systems, and potentially initiate financial operations.

That creates an important question for financial institutions:

**When an AI agent wants to take an action, who decides whether it is actually allowed to do it?**

Our solution is an AI Agent Governance Platform designed to provide that control."

---

# Slide 2 — From Chatbots to AI Agents

### Speaker Script

"Traditional chatbots mainly operate in an information loop.

A user asks something, the model processes the request, and it generates a response.

AI agents are different.

An agent can receive a goal, reason about that goal, select tools, call APIs and perform actions.

For example, instead of simply explaining how to make a payment, an agent could potentially invoke a payment service itself.

So the security problem changes.

We're no longer protecting only what AI can **say**.

We also need to control what AI can **do**."

### Transition

"And this becomes especially important when those actions involve financial systems."

---

# Slide 3 — The Problem

## What Happens When an AI Agent Can Move Money?

### Speaker Script

"Imagine a payment agent receives an instruction:

'Pay the approved vendor invoice.'

The agent identifies the invoice, selects a payment tool and prepares the transaction.

But before that transaction executes, several questions need answers.

Does this agent actually have payment permission?

How much money is it allowed to transfer?

Is the destination trusted?

Is this transaction unusual?

Does this amount require human approval?

Has the agent been disabled since the workflow started?

The AI may believe the action is correct.

But the AI itself should not be the final authority.

Our core principle is:

**Agent intelligence does not automatically imply agent authority.**"

---

# Slide 4 — The Governance Gap

### Speaker Script

"Existing identity and access management remains essential.

It can establish who a user, service or workload is and what baseline permissions it has.

But autonomous agent actions can also require dynamic, action-level decisions.

An agent might have payment capability, for example, while a particular payment should still be denied because of its amount, risk, destination or current agent status.

So our authorization decision combines multiple signals:

Identity.

Permissions.

The requested action.

The resource being accessed.

Transaction context.

Risk.

Organizational policy.

And, when necessary, human approval.

This creates context-aware governance at the moment the agent attempts an action."

---

# Slide 5 — Our Solution

## AI Agent Governance Platform

### Speaker Script

"Our solution introduces an independent governance layer between AI agents and protected banking systems.

Instead of allowing the agent to directly invoke a sensitive banking API, the agent sends its requested action to the Governance Gateway.

The platform then verifies the agent's identity and status, checks permissions, evaluates risk and applies organizational policy.

The result is one of three decisions:

**ALLOW.**

**REQUIRE APPROVAL.**

or

**DENY.**

Only authorized actions can continue to the trusted execution layer.

The AI model therefore never becomes the final security authority.

The idea can be summarized in one sentence:

**AI agents propose. Governance decides. Trusted systems execute.**"

---

# Slide 6 — How It Works

### Speaker Script

"Let's look at the lifecycle of one action.

First, the agent requests access to a governed tool.

The platform verifies the agent's identity and checks whether that agent is currently active.

Next, it checks whether the agent has the required permission.

Then contextual risk is evaluated.

That trusted context is passed to the policy engine.

The policy engine returns an authorization decision.

If the action is allowed, it moves to controlled execution.

If it requires approval, execution pauses until an authorized human reviews it.

And if it is denied, the workflow stops before the protected banking service is called.

Throughout this lifecycle, important governance events are recorded for auditability."

---

# Slide 7 — Banking Example

## One Agent. Three Decisions.

### Speaker Script

"Consider the same payment agent making three requests.

First, suppose it requests a $250 payment that is classified as low risk.

The agent has the required permission and the policy allows autonomous execution.

The result is:

**ALLOW.**

Now suppose the same agent requests $2,500 and the action falls into a more sensitive policy range.

Instead of automatically executing it, the platform returns:

**REQUIRE APPROVAL.**

An authorized employee reviews the request.

If approved, the platform revalidates the request before execution.

Finally, imagine a $25,000 payment classified as high risk.

The policy returns:

**DENY.**

The payment service is never called.

The amounts here are illustrative. A financial institution would configure its own policies and thresholds.

The important point is that authority is determined dynamically from the action and its context."

---

# Slide 8 — Human Oversight & Kill Switch

### Speaker Script

"Autonomy does not mean removing humans from control.

For sensitive operations, our platform supports human-in-the-loop authorization.

An important detail is that approval itself does not directly execute the action.

After approval, the platform revalidates the security context.

For example, imagine a payment is waiting for approval.

While it is waiting, the security team discovers suspicious behavior and disables the agent.

Even if a manager later approves that old request, re-authorization sees that the agent is now disabled and denies execution.

The platform also provides a kill switch.

An administrator can disable an agent, causing its future governed actions to be rejected.

So agent authority can be granted, constrained and revoked."

---

# Slide 9 — System Architecture

### Speaker Script

"Technically, the platform separates several responsibilities.

AI agents interact with the Governance Gateway.

The gateway gathers trusted authorization context from components such as the Agent Registry, Permission Service and Risk Engine.

The Authorization Service sends that context to a policy engine.

For our proposed implementation, we use Open Policy Agent, or OPA, with Rego policies.

OPA only makes the policy decision.

It does **not** execute the payment.

That distinction is important.

If OPA returns DENY, the Governance Gateway and Tool Executor enforce that decision.

Only an authorized request reaches the protected banking API.

This separation gives us a clear boundary between:

AI reasoning,

authorization,

and execution."

---

# Slide 10 — Defense in Depth

### Speaker Script

"We don't rely on one security mechanism.

Controls exist before, during and after an action.

Before execution, we can verify identity, validate inputs, check permissions and evaluate risk.

During authorization, policy rules, tool restrictions, rate limits and human approval can constrain the action.

Afterwards, audit and monitoring provide accountability and support investigation.

This matters because AI agents are non-deterministic.

Rather than assuming the agent will always behave correctly, we limit what unexpected behavior is capable of doing."

---

# Slide 11 — Business Impact

### Speaker Script

"So what does this provide to a financial institution?

First, safer AI adoption.

Organizations can give agents useful capabilities without automatically giving them unrestricted authority.

Second, controlled automation.

Routine low-risk operations can potentially execute automatically while sensitive actions receive additional scrutiny.

Third, operational control.

Permissions can be revoked, tools can be disabled and problematic agents can be stopped.

And fourth, accountability.

For a governed action, the organization can reconstruct:

Which agent acted?

What did it request?

Why was it allowed or denied?

What risk was observed?

Who approved it?

And what actually executed?

This creates a foundation for controlled enterprise autonomy."

---

# Slide 12 — Success Metrics

### Speaker Script

"We would evaluate the platform using measurable engineering outcomes rather than unsupported business claims.

First is governance coverage:

Are all identified sensitive agent actions actually passing through the governance layer?

Second is authorization correctness:

Do our predefined ALLOW, APPROVAL and DENY scenarios produce the expected decisions?

Third is enforcement:

When an action is denied, does it actually remain blocked from the protected service?

Fourth is audit completeness:

Can we reconstruct the lifecycle of critical actions?

And finally, performance:

What latency and throughput overhead does governance introduce?

These metrics give us concrete criteria for evaluating a prototype and later a controlled pilot."

---

# Slide 13 — Technology & Feasibility

### Speaker Script

"The platform can be built using established technologies rather than requiring a completely new security infrastructure.

For the governance backend, we propose Java and Spring Boot.

For policy evaluation, Open Policy Agent with Rego.

PostgreSQL stores governance state and initial audit information.

The governance and approval dashboard can be built using Next.js, React and TypeScript.

Agent integrations can use normal tool calling and REST APIs, with MCP-compatible integrations where appropriate.

For a proof of concept, these components can run with Docker.

Kubernetes becomes relevant later if enterprise-scale deployment requires independent scaling and high availability.

The innovation is therefore not a new database or policy language.

It is how these capabilities are combined specifically around governing autonomous AI-agent actions."

---

# Slide 14 — Scalability & Roadmap

### Speaker Script

"We would implement this incrementally.

The first stage is a proof of concept.

A modular governance backend, OPA, PostgreSQL and simulated banking APIs are enough to validate the architecture.

The next stage would be a controlled pilot integrating enterprise identity, selected internal APIs, observability and real approval workflows.

At enterprise scale, governance instances can scale horizontally, policy evaluation can be distributed, and audit processing can evolve independently.

Eventually, the platform can act as a governance control plane across many agents, tools and business units.

So we're designing for scale without introducing unnecessary distributed-system complexity into the initial prototype."

---

# Slide 15 — Closing

### Speaker Script

"As AI becomes more capable, financial institutions will increasingly ask AI systems to perform work rather than simply generate information.

That means the key question changes.

It is no longer only:

**What can this AI do?**

It becomes:

**What should this AI be allowed to do?**

Our AI Agent Governance Platform addresses that question by combining identity, permissions, contextual risk, policy, human oversight and auditability before sensitive actions reach banking systems.

The objective is not unrestricted autonomy.

It is:

**Controlled AI Autonomy.**

And our principle is simple:

**AI agents propose. Governance decides. Trusted systems execute.**"

---

# Q&A Preparation

The presentation may end here, but technical questions are likely.

The following answers should remain short unless the judge asks for more detail.

---

## Q1. Why can't existing IAM handle this?

"Existing IAM remains foundational. Our platform complements it by evaluating individual AI-agent actions using additional context such as agent state, transaction parameters, risk, tool sensitivity and human approval."

---

## Q2. Why use OPA?

"OPA lets us separate authorization policy from agent and application code. Policies can be centrally managed, tested, versioned and evaluated consistently."

---

## Q3. Does OPA execute actions?

"No. OPA is the policy decision point. It returns a decision. Our trusted Governance Gateway and Tool Executor enforce that decision."

---

## Q4. What happens if the agent ignores a DENY?

"The agent should not possess direct credentials or a network path to the protected service. DENY is enforced outside the AI model, so ignoring the response does not provide additional authority."

---

## Q5. What if the AI agent gets prompt-injected?

"Prompt injection could affect what the agent tries to do, but it should not change what the agent is authorized to do. Sensitive actions still pass through deterministic governance controls."

---

## Q6. What if the agent is compromised?

"We can revoke permissions or disable the agent. Future governed actions are then denied independently of what the compromised model attempts."

---

## Q7. Why human approval if we already have policies?

"Policies determine when autonomy is appropriate. Some actions may be valid but sensitive enough to require human accountability before execution."

---

## Q8. What happens if a request changes after approval?

"Approval is bound to the security-relevant request details. If important parameters such as amount or destination change, the previous approval is no longer valid."

---

## Q9. Why not just require approval for everything?

"That removes much of the benefit of autonomous agents and creates approval fatigue. We use risk and policy to automate appropriate low-risk actions while escalating sensitive ones."

---

## Q10. What if the governance platform goes down?

"For sensitive actions, the system should generally fail safely rather than silently bypass governance. A production implementation would require high availability and distributed policy evaluation to minimize that availability risk."

---

## Q11. Isn't this just an API gateway?

"An API gateway can provide important enforcement capabilities, but our governance model adds AI-agent-specific concepts such as agent lifecycle, tool permissions, contextual risk, policy decisions, human approval, kill switches and end-to-end agent accountability."

---

## Q12. Is this a fraud-detection system?

"No. Fraud or risk systems can provide signals to the platform, but our system is an authorization and governance layer. It decides whether an AI-agent action is permitted under the current policy and context."

---

## Q13. Does this replace fraud detection?

"No. It integrates with existing risk and fraud capabilities as part of defense in depth."

---

## Q14. Why banking?

"Banking makes the governance problem particularly important because agent actions can affect money, sensitive customer information and regulated workflows."

---

## Q15. Can this work outside banking?

"The underlying model—principal, action, resource, context, policy and controlled execution—is applicable to other high-risk enterprise environments as well. Banking is our primary use case."

---

# Demo Explanation

If a prototype is built for a later round, the demo should be extremely simple.

Do not start by showing code.

Start with the dashboard.

---

## Demo Scenario 1 — Normal Action

"Here we have our Payment Agent.

It is active and has payment permission.

I'll submit a low-risk $250 payment."

Show:

REQUESTED

↓

RISK: LOW

↓

ALLOW

↓

EXECUTED

Then show the audit timeline.

---

## Demo Scenario 2 — Human Approval

"Now the same agent requests a more sensitive $2,500 payment."

Show:

REQUESTED

↓

REQUIRE_APPROVAL

Then open the approval dashboard.

Approve.

Show:

APPROVED

↓

RE-AUTHORIZED

↓

ALLOW

↓

EXECUTED

---

## Demo Scenario 3 — High Risk

"Now we'll attempt a high-risk $25,000 transaction."

Show:

RISK: HIGH

↓

DENY

Then demonstrate that the mock banking service received no execution request.

---

## Demo Scenario 4 — Kill Switch

"Finally, we'll disable the Payment Agent."

Click:

DISABLE AGENT

Then attempt:

$250 payment

Show:

DENY

Reason:

AGENT_DISABLED

This is a powerful final demo because the audience can immediately understand the control being demonstrated.

---

# Presentation Timing

For a roughly 8–10 minute pitch, an approximate distribution could be:

| Section | Approx. Time |
|---|---:|
| Introduction | 30 sec |
| Chatbot → Agent | 30 sec |
| Problem | 45 sec |
| Governance Gap | 45 sec |
| Solution | 60 sec |
| How It Works | 60 sec |
| Banking Example | 60 sec |
| Human Control | 45 sec |
| Architecture | 60 sec |
| Security | 30 sec |
| Business Impact | 40 sec |
| Metrics | 30 sec |
| Technology | 30 sec |
| Scalability | 30 sec |
| Closing | 30 sec |

This should be adjusted to the actual hackathon presentation limit.

---

# Delivery Guidelines

Do not memorize every sentence.

Memorize the logical sequence:

Problem

↓

Gap

↓

Solution

↓

Decision Model

↓

Banking Example

↓

Human Control

↓

Architecture

↓

Impact

↓

Vision

Speak around that structure naturally.

---

# Sentences Worth Memorizing

If only a few sentences are memorized, use these:

### Opening

> "AI is moving from systems that answer questions to agents that can take real actions."

### Problem

> "Agent intelligence does not automatically imply agent authority."

### Solution

> "Every sensitive agent action passes through an independent governance layer before reaching protected banking systems."

### Architecture

> "The AI determines intent, the governance layer determines authority, and trusted systems perform execution."

### Closing

> "AI agents propose. Governance decides. Trusted systems execute."

These five statements contain almost the entire project story.

---

# Words to Avoid

Avoid repeatedly using vague terms such as:

"AI-powered"

"revolutionary"

"next-generation"

"100% secure"

"unhackable"

"guaranteed"

"completely autonomous"

Prefer concrete language:

"policy-based authorization"

"controlled execution"

"context-aware decisions"

"human approval"

"agent lifecycle"

"auditability"

"permission revocation"

"risk-based governance"

---

# Final Pitch Structure

The entire pitch can be remembered as:

## 1. AI can now ACT.

↓

## 2. Actions create AUTHORITY problems.

↓

## 3. Agents should not decide their own authority.

↓

## 4. Governance evaluates every sensitive action.

↓

## 5. Identity + Permission + Risk + Policy.

↓

## 6. ALLOW / APPROVAL / DENY.

↓

## 7. Trusted infrastructure executes.

↓

## 8. Humans retain control.

↓

## 9. Everything important is auditable.

↓

## 10. This enables controlled AI autonomy.

---

# Final Message

The project is not about preventing AI agents from acting.

It is about creating the infrastructure that allows organizations to safely give them meaningful authority.

Without governance:

AI Capability
      +
Sensitive Access
      =
Uncontrolled Risk

With governance:

AI Capability
      +
Explicit Authority
      +
Risk Controls
      +
Human Oversight
      =
Controlled Autonomy

Therefore:

> **AI agents propose. Governance decides. Trusted systems execute.**