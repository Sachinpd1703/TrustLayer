import crypto from "crypto";

export function computeAuditLogHash(params: {
  previousLogHash: string;
  logIndex: number;
  transactionId: string;
  agentId: string;
  amountPaise: number;
  decision: string;
  reasoningHash: string;
  timestamp: string;
}): string {
  const content = `${params.previousLogHash}|${params.logIndex}|${params.transactionId}|${params.agentId}|${params.amountPaise}|${params.decision}|${params.reasoningHash}|${params.timestamp}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function computeSha256(text: string): string {
  return "sha256:" + crypto.createHash("sha256").update(text).digest("hex");
}
