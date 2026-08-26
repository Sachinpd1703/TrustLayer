/**
 * Anthropic Model Context Protocol (MCP) Server for TrustLayer
 * Exposes `propose_razorpay_payment` tool to AI Models (Claude, Cursor, AutoGPT).
 */

export const TrustLayerMCPToolDefinition = {
  name: "propose_razorpay_payment",
  description:
    "Proposes an autonomous purchase or payment on Razorpay. The request will be securely evaluated, bounded, and gated against organizational spend policies before execution.",
  input_schema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        description: "Human-readable explanation of why the payment is being made.",
      },
      reasoning: {
        type: "string",
        description: "LLM step-by-step reasoning explaining merchant and price selection.",
      },
      amount_paise: {
        type: "integer",
        description: "Payment amount in INR paise (e.g. 160000 for ₹1,600).",
      },
      merchant_id: {
        type: "string",
        description: "Target Razorpay Merchant ID (e.g. mid_slack_01).",
      },
      category: {
        type: "string",
        description: "Merchant category (e.g. SaaS_Subscription, Cloud_Infrastructure).",
      },
    },
    required: ["intent", "reasoning", "amount_paise", "merchant_id"],
  },
};
