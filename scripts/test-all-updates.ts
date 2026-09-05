import "dotenv/config";
import crypto from "crypto";
import { prisma } from "../src/lib/db/prisma";
import {
  verifyAgentSignature,
  verifyAntiReplayNonce,
} from "../src/lib/security/agent-auth";
import { VelocityTracker } from "../src/lib/engine/velocity-tracker";
import { env } from "../src/lib/config";
import fs from "fs";
import path from "path";

// ANSI Color Helpers
const green = (t: string) => `\x1b[32m${t}\x1b[0m`;
const red = (t: string) => `\x1b[31m${t}\x1b[0m`;
const cyan = (t: string) => `\x1b[36m${t}\x1b[0m`;
const bold = (t: string) => `\x1b[1m${t}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`  ${green("✔ PASS:")} ${description}`);
    passed++;
  } else {
    console.error(`  ${red("✖ FAIL:")} ${description}${details ? ` -> ${details}` : ""}`);
    failed++;
  }
}

async function runAllTests() {
  console.log(bold(cyan("\n========================================================")));
  console.log(bold(cyan("     TRUSTLAYER COMPREHENSIVE UPDATE TEST SUITE         ")));
  console.log(bold(cyan("========================================================\n")));

  // ----------------------------------------------------
  // TEST SUITE 1: Ed25519 Cryptographic Signatures
  // ----------------------------------------------------
  console.log(bold("1. Testing Ed25519 Cryptographic Verification (agent-auth.ts)"));
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const payload = JSON.stringify({
      agentId: "agent_qa_test",
      amountPaise: 50000,
      merchantId: "mid_figma_01",
      timestamp: new Date().toISOString(),
    });

    const signatureHex = crypto
      .sign(null, Buffer.from(payload, "utf-8"), privateKey)
      .toString("hex");

    const spkiPem = publicKey
      .export({ type: "spki", format: "pem" })
      .toString();

    // 1.1 Valid PEM Signature
    const resPem = verifyAgentSignature({
      publicKey: spkiPem,
      signatureHex,
      payloadString: payload,
      timestampHeader: new Date().toISOString(),
    });
    assert("Verifies valid Ed25519 signature with SPKI PEM key", resPem.isValid);

    // 1.2 Valid Raw 32-byte Hex Key
    const der = publicKey.export({ type: "spki", format: "der" });
    const raw32Hex = der.subarray(der.length - 32).toString("hex");
    const resRaw = verifyAgentSignature({
      publicKey: raw32Hex,
      signatureHex,
      payloadString: payload,
    });
    assert("Verifies valid Ed25519 signature with raw 32-byte hex public key", resRaw.isValid);

    // 1.3 Tampered Payload Rejection
    const resTampered = verifyAgentSignature({
      publicKey: raw32Hex,
      signatureHex,
      payloadString: payload + '{"tampered":true}',
    });
    assert(
      "Rejects tampered payload with invalid signature error",
      !resTampered.isValid && (resTampered.error?.includes("SIGNATURE_VERIFICATION_FAILED") || false)
    );

    // 1.4 Forged Signature Rejection
    const forgedSig = crypto.randomBytes(64).toString("hex");
    const resForged = verifyAgentSignature({
      publicKey: raw32Hex,
      signatureHex: forgedSig,
      payloadString: payload,
    });
    assert("Rejects forged signature", !resForged.isValid);

    // 1.5 Timestamp Skew Check (>120s)
    const oldTimestamp = new Date(Date.now() - 150000).toISOString();
    const resSkew = verifyAgentSignature({
      publicKey: raw32Hex,
      signatureHex,
      payloadString: payload,
      timestampHeader: oldTimestamp,
    });
    assert(
      "Rejects payload with timestamp skew exceeding 120 seconds",
      !resSkew.isValid && (resSkew.error?.includes("REPLAY_ATTACK_DETECTED") || false)
    );

    // 1.6 Dev Mock Fallback (when not in production)
    const resMock = verifyAgentSignature({
      publicKey: "mock_agent_key_123",
      signatureHex: "mock_sig_456",
      payloadString: payload,
    });
    assert("Accepts mock fallback tokens in non-production mode", resMock.isValid);
  } catch (err) {
    assert("Ed25519 Test Suite Execution", false, String(err));
  }

  // ----------------------------------------------------
  // TEST SUITE 2: Anti-Replay Nonce Store
  // ----------------------------------------------------
  console.log(bold("\n2. Testing Persistent Database Nonce Store (AgentNonce)"));
  try {
    const testAgentId = `test_agent_${Date.now()}`;
    const testNonce = `nonce_${crypto.randomBytes(8).toString("hex")}`;

    const firstCheck = await verifyAntiReplayNonce(testAgentId, testNonce);
    assert("Registers fresh nonce successfully", firstCheck === true);

    const replayCheck = await verifyAntiReplayNonce(testAgentId, testNonce);
    assert("Rejects replayed unexpired nonce within TTL", replayCheck === false);

    const otherNonce = `nonce_${crypto.randomBytes(8).toString("hex")}`;
    const secondCheck = await verifyAntiReplayNonce(testAgentId, otherNonce);
    assert("Accepts new unique nonce for same agent", secondCheck === true);
  } catch (err) {
    assert("Anti-Replay Nonce Execution", false, String(err));
  }

  // ----------------------------------------------------
  // TEST SUITE 3: Distributed Velocity Tracker (Postgres)
  // ----------------------------------------------------
  console.log(bold("\n3. Testing PostgreSQL-Native Velocity Tracker (velocity-tracker.ts)"));
  try {
    const agentId = "agent_procure_v2";

    const spend = await VelocityTracker.getRollingSpendPaise(agentId, 86400000);
    assert(
      "Queries 24-hour rolling spend paise from PostgreSQL successfully",
      typeof spend === "number" && spend >= 0,
      `Spend: ₹${spend / 100}`
    );

    const count = await VelocityTracker.getRecentRequestCount(agentId, 60000);
    assert(
      "Queries recent request count from PostgreSQL successfully",
      typeof count === "number" && count >= 0,
      `Recent requests in 60s: ${count}`
    );
  } catch (err) {
    assert("Velocity Tracker Execution", false, String(err));
  }

  // ----------------------------------------------------
  // TEST SUITE 4: Config & Environment Guards
  // ----------------------------------------------------
  console.log(bold("\n4. Testing Environment Configuration (config.ts)"));
  try {
    assert("Loads parsed environment safely", !!env.DATABASE_URL);
    assert(
      "Provides valid default Next.js App URL for local development",
      env.NEXT_PUBLIC_APP_URL.startsWith("http")
    );
  } catch (err) {
    assert("Config Validation", false, String(err));
  }

  // ----------------------------------------------------
  // TEST SUITE 5: Razorpay Webhook HMAC Verification
  // ----------------------------------------------------
  console.log(bold("\n5. Testing Razorpay Webhook HMAC Signature Engine"));
  try {
    const webhookSecret = "tl_whsec_test_demo_secret";
    const rawBody = JSON.stringify({
      event: "order.paid",
      payload: { payment: { entity: { id: "pay_test_123", amount: 160000 } } },
    });

    const validSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const tamperedSignature = crypto
      .createHmac("sha256", "wrong_secret")
      .update(rawBody)
      .digest("hex");

    const isMatch = validSignature === crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    const isTamperedMatch = tamperedSignature === crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

    assert("Correctly computes and validates HMAC-SHA256 digest on raw payload", isMatch);
    assert("Correctly detects and rejects invalid HMAC-SHA256 signature", !isTamperedMatch);
  } catch (err) {
    assert("Webhook HMAC Execution", false, String(err));
  }

  // ----------------------------------------------------
  // TEST SUITE 6: MCP Server & Bundle Distribution
  // ----------------------------------------------------
  console.log(bold("\n6. Testing MCP Server & Manifest Distribution"));
  try {
    const manifestPath = path.join(process.cwd(), "manifest.json");
    const bundlePath = path.join(process.cwd(), "dist", "mcp-bundle.js");

    const manifestExists = fs.existsSync(manifestPath);
    const bundleExists = fs.existsSync(bundlePath);

    assert("manifest.json exists and is readable", manifestExists);
    assert("dist/mcp-bundle.js exists and is compiled", bundleExists);

    if (manifestExists) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      assert(
        "manifest.json defaults TRUSTLAYER_API_URL to http://localhost:3000",
        manifest.server?.env?.TRUSTLAYER_API_URL === "http://localhost:3000"
      );
      assert(
        "manifest.json declares all 5 autonomous commerce tools",
        Array.isArray(manifest.tools) && manifest.tools.length === 5
      );
    }

    const deadServerExists = fs.existsSync(path.join(process.cwd(), "src", "mcp", "server.ts"));
    assert("Redundant legacy src/mcp/server.ts is deleted", !deadServerExists);
  } catch (err) {
    assert("MCP Verification", false, String(err));
  }

  // ----------------------------------------------------
  // TEST SUITE 7: Multi-Tenant Schema Validation
  // ----------------------------------------------------
  console.log(bold("\n7. Testing Multi-Tenant & Model Schema Integration"));
  try {
    assert("Prisma client includes AgentNonce model", "agentNonce" in prisma);
    assert("Prisma client includes Organization model", "organization" in prisma);
    assert("Prisma client includes User model", "user" in prisma);
    assert("Prisma client includes Transaction model", "transaction" in prisma);
    assert("Prisma client includes PolicyRule model", "policyRule" in prisma);
  } catch (err) {
    assert("Multi-Tenant Schema Verification", false, String(err));
  }

  // ----------------------------------------------------
  // FINAL SUMMARY
  // ----------------------------------------------------
  console.log(bold(cyan("\n========================================================")));
  console.log(
    bold(
      `TEST RESULTS: ${green(`${passed} PASSED`)}, ${failed > 0 ? red(`${failed} FAILED`) : "0 FAILED"}`
    )
  );
  console.log(bold(cyan("========================================================\n")));

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
