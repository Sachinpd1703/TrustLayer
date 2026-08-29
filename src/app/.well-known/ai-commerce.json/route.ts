import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = {
    version: "1.0.0",
    name: "TrustLayer Verified Merchant Catalog",
    description: "Machine-readable e-commerce & SaaS catalog for autonomous AI buyer agents on Razorpay.",
    gateway: "RAZORPAY",
    currency: "INR",
    merchants: [
      {
        merchant_id: "mid_figma_01",
        name: "Figma Design Platform",
        mcc: "5734",
        category: "Software_SaaS",
        products: [
          {
            sku: "figma_dev_seat_monthly",
            name: "Figma Developer Seat (Monthly)",
            price_paise: 80000,
            price_inr: 800,
            billing_period: "MONTHLY",
            checkout_endpoint: "/api/v1/agent/propose-payment",
          },
          {
            sku: "figma_org_annual",
            name: "Figma Organization License (Annual)",
            price_paise: 5400000,
            price_inr: 54000,
            billing_period: "ANNUAL",
            checkout_endpoint: "/api/v1/agent/propose-payment",
          },
        ],
      },
      {
        merchant_id: "mid_slack_01",
        name: "Slack Technologies",
        mcc: "5734",
        category: "Communication_SaaS",
        products: [
          {
            sku: "slack_pro_user_monthly",
            name: "Slack Pro Seat (Monthly)",
            price_paise: 80000,
            price_inr: 800,
            billing_period: "MONTHLY",
            checkout_endpoint: "/api/v1/agent/propose-payment",
          },
        ],
      },
      {
        merchant_id: "mid_aws_01",
        name: "Amazon Web Services Cloud",
        mcc: "7372",
        category: "Cloud_Infrastructure",
        products: [
          {
            sku: "aws_ec2_reserved_q3",
            name: "AWS Dedicated Cloud Compute Instance",
            price_paise: 3500000,
            price_inr: 35000,
            billing_period: "QUARTERLY",
            checkout_endpoint: "/api/v1/agent/propose-payment",
          },
          {
            sku: "aws_gpu_cluster_training",
            name: "AWS High-Performance GPU Cluster",
            price_paise: 6500000,
            price_inr: 65000,
            billing_period: "MONTHLY",
            checkout_endpoint: "/api/v1/agent/propose-payment",
          },
        ],
      },
    ],
  };

  return NextResponse.json(catalog, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
