import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { VirtualCardStatus } from "@prisma/client";

export interface IssueVirtualCardParams {
  agentId: string;
  transactionId?: string;
  spendLimitPaise: number;
  currency?: string;
  cardholderName?: string;
}

export class VirtualCardManager {
  /**
   * Provisions an ephemeral single-use 16-digit Virtual Card with exact authorization bounds and 10-minute TTL.
   */
  static async issueSingleUseCard(params: IssueVirtualCardParams) {
    const {
      agentId,
      transactionId,
      spendLimitPaise,
      currency = "INR",
      cardholderName = "TrustLayer AI - Autonomous Buyer",
    } = params;

    // Generate simulated card token & masked PAN
    const randomCardSuffix = Math.floor(1000 + Math.random() * 9000);
    const maskedPan = `4111-XXXX-XXXX-${randomCardSuffix}`;
    const cardToken = `tok_vc_${crypto.randomBytes(12).toString("hex")}`;

    // Set 10-minute strict TTL
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const card = await prisma.virtualCard.create({
      data: {
        agentId,
        transactionId: transactionId || undefined,
        cardToken,
        maskedPan,
        cardholderName,
        currency,
        spendLimitPaise,
        status: VirtualCardStatus.ACTIVE,
        expiresAt,
      },
    });

    return card;
  }

  /**
   * Terminate card upon settlement or expiry
   */
  static async terminateCard(cardId: string) {
    return await prisma.virtualCard.update({
      where: { id: cardId },
      data: { status: VirtualCardStatus.TERMINATED },
    });
  }
}
