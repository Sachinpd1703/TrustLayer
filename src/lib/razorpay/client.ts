import Razorpay from "razorpay";
import { env } from "@/lib/config";

// Razorpay SDK Singleton Client
export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export interface CreateOrderParams {
  amountPaise: number;
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export async function executeRazorpayOrder(
  params: CreateOrderParams
): Promise<RazorpayOrderResponse> {
  // If in test mode with mock keys, generate a valid simulated Razorpay order response
  if (
    !env.RAZORPAY_KEY_ID ||
    env.RAZORPAY_KEY_ID === "rzp_test_YourKeyIdHere" ||
    env.RAZORPAY_KEY_SECRET === "YourKeySecretHere"
  ) {
    const mockOrderId = `order_RZP${Math.floor(10000000 + Math.random() * 90000000)}`;
    return {
      id: mockOrderId,
      entity: "order",
      amount: params.amountPaise,
      amount_paid: 0,
      amount_due: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt || `rcpt_${Date.now()}`,
      status: "created",
      attempts: 0,
      notes: params.notes || {},
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  // Real live/test mode API execution via SDK
  return (await razorpay.orders.create({
    amount: params.amountPaise,
    currency: params.currency,
    receipt: params.receipt || `rcpt_${Date.now()}`,
    notes: params.notes,
  })) as unknown as RazorpayOrderResponse;
}
