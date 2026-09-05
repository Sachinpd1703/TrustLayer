import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

export interface AgentAuthVerificationResult {
  isValid: boolean;
  error?: string;
}

// SPKI ASN.1 DER Header for Ed25519 (id-Ed25519 1.3.101.112)
const ED25519_SPKI_HEADER = Buffer.from("302a300506032b6570032100", "hex");

/**
 * Validates and records an anti-replay nonce using persistent database storage.
 * Nonces have a 120-second validity window.
 */
export async function verifyAntiReplayNonce(
  agentId: string,
  nonce?: string
): Promise<boolean> {
  if (!nonce) {
    // Nonce optional in non-production for lightweight testing
    return process.env.NODE_ENV !== "production";
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 120000); // 120 seconds TTL

  try {
    // 1. Check for existing active nonce
    const existing = await prisma.agentNonce.findUnique({
      where: {
        agentId_nonce: {
          agentId,
          nonce,
        },
      },
    });

    if (existing) {
      if (existing.expiresAt > now) {
        // Replay attack detected: active unexpired nonce already used
        return false;
      }
      // Expired nonce - renew timestamp
      await prisma.agentNonce.update({
        where: { id: existing.id },
        data: { expiresAt },
      });
      return true;
    }

    // 2. Register fresh nonce
    await prisma.agentNonce.create({
      data: {
        agentId,
        nonce,
        expiresAt,
      },
    });

    // 3. Asynchronously prune expired nonces (fire-and-forget)
    prisma.agentNonce
      .deleteMany({
        where: { expiresAt: { lt: now } },
      })
      .catch(() => {});

    return true;
  } catch {
    // Unique constraint race condition caught
    return false;
  }
}

/**
 * Performs cryptographic Ed25519 signature verification against the agent's public key.
 * Supports SPKI PEM, DER, Base64, and raw 32-byte Hex keys.
 */
export function verifyAgentSignature(params: {
  publicKey: string;
  signatureHex: string;
  payloadString: string;
  timestampHeader?: string;
}): AgentAuthVerificationResult {
  // 1. Anti-Replay Timestamp Check (within +/- 120 seconds)
  if (params.timestampHeader) {
    const reqTime = new Date(params.timestampHeader).getTime();
    const now = Date.now();
    if (isNaN(reqTime) || Math.abs(now - reqTime) > 120000) {
      return {
        isValid: false,
        error: "REPLAY_ATTACK_DETECTED: Timestamp skew exceeds 120 seconds.",
      };
    }
  }

  // 2. Explicit Development/Simulator Mock Fallback
  const trimmedKey = (params.publicKey || "").trim();
  const trimmedSig = (params.signatureHex || "").trim();

  if (!trimmedKey || !trimmedSig) {
    return {
      isValid: false,
      error: "INVALID_SIGNATURE: Public key or signature is missing.",
    };
  }

  if (
    process.env.NODE_ENV !== "production" &&
    (trimmedKey.startsWith("mock_") ||
      trimmedKey.startsWith("test_") ||
      trimmedSig.startsWith("mock_") ||
      trimmedSig.startsWith("test_"))
  ) {
    return { isValid: true };
  }

  // 3. Cryptographic Ed25519 Signature Verification via node:crypto
  try {
    let pubKey: crypto.KeyObject;

    if (trimmedKey.startsWith("-----BEGIN")) {
      // Standard SPKI PEM string
      pubKey = crypto.createPublicKey(trimmedKey);
    } else {
      // Decode Hex or Base64
      let keyBuffer: Buffer;
      if (/^[0-9a-fA-F]+$/.test(trimmedKey)) {
        keyBuffer = Buffer.from(trimmedKey, "hex");
      } else {
        keyBuffer = Buffer.from(trimmedKey, "base64");
      }

      if (keyBuffer.length === 32) {
        // Raw 32-byte Ed25519 public key -> wrap with standard SPKI DER prefix
        const spkiDer = Buffer.concat([ED25519_SPKI_HEADER, keyBuffer]);
        pubKey = crypto.createPublicKey({
          key: spkiDer,
          format: "der",
          type: "spki",
        });
      } else {
        // Full DER encoded key (44 bytes for Ed25519 SPKI)
        pubKey = crypto.createPublicKey({
          key: keyBuffer,
          format: "der",
          type: "spki",
        });
      }
    }

    // Decode Signature
    let sigBuffer: Buffer;
    if (/^[0-9a-fA-F]+$/.test(trimmedSig)) {
      sigBuffer = Buffer.from(trimmedSig, "hex");
    } else {
      sigBuffer = Buffer.from(trimmedSig, "base64");
    }

    const isVerified = crypto.verify(
      null,
      Buffer.from(params.payloadString, "utf-8"),
      pubKey,
      sigBuffer
    );

    if (!isVerified) {
      return {
        isValid: false,
        error: "SIGNATURE_VERIFICATION_FAILED: Cryptographic Ed25519 signature mismatch.",
      };
    }

    return { isValid: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      error: `SIGNATURE_VERIFICATION_ERROR: ${msg}`,
    };
  }
}

