# AI Agents

## Overview

Artificial Intelligence (AI) agents are software systems that can perceive information, reason about a goal, make decisions, and take actions autonomously. Unlike traditional software, which follows a fixed sequence of instructions, AI agents dynamically decide what to do based on the current context and the objective they are trying to achieve.

An AI agent typically uses a Large Language Model (LLM) as its reasoning engine while interacting with external tools such as APIs, databases, search engines, payment systems, and other software services. This enables the agent to perform complex tasks with minimal human intervention.

As AI models become more capable, AI agents are increasingly being used to automate business processes that previously required human judgment.

----

A useful simplified model is:

```text
Goal
  ↓
Understand
  ↓
Reason / Plan
  ↓
Choose Action
  ↓
Use Tool
  ↓
Observe Result
  ↓
Continue / Finish / Escalate
```

An AI agent is therefore more than an LLM generating text.

A practical agent usually combines several components:

```text
AI Agent
│
├── Model / LLM
├── Instructions
├── Context
├── Memory / State
├── Reasoning / Planning
├── Tools
├── Policies / Guardrails
└── Execution Loop
```

The key characteristic is **agency**: the system can decide which permitted actions to take in pursuit of a defined objective.

---

## Why It Exists

Traditional software works extremely well when a workflow can be explicitly defined.

For example:

```text
User clicks "View Balance"
        ↓
Backend calls Account Service
        ↓
Account Service queries database
        ↓
Balance returned
```

The developer already knows exactly what sequence should happen.

But many real-world tasks are less structured.

Consider:

> "Find out why my payment failed and help me resolve it."

Solving this could require:

1. Identifying the relevant transaction.
2. Retrieving its payment status.
3. Interpreting a decline code.
4. Checking the customer's card/account status.
5. Determining an appropriate resolution.
6. Possibly using another banking service.
7. Explaining the result to the customer.
8. Escalating if the problem cannot safely be resolved automatically.

Writing a fixed workflow for every possible variation becomes difficult.

An AI agent can dynamically determine which permitted steps and tools are appropriate for the current situation.

---

## Core Concepts

### 1. Goal

An agent operates toward some objective.

Example:

```text
Goal:

Determine why transaction TX-892 failed.
```

The goal may come from the user, another system, or an orchestrating agent.

---

### 2. Reasoning and Planning

The agent determines what information or actions are required.

For example:

```text
Goal:
Investigate failed payment

        ↓

Need transaction information

        ↓

Retrieve transaction

        ↓

Need decline reason

        ↓

Retrieve payment status

        ↓

Determine appropriate response
```

Planning does not necessarily mean generating one complete plan upfront. An agent may decide its next step after observing each result.

---

### 3. Tools

Agents need tools to interact with systems outside the model.

Examples in banking include:

```text
getAccountBalance()

getTransactions()

getCardStatus()

searchBankPolicies()

getLoanApplication()

createSupportCase()

initiatePayment()
```

Tools can connect the agent to:

* APIs
* databases through controlled services
* payment systems
* document stores
* search systems
* MCP servers
* internal microservices
* other agents

The LLM itself should not be treated as the source of truth for information such as balances or transaction status.

Authoritative information should come from authoritative systems.

---

### 4. State

Agents often need to remember what has already happened during a task.

Example:

```text
Task State

Customer authenticated = true
Transaction identified = TX-892
Transaction status = DECLINED
Decline reason retrieved = true
Resolution attempted = false
```

Without state, complex multi-step workflows become difficult to coordinate.

---

### 5. Observation

After using a tool, the agent receives a result.

```text
Agent

"I need transaction information."

        ↓

getTransaction(TX-892)

        ↓

Result:

status = DECLINED
decline_code = INTERNATIONAL_DISABLED

        ↓

Agent reasons about next step
```

This creates an execution loop:

```text
Reason
  ↓
Act
  ↓
Observe
  ↓
Reason
  ↓
Act
  ↓
...
```

