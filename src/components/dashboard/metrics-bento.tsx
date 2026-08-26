"use client";

import React from "react";
import { TrendingUp, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { LiveStreamEvent } from "@/lib/types";

interface MetricsBentoProps {
  events: LiveStreamEvent[];
  pendingCount: number;
}

export function MetricsBento({ events, pendingCount }: MetricsBentoProps) {
  // Aggregate stats from events
  const totalVolumePaise = events.reduce((sum, e) => (e.decision === "ALLOW" ? sum + e.amountPaise : sum), 160000);
  const allowedCount = events.filter((e) => e.decision === "ALLOW").length + 1;
  const blockedCount = events.filter((e) => e.decision === "DENY").length;
  const totalTxns = events.length + 1;
  const passRate = Math.round((allowedCount / totalTxns) * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Gated Volume */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Gated Volume</span>
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold tracking-tight">₹{(totalVolumePaise / 100).toLocaleString("en-IN")}</h3>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
            <span>● 100% Policy-Gated</span>
          </p>
        </div>
      </div>

      {/* Card 2: Auto-Approved Rate */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Auto-Allow Ratio</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold tracking-tight">{passRate}%</h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            {allowedCount} of {totalTxns} within spend caps
          </p>
        </div>
      </div>

      {/* Card 3: Anomalies Blocked */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Threats Blocked</span>
          <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-destructive">{blockedCount}</h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            Hallucinations & rogue transfers
          </p>
        </div>
      </div>

      {/* Card 4: Pending Approvals */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {pendingCount}
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            Requires human step-up signature
          </p>
        </div>
      </div>
    </div>
  );
}
