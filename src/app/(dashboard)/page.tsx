"use client";

import React from "react";
import { MetricsBento } from "@/components/dashboard/metrics-bento";
import { LiveStreamFeed } from "@/components/dashboard/live-stream-feed";
import { ApprovalsWidget } from "@/components/approvals/approval-modal";
import { ScenarioRunner } from "@/components/simulator/scenario-runner";
import { useLiveStream } from "@/hooks/use-live-stream";
import { useApprovals } from "@/hooks/use-approvals";

export default function DashboardPage() {
  const { events, metrics, refetch } = useLiveStream();
  const { approvals, resolveApproval } = useApprovals();

  const handleResolveAndRefresh = async (id: string, decision: "APPROVE" | "REJECT", notes?: string) => {
    const res = await resolveApproval(id, decision, notes);
    refetch(); // Refresh dashboard feed & metrics
    return res;
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Metrics Bento Grid (Real Database Telemetry) */}
      <MetricsBento metrics={metrics} />

      {/* 2. Main Content Grid (8 Cols Live Feed, 4 Cols Sidebar Widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Live Stream */}
        <div className="lg:col-span-8">
          <LiveStreamFeed events={events} />
        </div>

        {/* Right 4 Cols: Approvals & Simulator */}
        <div className="lg:col-span-4 space-y-6">
          <ApprovalsWidget
            approvals={approvals}
            onResolve={handleResolveAndRefresh}
          />
          <ScenarioRunner />
        </div>
      </div>
    </div>
  );
}