until the task finishes, fails, or requires human intervention.

---

### 6. Autonomy

Agents can operate at different levels of autonomy.

```text
LOW AUTONOMY

AI recommends
      ↓
Human decides
      ↓
System executes
```

```text
MEDIUM AUTONOMY

AI performs low-risk actions
      ↓
Sensitive action detected
      ↓
Human approval
      ↓
Continue
```

```text
HIGH AUTONOMY

AI plans
 ↓
Uses tools
 ↓
Executes permitted actions
 ↓
Monitors results
```

Higher autonomy creates greater potential value but also greater governance and risk requirements.

In banking, high-impact actions generally require stronger controls than informational tasks.

---

## AI Agent vs Chatbot

A chatbot primarily interacts through conversation.

An AI agent can potentially **take actions and manage workflows**.

### Chatbot Example

Customer:

> Why might my card payment be declined?

Chatbot:

> Card payments may be declined because of insufficient funds, transaction limits, card restrictions, or security controls.

The chatbot provides information.

### Agent Example

Customer:

> Why was my last card payment declined?

The agent could:

```text
Understand request
      ↓
Identify relevant transaction
      ↓
Call Transaction Service
      ↓
Retrieve decline code
      ↓
Call Card Service if necessary
      ↓
Determine permitted explanation
      ↓
Respond
```

The difference is therefore not simply that agents use an LLM.

The important distinction is:

```text
Chatbot
→ primarily communicates

Agent
→ can reason + use tools + perform workflows
```

A chatbot interface can itself be connected to an agent, so these categories can overlap.

---

## AI Agent vs Traditional Software

Traditional software generally follows explicitly programmed logic.

Example:

```text
if payment.status == DECLINED:
    showDeclineMessage()
```

The developer defines the workflow.

An agent can dynamically determine the next step.

```text
Goal
 ↓
Reason about current situation
 ↓
Select appropriate permitted tool
 ↓
Observe result
 ↓
Determine next step
```

### Comparison

| Traditional Software                   | AI Agent                                       |
| -------------------------------------- | ---------------------------------------------- |
| Explicit workflows                     | Can dynamically choose steps                   |
| Deterministic behavior is common       | Some behavior may be probabilistic             |
| Developer defines execution path       | Agent can determine portions of execution path |
| Best for predictable logic             | Useful for less-structured tasks               |
| Easier to test exhaustively            | Requires additional evaluation and monitoring  |
| Directly invokes predefined operations | Often selects among available tools            |

AI agents **do not replace traditional software**.

A production system normally combines both:

```text
AI Agent
    ↓
Reasoning / Tool Selection
    ↓
Traditional Services
    ↓
Deterministic Business Logic
    ↓
Databases / Banking Infrastructure
```

For example, the AI might determine that a transfer is required, but traditional banking systems should still validate and execute the transfer.

---

## Agent Lifecycle

An agent's operational lifecycle can be viewed as:

```text
Receive Goal
    ↓
Understand Context
    ↓
Plan / Select Next Step
    ↓
Check Permissions / Policies
    ↓
Use Tool
    ↓
Observe Result
    ↓
Evaluate Progress
    ↓
Continue / Finish / Escalate
```

### Step 1 — Receive Goal

Example:

> Find out why my transfer failed.

### Step 2 — Understand Context

The agent determines:

* who the customer is
* what transaction is relevant
* what information is already available
* what additional information is required

### Step 3 — Plan

Possible plan:

```text
Retrieve transaction
      ↓
Check payment status
      ↓
Retrieve failure reason
      ↓
Determine resolution
```

### Step 4 — Authorization

Before sensitive tools are used, another system should determine whether the requested action is permitted.

```text
Agent proposes action
        ↓
Authorization / Policy
        ↓
ALLOW / DENY
```

### Step 5 — Act

The permitted tool is executed.

### Step 6 — Observe

