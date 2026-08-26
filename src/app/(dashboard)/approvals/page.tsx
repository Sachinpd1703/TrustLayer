"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useApprovals } from "@/hooks/use-approvals";

export default function ApprovalsPage() {
  const { approvals, isLoading, resolveApproval } = useApprovals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Human-in-the-Loop Review Center</h1>
          <p className="text-xs text-muted-foreground">
            Dual-custody step-up approval queue for high-value agentic commerce orders
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{approvals.length} Awaiting Signature</span>
        </div>
      </div>

      {approvals.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-border bg-card shadow-sm space-y-3">
          <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold">Queue is Clean</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            All autonomous transactions are currently operating within pre-approved spend bounds.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvals.map((appr) => (
            <div
              key={appr.id}
              className="p-5 rounded-xl border border-amber-500/30 bg-card shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
                <span className="font-mono font-bold">{appr.agentId}</span>
                <span className="text-muted-foreground">
                  {new Date(appr.createdAt).toLocaleString()}
                </span>
              </div>

              <div>
                <div className="text-2xl font-bold">
                  ₹{(appr.amountPaise / 100).toLocaleString("en-IN")}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    → {appr.merchantId}
                  </span>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  Trigger: {appr.triggerReason}
                </p>
              </div>

              {appr.transaction && (
                <div className="p-3 rounded-lg border border-border bg-secondary/30 text-xs space-y-1 font-mono">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                    Agent Goal & Reasoning:
                  </span>
                  <p className="text-foreground">{appr.transaction.intent}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => resolveApproval(appr.id, "APPROVE")}
                  className="flex-1 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Approve & Create Razorpay Order
                </button>
                <button
                  onClick={() => resolveApproval(appr.id, "REJECT")}
                  className="py-2 px-4 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-medium transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
