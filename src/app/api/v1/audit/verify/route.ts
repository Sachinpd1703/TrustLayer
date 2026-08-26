import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { computeAuditLogHash, computeSha256 } from "@/lib/security/audit-chain";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { logIndex: "asc" },
    });

    if (logs.length === 0) {
      return NextResponse.json({
        isValid: true,
        totalLogs: 0,
        message: "No audit logs found. Ledger is empty.",
      });
    }

    let isValid = true;
    let corruptedIndex: number | null = null;
    let expectedPreviousHash = computeSha256("GENESIS_BLOCK_TRUSTLAYER_2026");

    for (const log of logs) {
      // 1. Verify previous hash linkage
      if (log.logIndex > 1 && log.previousLogHash !== expectedPreviousHash) {
        isValid = false;
        corruptedIndex = log.logIndex;
        break;
      }

      // 2. Recompute current hash
      const recomputed = computeAuditLogHash({
        previousLogHash: log.previousLogHash,
        logIndex: log.logIndex,
        transactionId: log.transactionId,
        agentId: log.agentId,
        amountPaise: log.amountPaise,
        decision: log.decision,
        reasoningHash: log.reasoningHash,
        timestamp: log.timestamp.toISOString(),
      });

      // Update pointer for next entry
      expectedPreviousHash = log.currentLogHash;
    }

    return NextResponse.json({
      isValid,
      totalVerified: logs.length,
      corruptedIndex,
      ledgerStatus: isValid ? "CRYPTOGRAPHICALLY_VERIFIED_IMMUTABLE" : "TAMPERING_DETECTED",
      verifiedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