The result becomes new context for the agent.

### Step 7 — Continue or Finish

The agent either:

* performs another step,
* completes the task,
* reports failure,
* or escalates to a human.

---

## Single-Agent Systems

A single-agent architecture uses one primary agent to manage the task.

```text
User
 ↓
Banking Agent
 │
 ├── Account API
 ├── Card API
 ├── Transaction API
 └── Support API
```

Example:

> "Show my recent transactions."

The banking agent selects the appropriate transaction tool and returns the result.

### Advantages

* Simpler architecture
* Easier development
* Easier debugging
* Lower orchestration overhead

### Limitations

As responsibilities increase, one agent may receive:

* too many tools
* too much context
* too many permissions
* too many responsibilities

This can make security, evaluation, and governance harder.

---

## Multi-Agent Systems

A multi-agent system divides responsibilities between specialized agents.

Example:

```text
                  Orchestrator
                       │
       ┌───────────────┼───────────────┐
       ↓               ↓               ↓
 Account Agent    Payment Agent    Fraud Agent
       │               │               │
 Account APIs     Payment APIs     Fraud Systems
```

Another banking architecture could contain:

```text
Customer Agent
Account Agent
Payment Agent
Loan Agent
KYC Agent
Fraud Agent
Compliance Agent
Support Agent
```

Each agent can have:

* its own purpose
* its own instructions
* its own tools
* its own permissions
* its own policies

For example:

```text
Account Agent

account.read        ✓
transactions.read   ✓
payment.create      ✗
loan.approve        ✗
```

while:

```text
Payment Agent

account.read        ✓
payment.create      ✓
loan.approve        ✗
```

Multi-agent systems can therefore create useful separation of responsibilities.

However, they also introduce additional coordination, security, observability, and failure-handling complexity.

---

## Agent Orchestration

Multi-agent systems need coordination.

This is **agent orchestration**.

Suppose:

> Investigate this suspicious payment.

The orchestrator could coordinate:

```text
                    Orchestrator
                         │
             ┌───────────┼───────────┐
             ↓           ↓           ↓
        Account      Transaction    Fraud
         Agent          Agent       Agent
             │           │           │
             └───────────┼───────────┘
                         ↓
                    Combine Results
                         ↓
                  Decision / Escalation
```

The orchestrator may determine:

* which agent should handle a task
* execution order
* which tasks can run in parallel
* what information agents can exchange
* when retries are appropriate
* when humans must intervene
* when the workflow is complete

---

## Common Banking Use Cases

AI agents are being explored across banking operations, customer service, financial crime, sales, credit, and other workflows.

### Customer Service

Agents can help:

```text
Understand customer issue
        ↓
Retrieve account context
        ↓
Search policies
        ↓
Resolve supported issues
        ↓
Escalate exceptions
```

---

### KYC and Customer Onboarding

A multi-agent workflow could contain:

```text
Document Agent
      ↓
extract information

Verification Agent
      ↓
validate information

Risk Agent
      ↓
calculate risk indicators

Compliance Agent
      ↓
perform required checks

Human Reviewer
      ↓
handle exceptions / approval
```

---

### Fraud Investigation

Agents could assist investigators by:

* gathering transaction information
* finding unusual patterns
* retrieving customer history
* collecting relevant evidence
* summarizing cases
* routing high-risk cases to investigators

---

### Lending

Agents can assist with:

```text
Document collection
        ↓
Information extraction
        ↓
Eligibility checks
        ↓
Risk analysis
        ↓
Recommendation
        ↓
Human / controlled decision process
```

Sensitive lending decisions require appropriate regulatory, model-risk, and human-oversight controls.

---

### Payments

An agent could help users prepare or initiate payments.

```text
Customer Request
       ↓
Payment Agent
       ↓
Retrieve required information
       ↓
Validate request
       ↓
Authorization / Risk Checks
       ↓
Customer / Human Approval
       ↓
Payment Service
```

