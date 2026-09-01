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
    version: "0.2.2",
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
          "Proposes an autonomous purchase, subscription renewal, or vendor payment on Razorpay. The request is deterministically evaluated against active organizational spend caps, velocity limits, and MCC whitelists before execution.",
        inputSchema: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              description: "Human-readable intent explaining why the purchase is required (e.g. 'Renew 2 Figma developer seats for Q3').",
            },
            reasoning: {
              type: "string",
              description: "Step-by-step LLM reasoning verifying necessity, price justification, and vendor authenticity.",
            },
            amount_paise: {
              type: "integer",
              description: "Amount in INR Paise (e.g. 160000 for ₹1,600.00).",
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

      const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/agent/propose-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          intent: args.intent,
          reasoningText: reasoning,
          reasoningHash,
          orderPayload: {
            amountPaise: Number(args.amount_paise),
            currency: "INR",
            merchantId: String(args.merchant_id),
            category: "Autonomous_Agentic_Commerce",
            mccCode: String(args.mcc_code || "5734"),
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
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/policies`);
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
