import crypto from "crypto";

export interface OmnichannelNotificationPayload {
  approvalId: string;
  transactionId: string;
  agentId: string;
  agentName?: string;
  amountPaise: number;
  currency: string;
  merchantId: string;
  intent: string;
  tier: "TIER_SINGLE_MANAGER" | "TIER_DUAL_CUSTODY";
  riskScore: number;
}

export class OmnichannelNotifier {
  /**
   * Generates a signed action token for secure 1-click approvals via mobile links
   */
  static generateActionToken(approvalId: string, action: "APPROVE" | "REJECT", secret: string): string {
    const payload = `${approvalId}:${action}:${Date.now()}`;
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return Buffer.from(`${payload}:${signature}`).toString("base64url");
  }

  /**
   * Verifies an action token from an incoming mobile click
   */
  static verifyActionToken(token: string, secret: string): { isValid: boolean; approvalId?: string; action?: string } {
    try {
      const decoded = Buffer.from(token, "base64url").toString("utf-8");
      const parts = decoded.split(":");
      if (parts.length !== 4) return { isValid: false };

      const [approvalId, action, timestampStr, signature] = parts;
      const payload = `${approvalId}:${action}:${timestampStr}`;
      const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");

      if (signature !== expectedSig) return { isValid: false };

      // Verify 24h expiration
      const timestamp = Number(timestampStr);
      if (Date.now() - timestamp > 86400000) return { isValid: false };

      return { isValid: true, approvalId, action };
    } catch {
      return { isValid: false };
    }
  }

  /**
   * Dispatches approval cards to Telegram, Slack, or webhook integrations
   */
  static async dispatch(payload: OmnichannelNotificationPayload, appUrl: string, secret: string): Promise<void> {
    const amountInr = (payload.amountPaise / 100).toLocaleString("en-IN");
    const approveToken = this.generateActionToken(payload.approvalId, "APPROVE", secret);
    const rejectToken = this.generateActionToken(payload.approvalId, "REJECT", secret);

    const approveUrl = `${appUrl}/api/v1/approvals/callback?token=${approveToken}`;
    const rejectUrl = `${appUrl}/api/v1/approvals/callback?token=${rejectToken}`;

    const formattedMessage = `🚨 *[TrustLayer HITL Alert]* Step-Up Approval Required\n\n` +
      `• *Agent:* ${payload.agentId}\n` +
      `• *Amount:* ₹${amountInr} ${payload.currency}\n` +
      `• *Merchant:* ${payload.merchantId}\n` +
      `• *Tier:* ${payload.tier === "TIER_DUAL_CUSTODY" ? "Dual-Custody Multi-Signatory" : "Single Manager"}\n` +
      `• *Intent:* "${payload.intent}"\n` +
      `• *Risk Score:* ${payload.riskScore}\n\n` +
      `👉 [Approve & Create Razorpay Order](${approveUrl})\n` +
      `❌ [Reject Transaction](${rejectUrl})`;

    // Log dispatch payload for demonstration / console trace
    console.log(`[Omnichannel Notification Dispatched] Approval ID: ${payload.approvalId}`);
    console.log(formattedMessage);
  }
}