The AI agent should not itself be the final security boundary for moving money.

---

### Banking Operations

Potential applications also include:

* reconciliation
* document processing
* exception handling
* reporting
* account servicing
* collections
* treasury workflows
* employee assistance

Agentic AI and multi-agent systems are increasingly being explored for banking operations, although production adoption of highly autonomous systems remains an emerging area.

---

## Common Architecture

A simplified enterprise banking-agent architecture looks like:

```text
                        User
                          │
                          ▼
                  Application / UI
                          │
                          ▼
                     AI Agent
                          │
                  Reason / Plan
                          │
                          ▼
                    Orchestrator
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
          Agent A      Agent B      Agent C
             │            │            │
             └────────────┼────────────┘
                          │
                    Policy Layer
                          │
                          ▼
                     Tool Layer
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
         APIs            MCP         Internal Services
          │               │               │
          └───────────────┼───────────────┘
                          ▼
                   Banking Systems
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
      Databases       Payments       Core Banking
```

Surrounding this architecture are additional controls:

```text
Identity
Authentication
Authorization
Governance
Guardrails
Risk Management
Logging
Monitoring
Auditing
Human Oversight
```

---

## Common Risks

Giving software greater autonomy creates additional risks.

### Unauthorized Actions

An agent could attempt an action outside its intended permissions.

Example:

```text
SupportAgent
      ↓
attempts
      ↓
transferMoney()
```

The architecture must prevent execution regardless of what the model requests.

---

### Excessive Permissions

An agent may be given more access than required.

Example:

```text
Support Agent

Needs:
customer.read
support_case.create

Actually receives:
customer.*
payments.*
loans.*
admin.*
```

This increases the potential impact of mistakes or compromise.

---

### Hallucination

An LLM may generate information unsupported by authoritative systems.

For banking data, critical facts should therefore be grounded in trusted sources.

---

### Prompt Injection

Untrusted user input, websites, emails, or documents may contain instructions attempting to manipulate the agent.

Tool authorization must not depend solely on the model following its prompt.

---

### Sensitive Data Exposure

Agents may process:

* personal information
* transaction history
* financial information
* identity documents
* internal bank information

Access and context should be limited to what the task requires.

---

### Incorrect Tool Use

An agent might:

* choose the wrong tool
* provide incorrect parameters
* repeat an operation
* execute actions in the wrong order

Sensitive operations therefore require deterministic validation around tool execution.

---

### Multi-Agent Risk

Multi-agent systems introduce additional concerns:

```text
Agent A
   ↓
passes information
   ↓
Agent B
   ↓
takes action
```

Organizations need to know:

* whether Agent A could share that information
* whether Agent B could receive it
* whether Agent B could perform the action
* which agent is accountable
* how the complete chain is audited

This leads directly to governance.

---

## Why Governance Becomes Necessary

Imagine a bank has:

```text
500 AI Agents

2,000 Tools

Hundreds of APIs

Millions of Customers
```

Questions immediately appear:

```text
Who created Agent A?

Who owns it?

Why does it exist?

Which model does it use?

What customer data can it access?

Which tools can it call?

Can it initiate payments?

Who approved those permissions?

Who changed its permissions?

What actions has it performed?

Who can disable it?

What happens if it behaves incorrectly?
```

The agent itself cannot be the authority answering these questions.

The organization needs an external system of:

```text
Identity
    +
Ownership
    +
Permissions
    +
Policies
    +
Approvals
    +
Guardrails
    +
Monitoring
    +
Audit
    +
Lifecycle Management
```

This is why **AI governance becomes necessary**.

As agentic systems take on more multistep banking workflows and potentially inherit access similar to human workers, access control, privacy, regulatory requirements, and model risk become central deployment concerns.

---

## Advantages

### Automation of Complex Workflows

Agents can handle tasks that require several dynamic steps rather than a single predefined operation.

