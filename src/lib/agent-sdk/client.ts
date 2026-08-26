import { computeSha256 } from "@/lib/security/audit-chain";

export interface ProposePaymentSDKParams {
  agentId: string;
  intent: string;
  reasoningText: string;
  amountPaise: number;
  currency?: string;
  merchantId: string;
  category?: string;
  receipt?: string;
  notes?: Record<string, string>;
  gatewayUrl?: string;
}

export class TrustLayerAgentClient {
  private agentId: string;
  private gatewayUrl: string;

  constructor(agentId: string, gatewayUrl = "http://localhost:3000") {
    this.agentId = agentId;
    this.gatewayUrl = gatewayUrl;
  }

  /**
   * Constructs signed payload and submits to TrustLayer Policy Gateway.
   */
  async proposePayment(params: Omit<ProposePaymentSDKParams, "agentId" | "gatewayUrl">) {
    const reasoningHash = computeSha256(params.reasoningText || params.intent);

    const payload = {
      agentId: this.agentId,
      intent: params.intent,
      reasoningText: params.reasoningText,
      reasoningHash,
      orderPayload: {
        amountPaise: params.amountPaise,
        currency: params.currency || "INR",
        merchantId: params.merchantId,
        category: params.category || "General_SaaS",
        receipt: params.receipt || `rcpt_${Date.now()}`,
        notes: params.notes || {},
      },
    };

    const timestamp = new Date().toISOString();
    // Simulate Ed25519 signature
    const signature = `ed25519_sig_${computeSha256(JSON.stringify(payload) + timestamp).slice(7, 39)}`;

    const response = await fetch(`${this.gatewayUrl}/api/v1/agent/propose-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-ID": this.agentId,
        "X-Agent-Signature": signature,
        "X-Timestamp": timestamp,
      },
      body: JSON.stringify(payload),
    });

    return await response.json();
  }
}
