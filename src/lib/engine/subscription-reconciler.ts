import { prisma } from "@/lib/db/prisma";
import { SeatStatus } from "@prisma/client";

export interface ReconcileResult {
  totalSeats: number;
  activeSeats: number;
  zombieSeats: number;
  monthlySpendPaise: number;
  monthlySavingsPaise: number;
  prunableSeats: {
    id: string;
    merchantId: string;
    merchantName: string;
    allocatedEmail: string;
    allocatedName: string | null;
    monthlyCostPaise: number;
    lastActivityDate: Date | null;
  }[];
}

export class SubscriptionReconciler {
  /**
   * Scans active SaaS subscriptions and detects orphaned/zombie seats.
   */
  static async analyzeSeats(): Promise<ReconcileResult> {
    const seats = await prisma.subscriptionSeat.findMany({
      orderBy: { createdAt: "desc" },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let activeCount = 0;
    let zombieCount = 0;
    let totalSpend = 0;
    let totalSavings = 0;

    const prunableSeats: ReconcileResult["prunableSeats"] = [];

    for (const seat of seats) {
      totalSpend += seat.monthlyCostPaise;

      const isInactive =
        seat.status === SeatStatus.INACTIVE ||
        seat.status === SeatStatus.PENDING_PRUNING ||
        (seat.lastActivityDate && seat.lastActivityDate < thirtyDaysAgo);

      if (isInactive) {
        zombieCount++;
        totalSavings += seat.monthlyCostPaise;
        prunableSeats.push({
          id: seat.id,
          merchantId: seat.merchantId,
          merchantName: seat.merchantName,
          allocatedEmail: seat.allocatedEmail,
          allocatedName: seat.allocatedName,
          monthlyCostPaise: seat.monthlyCostPaise,
          lastActivityDate: seat.lastActivityDate,
        });
      } else {
        activeCount++;
      }
    }

    return {
      totalSeats: seats.length,
      activeSeats: activeCount,
      zombieSeats: zombieCount,
      monthlySpendPaise: totalSpend,
      monthlySavingsPaise: totalSavings,
      prunableSeats,
    };
  }

  /**
   * Automatically prunes/cancels inactive zombie seats before monthly renewal.
   */
  static async pruneZombieSeats(seatIds: string[]) {
    if (!seatIds.length) return { prunedCount: 0, totalSavedPaise: 0 };

    const seatsToPrune = await prisma.subscriptionSeat.findMany({
      where: { id: { in: seatIds } },
    });

    const totalSavedPaise = seatsToPrune.reduce((sum, s) => sum + s.monthlyCostPaise, 0);

    await prisma.subscriptionSeat.updateMany({
      where: { id: { in: seatIds } },
      data: { status: SeatStatus.CANCELLED },
    });

    return {
      prunedCount: seatsToPrune.length,
      totalSavedPaise,
    };
  }
}
