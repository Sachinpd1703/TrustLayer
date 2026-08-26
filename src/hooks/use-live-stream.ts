"use client";

import { useEffect, useState } from "react";
import { LiveStreamEvent } from "@/lib/types";

export function useLiveStream() {
  const [events, setEvents] = useState<LiveStreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

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

          setEvents((prev) => [data, ...prev.slice(0, 49)]);
        } catch (err) {
          console.error("Failed to parse SSE payload:", err);
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
  }, []);

  return { events, isConnected, setEvents };
}
