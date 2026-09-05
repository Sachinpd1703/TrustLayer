import { prisma } from "@/lib/db/prisma";

export class VelocityTracker {
  /**
   * Get total rolling spend in paise for an agent within the last N milliseconds (default: 24 hours).
   * Aggregates directly from PostgreSQL Transaction records.
   */
  static async getRollingSpendPaise(
    agentId: string,
    windowMs = 86400000
  ): Promise<number> {
    const cutoff = new Date(Date.now() - windowMs);
    const result = await prisma.transaction.aggregate({
      where: {
        agentId,
        status: { in: ["EXECUTED", "PENDING"] },
        createdAt: { gte: cutoff },
      },
      _sum: { amountPaise: true },
    });

    return result._sum?.amountPaise || 0;

  }

  /**
   * Get transaction request frequency (e.g. requests in the last 60 seconds).
   */
  static async getRecentRequestCount(
    agentId: string,
    windowMs = 60000
  ): Promise<number> {
    const cutoff = new Date(Date.now() - windowMs);
    return await prisma.transaction.count({
      where: {
        agentId,
        createdAt: { gte: cutoff },
      },
    });
  }

  /**
   * Deprecated / legacy helper preserved for backward compatibility.
   * Spend is recorded automatically in PostgreSQL via Prisma Transaction records.
   */
  static recordSpend(_agentId: string, _amountPaise: number): void {
    // Database-backed transactions are persisted directly via Prisma
  }
}

