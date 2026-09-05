import { prisma } from "@/lib/db/prisma";
import { EventBus } from "@/lib/events/event-bus";
import { SeatStatus, ProvisioningStatus } from "@prisma/client";

export interface ProvisionLicenseParams {
  transactionId: string;
  merchantId: string;
  merchantName?: string;
  sku?: string;
  amountPaise: number;
  beneficiary: {
    employeeEmail: string;
    employeeName?: string;
    employeeId?: string;
    departmentCode?: string;
    workspaceId?: string;
    licenseType?: string;
  };
}

export class VendorProvisioner {
  /**
   * Automatically activates the employee's SaaS license seat upon payment clearance.
   */
  static async activateLicense(params: ProvisionLicenseParams) {
    const {
      transactionId,
      merchantId,
      merchantName = "Verified SaaS Vendor",
      sku = "seat_standard_monthly",
      amountPaise,
      beneficiary,
    } = params;

    const nextRenewal = new Date();
    nextRenewal.setDate(nextRenewal.getDate() + 30);

    // 1. Upsert Subscription Seat (Idempotent: prevents duplicate active seat billing!)
    const seat = await prisma.subscriptionSeat.upsert({
      where: {
        merchantId_allocatedEmail: {
          merchantId,
          allocatedEmail: beneficiary.employeeEmail,
        },
      },
      update: {
        status: SeatStatus.ACTIVE,
        monthlyCostPaise: amountPaise,
        lastActivityDate: new Date(),
        nextRenewalDate: nextRenewal,
      },
      create: {
        merchantId,
        merchantName,
        sku,
        allocatedEmail: beneficiary.employeeEmail,
        allocatedName: beneficiary.employeeName || beneficiary.employeeEmail.split("@")[0],
        employeeId: beneficiary.employeeId || `EMP_${Math.floor(1000 + Math.random() * 9000)}`,
        departmentCode: beneficiary.departmentCode || "ENGINEERING",
        monthlyCostPaise: amountPaise,
        status: SeatStatus.ACTIVE,
        nextRenewalDate: nextRenewal,
      },
    });

    // 2. Update Beneficiary Metadata status
    await prisma.beneficiaryMetadata.updateMany({
      where: { transactionId },
      data: {
        provisioningStatus: ProvisioningStatus.ACTIVE,
        provisionedAt: new Date(),
      },
    });

    // 3. Broadcast Event to Real-Time Dashboard
    EventBus.broadcast({
      id: `prov_${Date.now()}`,
      type: "LICENSE_PROVISIONED",
      timestamp: new Date().toISOString(),
      agentId: "SYSTEM_FULFILLMENT",
      amountPaise,
      currency: "INR",
      merchantId,
      intent: `License activated for ${beneficiary.employeeEmail} (${seat.sku})`,
      decision: "ALLOW",
      reason: `Provisioned on ${merchantName} -> Seat ID: ${seat.id}`,
      riskScore: 0,
    });

    return seat;
  }
}
