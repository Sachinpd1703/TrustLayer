"use client";

import { useEffect, useState, useCallback } from "react";
import { LiveStreamEvent } from "@/lib/types";

export interface DashboardMetrics {
  totalVolumePaise: number;
  allowedCount: number;
  blockedCount: number;
  totalTxns: number;
  passRate: number;
  pendingCount: number;
}

export function useLiveStream() {
  const [events, setEvents] = useState<LiveStreamEvent[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalVolumePaise: 0,
    allowedCount: 0,
    blockedCount: 0,
    totalTxns: 0,
    passRate: 100,
    pendingCount: 0,
  });
  const [isConnected, setIsConnected] = useState(false);

  // 1. Fetch Real Database State on Mount
  const fetchInitialData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/dashboard/stats");
      const data = await res.json();
      if (data.metrics && data.feed) {
        setMetrics(data.metrics);
        setEvents(data.feed);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 2. Connect to Real-Time SSE Stream
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource("/api/v1/events/stream");

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "CONNECTED") return;

          // Prepend new event
          setEvents((prev) => {
            // Avoid duplicate by ID
            if (prev.some((p) => p.id === data.id)) return prev;
            return [data, ...prev.slice(0, 49)];
          });

          // Refresh full stats
          fetchInitialData();
        } catch (err) {
          console.error("Failed to parse SSE event:", err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.error("SSE connection error:", err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [fetchInitialData]);

  return { events, metrics, isConnected, setEvents, refetch: fetchInitialData };
}
