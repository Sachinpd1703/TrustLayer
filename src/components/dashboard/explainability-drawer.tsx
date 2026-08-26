"use client";

import React from "react";
import { X, ShieldCheck, Cpu, Key, FileCode } from "lucide-react";
import { LiveStreamEvent } from "@/lib/types";

interface ExplainabilityDrawerProps {
  event: LiveStreamEvent | null;
  onClose: () => void;
}

export function ExplainabilityDrawer({ event, onClose }: ExplainabilityDrawerProps) {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card border-l border-border h-full p-6 shadow-2xl overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg">Explainability Trace</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Transaction Summary Badge */}
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">Agent: {event.agentId}</span>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                event.decision === "ALLOW"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : event.decision === "REQUIRE_APPROVAL"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {event.decision}
            </span>
          </div>
          <div className="text-xl font-bold">
            ₹{(event.amountPaise / 100).toLocaleString("en-IN")}{" "}
            <span className="text-xs text-muted-foreground font-normal">({event.currency})</span>
          </div>
          <p className="text-xs text-muted-foreground">Target Merchant: <span className="font-mono text-foreground">{event.merchantId}</span></p>
        </div>

        {/* Agent Intent & Reasoning */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            Agent Declared Goal & Intent
          </h4>
          <div className="p-3 rounded-lg border border-border bg-card font-mono text-xs leading-relaxed text-foreground">
            &ldquo;{event.intent}&rdquo;
          </div>
        </div>

        {/* Policy Decision Reason */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-primary" />
            Policy Evaluation Rationale
          </h4>
          <div className="p-3 rounded-lg border border-border bg-card text-xs leading-relaxed text-foreground">
            {event.reason}
          </div>
        </div>

        {/* Downstream Execution Payload */}
        {event.razorpayOrderId && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileCode className="h-3.5 w-3.5 text-emerald-500" />
              Razorpay Execution Order ID
            </h4>
            <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 font-mono text-xs text-emerald-700 dark:text-emerald-400">
              {event.razorpayOrderId}
            </div>
          </div>
        )}

        {/* Anomaly Risk Meter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">Anomaly & Prompt Injection Risk</span>
            <span className="font-mono">{Math.round(event.riskScore * 100)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full ${
                event.riskScore > 0.5 ? "bg-destructive" : event.riskScore > 0.2 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.max(5, event.riskScore * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
