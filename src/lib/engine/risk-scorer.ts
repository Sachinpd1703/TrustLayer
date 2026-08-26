// Heuristic Anomaly & Prompt Injection Detector

const SUSPICIOUS_PROMPT_PATTERNS = [
  /ignore previous instructions/i,
  /system override/i,
  /bypass security/i,
  /transfer all balance/i,
  /jailbreak/i,
  /unrestricted payout/i,
];

export class RiskScorer {
  /**
   * Evaluates prompt text, declared intent, and amount for anomalies.
   * Returns a risk score between 0.0 (safe) and 1.0 (critical threat).
   */
  static evaluate(params: {
    intent: string;
    reasoningText?: string;
    amountPaise: number;
    merchantId: string;
  }): number {
    let score = 0.05; // Base minimum risk

    const fullText = `${params.intent} ${params.reasoningText || ""}`;

    // 1. Check for prompt injection markers
    for (const pattern of SUSPICIOUS_PROMPT_PATTERNS) {
      if (pattern.test(fullText)) {
        score += 0.75;
      }
    }

    // 2. Untrusted / Shady Merchant keyword check
    if (/crypto|casino|betting|untrusted|shadow|darkweb/i.test(params.merchantId)) {
      score += 0.8;
    }

    // 3. Amount Multiplier Heuristic (> ₹30,000 increases baseline scrutiny)
    if (params.amountPaise > 3000000) {
      score += 0.25;
    }

    return Math.min(1.0, Math.max(0.0, Number(score.toFixed(2))));
  }
}