### Natural-Language Interaction

Users can express goals instead of navigating complex workflows manually.

### Tool Integration

Agents can combine information from multiple enterprise systems.

### Adaptability

Agents can determine different execution paths depending on context.

### Specialization

Multi-agent architectures allow specialized agents for payments, accounts, fraud, KYC, lending, and other domains.

### Human Productivity

Agents can perform repetitive research, retrieval, documentation, and operational work while humans focus on exceptions and higher-value decisions.

---

## Limitations

### Non-Deterministic Behavior

LLM-based reasoning is not always perfectly predictable.

### Hallucinations

Models can produce plausible but incorrect information.

### Security Complexity

Giving agents tools creates new attack surfaces.

### Governance Complexity

Organizations must manage agent identities, ownership, permissions, policies, and lifecycle.

### Observability

Multi-step and multi-agent workflows can be difficult to debug and audit.

### Cost and Latency

Multiple model and tool calls can increase execution time and infrastructure cost.

### Integration Complexity

Real banks often contain legacy systems, fragmented data, and many existing services that agents must safely integrate with.

### Regulatory Constraints

High-impact banking activities may require extensive validation, explainability, auditing, human oversight, and other controls.

---

## Key Takeaways

1. An **AI agent** is a goal-oriented software system capable of reasoning, selecting tools, taking permitted actions, and observing results.

2. An **LLM is a component of an agent**, not the complete agent.

3. **Chatbots primarily communicate; agents can manage and execute workflows.**

4. Traditional software remains essential. Agents generally sit **above deterministic services**, rather than replacing them.

5. Tools connect agents with APIs, databases, MCP servers, payment systems, and internal services.

6. **Single-agent systems** are simpler, while **multi-agent systems** divide responsibilities among specialized agents.

7. **Orchestration** coordinates agents, tools, state, dependencies, and workflow execution.

8. Greater autonomy introduces greater security, privacy, operational, compliance, and financial risks.

9. Sensitive actions should be authorized and validated by systems **outside the LLM**.

10. Once organizations operate many agents, **governance becomes essential** for knowing who owns each agent, what it can access, what it can do, and who is accountable.

---

## How We'll Use This in Our Project

This research suggests that our project should treat an AI agent as a **governed actor**, rather than simply another chatbot or API client.

Conceptually:

```text
User
 ↓
Agent
 ↓
Proposed Action
 ↓
Governance / Authorization Layer
 ↓
ALLOW / DENY
 ↓
Tool / Service
```

The project should therefore be capable of answering questions such as:

```text
Which agent is making this request?

What is the agent trying to do?

Which resource is it trying to access?

Does the agent have permission?

Which policy authorized or denied the action?

Who approved that permission?

What happened after authorization?

Can the complete action be audited?
```

This leads directly into the next research topic:

**`02-ai-governance.md`**

The central architectural insight from this research is:

> **Agents provide capability, but capability without identity, authorization, policies, monitoring, and accountability creates risk.**

Our architecture should therefore separate:

```text
Agent reasoning
        ≠
Authorization decision
        ≠
Business execution
```

An agent may **propose** an action.

A policy/authorization system should determine whether the action is **permitted**.

A trusted application or service should **execute** the permitted action.

---

## Sources

* McKinsey & Company — *AI in Asia: Reimagining banking operations through agentic AI* (2025). Covers multi-agent systems and banking operations.
* Deloitte — *How banks can supercharge intelligent automation with agentic AI* (2025). Discusses agent characteristics, banking use cases, autonomy, and deployment risks.
* McKinsey & Company — *How agentic AI can change the way banks fight financial crime* (2025). Covers KYC/AML agent workflows, agent squads, RAG agents, validation agents, and human oversight.
* McKinsey & Company — *Banking and AI: When the tech starts doing the work, not just assisting it* (2026). Discusses the movement from AI assistance toward autonomous multistep banking workflows.
