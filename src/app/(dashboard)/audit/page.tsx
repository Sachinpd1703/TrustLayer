"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Hash, Lock } from "lucide-react";

interface AuditLogRow {
  id: string;
  logIndex: number;
  agentId: string;
  timestamp: string;
  amountPaise: number;
  decision: string;
  intent: string;
  previousLogHash: string;
  currentLogHash: string;
}

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [verification, setVerification] = useState<{
    isValid: boolean;
    totalVerified: number;
    ledgerStatus: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/v1/audit");
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const verifyLedger = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/v1/audit/verify");
      const data = await res.json();
      setVerification(data);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    verifyLedger();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Cryptographic Audit Vault</h1>
          <p className="text-xs text-muted-foreground">
            Tamper-evident, hash-chained transaction ledger ($H_n = \text&#123;SHA256&#125;(H_&#123;n-1&#125; + \text&#123;Payload&#125;)$)
          </p>
        </div>

        <button
          onClick={verifyLedger}
          disabled={verifying}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-semibold transition-all shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${verifying ? "animate-spin" : ""}`} />
          <span>Verify Hash Chain Integrity</span>
        </button>
      </div>

      {/* Verification Status Banner */}
      {verification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            verification.isValid
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">
                {verification.isValid ? "Ledger Cryptographically Verified & Immutable" : "Integrity Failure: Tampering Detected"}
              </h4>
              <p className="text-xs opacity-90">
                Verified {verification.totalVerified} sequential blocks. Zero retroactive modifications detected.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase font-bold px-2 py-1 rounded bg-black/10">
            SHA-256 Chained
          </span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between">
          <h3 className="font-bold text-sm">Immutable Audit Trail</h3>
          <span className="text-xs text-muted-foreground font-mono">{logs.length} Blocks Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/30 text-muted-foreground font-mono">
              <tr>
                <th className="p-3">Index</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Agent</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Decision</th>
                <th className="p-3">Previous Hash</th>
                <th className="p-3">Block Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                  <td className="p-3 font-bold text-primary">#{log.logIndex}</td>
                  <td className="p-3 text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="p-3 font-semibold text-foreground">{log.agentId}</td>
                  <td className="p-3 font-bold">₹{(log.amountPaise / 100).toLocaleString("en-IN")}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.decision === "ALLOW"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : log.decision === "REQUIRE_APPROVAL"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {log.decision}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground truncate max-w-[120px]">{log.previousLogHash}</td>
                  <td className="p-3 text-foreground font-bold truncate max-w-[120px]">{log.currentLogHash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuditPage;
