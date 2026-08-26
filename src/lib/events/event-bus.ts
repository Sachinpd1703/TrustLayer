import { LiveStreamEvent } from "@/lib/types";

type Listener = (event: LiveStreamEvent) => void;

const listeners: Set<Listener> = new Set();

export class EventBus {
  static subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  static broadcast(event: LiveStreamEvent): void {
    listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error("Error broadcasting SSE event:", err);
      }
    });
  }
}
