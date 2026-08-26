"use client";

import React from "react";
import { MetricsBento } from "@/components/dashboard/metrics-bento";
import { LiveStreamFeed } from "@/components/dashboard/live-stream-feed";
import { ApprovalsWidget } from "@/components/approvals/approval-modal";
import { ScenarioRunner } from "@/components/simulator/scenario-runner";
import { useLiveStream } from "@/hooks/use-live-stream";
import { useApprovals } from "@/hooks/use-approvals";

export default function DashboardPage() {
  const { events } = useLiveStream();
  const { approvals, resolveApproval } = useApprovals();

  return (
    <div className="space-y-6">
      {/* 1. Top Metrics Bento Grid */}
      <MetricsBento events={events} pendingCount={approvals.length} />

      {/* 2. Main Content Grid (65% Live Feed, 35% Sidebar Widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Live Stream */}
        <div className="lg:col-span-8">
          <LiveStreamFeed events={events} />
        </div>

        {/* Right 4 Cols: Approvals & Simulator */}
        <div className="lg:col-span-4 space-y-6">
          <ApprovalsWidget
            approvals={approvals}
            onResolve={resolveApproval}
          />
          <ScenarioRunner />
        </div>
      </div>
    </div>
  );
}
