"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Shield, Check } from "lucide-react";
import { PendingApprovalItem } from "@/hooks/use-approvals";

interface ApprovalsWidgetProps {
  approvals: PendingApprovalItem[];
  onResolve: (id: string, decision: "APPROVE" | "REJECT", notes?: string) => Promise<unknown>;
}

export function ApprovalsWidget({ approvals, onResolve }: ApprovalsWidgetProps) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleAction = async (id: string, decision: "APPROVE" | "REJECT") => {
    setResolvingId(id);
    try {
      await onResolve(id, decision);
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  };

  if (approvals.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="font-bold text-sm">Pending Approvals Queue</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            All Clear
          </span>
        </div>
        <div className="py-6 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
          <p>No high-value orders currently awaiting human review.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-amber-500/30 bg-card shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="font-bold text-sm">Pending Approvals</h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
          {approvals.length} Pending
        </span>
      </div>

      <div className="space-y-3 max-h-[360px] overflow-y-auto">
        {approvals.map((appr) => (
          <div
            key={appr.id}
            className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold">{appr.agentId}</span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {new Date(appr.createdAt).toLocaleTimeString()}
              </span>
            </div>

            <div>
              <div className="text-base font-bold text-foreground">
                ₹{(appr.amountPaise / 100).toLocaleString("en-IN")}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  → {appr.merchantId}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                {appr.triggerReason}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleAction(appr.id, "APPROVE")}
                disabled={resolvingId === appr.id}
                className="flex-1 py-1.5 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => handleAction(appr.id, "REJECT")}
                disabled={resolvingId === appr.id}
                className="py-1.5 px-3 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-medium transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
