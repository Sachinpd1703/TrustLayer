import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required in .env"),
  DIRECT_URL: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().default("rzp_test_mock_sandbox"),
  RAZORPAY_KEY_SECRET: z.string().default("mock_secret_sandbox"),
  RAZORPAY_WEBHOOK_SECRET: z.string().default("mock_webhook_secret"),
  TRUSTLAYER_ENCLAVE_SECRET: z.string().default("trustlayer_default_dev_secret"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

export const env = EnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  TRUSTLAYER_ENCLAVE_SECRET: process.env.TRUSTLAYER_ENCLAVE_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
