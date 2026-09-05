import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

const DISALLOWED_PRODUCTION_SECRETS = [
  "rzp_test_mock_sandbox",
  "mock_secret_sandbox",
  "mock_webhook_secret",
  "trustlayer_default_dev_secret",
  "tl_whsec_test_demo_secret",
];

const secretField = (envVarName: string, defaultDevValue: string) => {
  if (isProduction) {
    return z
      .string({
        required_error: `${envVarName} is strictly required in production`,
      })
      .min(10, `${envVarName} must be a valid key (at least 10 characters)`)
      .refine(
        (val) => !DISALLOWED_PRODUCTION_SECRETS.includes(val),
        `${envVarName} cannot use placeholder/mock values in production`
      );
  }
  return z.string().default(defaultDevValue);
};

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required in .env"),
  DIRECT_URL: z.string().optional(),
  RAZORPAY_KEY_ID: secretField("RAZORPAY_KEY_ID", "rzp_test_mock_sandbox"),
  RAZORPAY_KEY_SECRET: secretField("RAZORPAY_KEY_SECRET", "mock_secret_sandbox"),
  RAZORPAY_WEBHOOK_SECRET: secretField("RAZORPAY_WEBHOOK_SECRET", "mock_webhook_secret"),
  TRUSTLAYER_ENCLAVE_SECRET: secretField(
    "TRUSTLAYER_ENCLAVE_SECRET",
    "trustlayer_default_dev_secret"
  ),
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

