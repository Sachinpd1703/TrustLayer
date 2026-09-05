#!/usr/bin/env node

/**
 * TrustLayer Official Model Context Protocol (MCP) Server
 * Compatible with Claude Desktop, Cursor IDE, Windsurf, and custom AI Agent environments.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import crypto from "crypto";

const API_BASE_URL = process.env.TRUSTLAYER_API_URL || "https://trust-layer-amber.vercel.app";

// Initialize MCP Server
const server = new Server(
  {
    name: "trustlayer-razorpay-gateway",
    version: "0.3.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Define Exposed Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "propose_razorpay_payment",
        description:
          "Proposes an autonomous purchase, SaaS license seat renewal, or vendor payment on Razorpay. Supports automatic employee license provisioning and single-use virtual card minting.",
        inputSchema: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              description: "Human-readable intent explaining why the purchase is required (e.g. 'Renew Figma Developer Seat for Rohit Sharma').",
            },
            reasoning: {
              type: "string",
              description: "Step-by-step LLM reasoning verifying necessity, price justification, and vendor authenticity.",
            },
            amount_paise: {
              type: "integer",
              description: "Amount in INR Paise (e.g. 80000 for ₹800.00).",
            },
            merchant_id: {
              type: "string",
              description: "Target Razorpay Merchant ID (e.g. 'mid_figma_01', 'mid_slack_01', 'mid_aws_01').",
            },
            agent_id: {
              type: "string",
              description: "Optional Agent Identity ID. Defaults to 'agent_procure_v2'.",
            },
            mcc_code: {
              type: "string",
              description: "Optional ISO Merchant Category Code (e.g. '5734' for Software/SaaS, '7372' for Cloud Compute).",
            },
            beneficiary_email: {
              type: "string",
              description: "Optional corporate email of the employee to allocate the license/seat to (e.g. 'rohit.sharma@enterprise.internal').",
            },
            employee_name: {
              type: "string",
              description: "Optional employee full name (e.g. 'Rohit Sharma').",
            },
            employee_id: {
              type: "string",
              description: "Optional corporate employee ID (e.g. 'EMP_1042').",
            },
            issue_virtual_card: {
              type: "boolean",
              description: "Set true if a single-use 10-minute disposable Virtual Card is needed for checkout.",
            },
          },
          required: ["intent", "reasoning", "amount_paise", "merchant_id"],
        },
      },
      {
        name: "get_policy_limits",
        description:
          "Fetches active spending limits, per-order autonomous caps, rolling velocity limits, and approved vendor allowlists from TrustLayer.",
        inputSchema: {
          type: "object",
          properties: {
            agent_id: {
              type: "string",
              description: "Agent ID to query budget status for (e.g. 'agent_procure_v2').",
            },
          },
        },
      },
      {
        name: "get_merchant_catalog",
        description:
          "Retrieves the machine-readable e-commerce & SaaS catalog of verified merchants, SKUs, and checkout endpoints for AI Buyers.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_active_subscriptions",
        description:
          "Lists all active SaaS subscriptions, provisioned employee seats, monthly costs, and renewal dates.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "reconcile_zombie_seats",
        description:
          "Scans SaaS subscriptions to detect inactive/orphaned seats and calculate monthly cost savings prior to renewal.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Helper for HTTP fetch with 10s timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 2. Handle Tool Invocations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    if (name === "propose_razorpay_payment") {
      const agentId = String(args.agent_id || "agent_procure_v2");
      const reasoning = String(args.reasoning || "");
      const reasoningHash = `sha256:${crypto.createHash("sha256").update(reasoning).digest("hex")}`;

      const beneficiary = args.beneficiary_email
        ? {
            employeeEmail: String(args.beneficiary_email),
            employeeName: args.employee_name ? String(args.employee_name) : undefined,
            employeeId: args.employee_id ? String(args.employee_id) : undefined,
          }
        : undefined;

      const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/agent/propose-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          intent: args.intent,
          reasoningText: reasoning,
          reasoningHash,
          beneficiary,
          orderPayload: {
            amountPaise: Number(args.amount_paise),
            currency: "INR",
            merchantId: String(args.merchant_id),
            category: "Autonomous_Agentic_Commerce",
            mccCode: String(args.mcc_code || "5734"),
            issueVirtualCard: Boolean(args.issue_virtual_card),
          },
        }),
      });

      const data = await res.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    if (name === "get_policy_limits") {
      const agentId = args.agent_id ? String(args.agent_id) : undefined;
      const policyRes = await fetchWithTimeout(`${API_BASE_URL}/api/v1/policies`);
      const policyData = await policyRes.json();

      let agentData = null;
      if (agentId) {
        try {
          const agentsRes = await fetchWithTimeout(`${API_BASE_URL}/api/v1/agents`);
          const allAgents = await agentsRes.json();
          if (Array.isArray(allAgents)) {
            agentData = allAgents.find((a: { agentId: string }) => a.agentId === agentId) || null;
          }
        } catch {
          // fallback to policy data only
        }
      }

      const responsePayload = {
        activePolicy: policyData,
        agentProfile: agentData
          ? {
              agentId: agentData.agentId,
              name: agentData.name,
              department: agentData.department?.name || "General",
              departmentCode: agentData.department?.code || "GENERAL",
              status: agentData.status,
              perOrderCapInr: agentData.maxPerOrderCap / 100,
              dailyCapInr: agentData.dailySpendCap / 100,
              monthlyBudgetInr: agentData.monthlyBudgetCap / 100,
              totalSpentInr: (agentData.totalSpentPaise || 0) / 100,
            }
          : null,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(responsePayload, null, 2),
          },
        ],
      };
    }

    if (name === "get_merchant_catalog") {
      const res = await fetchWithTimeout(`${API_BASE_URL}/.well-known/ai-commerce.json`);
      const data = await res.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    if (name === "list_active_subscriptions") {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/subscriptions`);
      const data = await res.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    if (name === "reconcile_zombie_seats") {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/subscriptions/reconcile`);
      const data = await res.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown MCP tool requested: ${name}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "MCP_EXECUTION_FAILED", message: msg }),
        },
      ],
      isError: true,
    };
  }
});

// 3. Connect Transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch((err) => {
  console.error("Fatal MCP Server Error:", err);
  process.exit(1);
});
