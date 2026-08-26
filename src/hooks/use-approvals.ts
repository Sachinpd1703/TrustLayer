"use client";

import { useEffect, useState, useCallback } from "react";

export interface PendingApprovalItem {
  id: string;
  transactionId: string;
  agentId: string;
  amountPaise: number;
  currency: string;
  merchantId: string;
  triggerReason: string;
  status: string;
  createdAt: string;
  transaction?: {
    intent: string;
    reasoningText?: string;
    reasoningHash: string;
    riskScore: number;
  };
  agent?: {
    name: string;
    role: string;
  };
}

export function useApprovals() {
  const [approvals, setApprovals] = useState<PendingApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/approvals");
      const data = await res.json();
      if (data.approvals) {
        setApprovals(data.approvals);
      }
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 4000); // Polling backup
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  const resolveApproval = async (id: string, decision: "APPROVE" | "REJECT", notes?: string) => {
    const res = await fetch(`/api/v1/approvals/${id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        approverEmail: "admin@trustlayer.internal",
        decisionNotes: notes,
      }),
    });

    const result = await res.json();
    fetchApprovals();
    return result;
  };

  return { approvals, isLoading, refetch: fetchApprovals, resolveApproval };
}
