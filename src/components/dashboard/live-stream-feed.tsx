"use client";

import React, { useState } from "react";
import { ChevronRight, ShieldCheck, Clock, Ban, Cpu, Inbox } from "lucide-react";
import { LiveStreamEvent } from "@/lib/types";
import { ExplainabilityDrawer } from "./explainability-drawer";

interface LiveStreamFeedProps {
  events: LiveStreamEvent[];
}

export function LiveStreamFeed({ events }: LiveStreamFeedProps) {
  const [selectedEvent, setSelectedEvent] = useState<LiveStreamEvent | null>(null);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/20">
        <div>
          <h3 className="font-bold text-sm">Live Transaction Stream</h3>
          <p className="text-xs text-muted-foreground">
            Real-time feed of autonomous agent proposals & policy decisions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">Live Connected</span>
        </div>
      </div>

      {/* List */}
      {events.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
          <Inbox className="h-8 w-8 opacity-40" />
          <p>No transactions yet. Use the Agent Simulator to trigger an event.</p>
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
          {events.map((e, idx) => {
            const isAllow = e.decision === "ALLOW";
            const isPending = e.decision === "REQUIRE_APPROVAL";

            return (
              <div
                key={`${e.id}-${idx}`}
                onClick={() => setSelectedEvent(e)}
                className="p-4 hover:bg-accent/40 cursor-pointer transition-colors flex items-center justify-between gap-4"
              >
                {/* Left: Icon & Agent Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      isAllow
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : isPending
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {isAllow ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : isPending ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Ban className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">
                        ₹{(e.amountPaise / 100).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground truncate">
                        → {e.merchantId}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-sm">
                      {e.intent}
                    </p>
                  </div>
                </div>

                {/* Right: Badge, Time & Drawer Trigger */}
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      isAllow
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : isPending
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-destructive/10 text-destructive border border-destructive/20"
                    }`}
                  >
                    {e.decision}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Explainability Drawer */}
      <ExplainabilityDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
