/**
 * Anthropic Model Context Protocol (MCP) Server for TrustLayer
 * Exposes autonomous Razorpay payment tools to Claude Desktop, Cursor IDE, and AI Agents.
 */

export const TrustLayerMCPTools = [
  {
    name: "propose_razorpay_payment",
    description:
      "Proposes an autonomous purchase or subscription renewal on Razorpay. The request is securely gated by TrustLayer spend policies, velocity caps, and MCC whitelists before execution.",
    inputSchema: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          description: "Human-readable explanation of why the payment is being made (e.g. 'Renew 2 Figma developer seats').",
        },
        reasoning: {
          type: "string",
          description: "LLM step-by-step reasoning explaining merchant selection, necessity, and price verification.",
        },
        amount_paise: {
          type: "integer",
          description: "Payment amount in INR paise (e.g. 160000 for ₹1,600).",
        },
        merchant_id: {
          type: "string",
          description: "Target Razorpay Merchant ID (e.g. 'mid_figma_01', 'mid_aws_01').",
        },
        category: {
          type: "string",
          description: "Merchant category (e.g. 'SaaS_Subscription', 'Cloud_Infrastructure').",
        },
      },
      required: ["intent", "reasoning", "amount_paise", "merchant_id"],
    },
  },
  {
    name: "get_policy_limits",
    description:
      "Retrieves the active financial spend guardrails, autonomous per-order caps, remaining daily velocity budget, and approved merchant allowlists.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Unique identifier of the agent (e.g. 'agent_procure_v2').",
        },
      },
      required: ["agent_id"],
    },
  },
];

export async function handleMCPToolCall(name: string, args: Record<string, unknown>, apiUrl = "http://localhost:3000") {
  if (name === "propose_razorpay_payment") {
    const res = await fetch(`${apiUrl}/api/v1/agent/propose-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: "agent_procure_v2",
        intent: args.intent,
        reasoningText: args.reasoning,
        reasoningHash: `sha256:${Buffer.from(String(args.reasoning)).toString("hex").padEnd(64, "0").slice(0, 64)}`,
        orderPayload: {
          amountPaise: Number(args.amount_paise),
          currency: "INR",
          merchantId: String(args.merchant_id),
          category: String(args.category || "General_SaaS"),
        },
      }),
    });
    return await res.json();
  }

  if (name === "get_policy_limits") {
    const res = await fetch(`${apiUrl}/api/v1/policies`);
    return await res.json();
  }

  throw new Error(`Unknown MCP Tool: ${name}`);
}
