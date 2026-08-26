// In-Memory Sliding-Window Velocity Tracker (High-Performance Ring Buffer)

interface VelocityEntry {
  amountPaise: number;
  timestamp: number;
}

const agentVelocityMap = new Map<string, VelocityEntry[]>();

export class VelocityTracker {
  /**
   * Get total spend in paise for an agent within the last N milliseconds (e.g. 24 hours).
   */
  static getRollingSpendPaise(agentId: string, windowMs = 86400000): number {
    const now = Date.now();
    const cutoff = now - windowMs;
    const entries = agentVelocityMap.get(agentId) || [];

    // Filter active window
    const validEntries = entries.filter((e) => e.timestamp >= cutoff);
    agentVelocityMap.set(agentId, validEntries);

    return validEntries.reduce((sum, e) => sum + e.amountPaise, 0);
  }

  /**
   * Record a new successfully authorized/executed payment.
   */
  static recordSpend(agentId: string, amountPaise: number): void {
    const now = Date.now();
    const entries = agentVelocityMap.get(agentId) || [];
    entries.push({ amountPaise, timestamp: now });
    agentVelocityMap.set(agentId, entries);
  }

  /**
   * Get transaction request frequency (e.g. requests in the last 60 seconds).
   */
  static getRecentRequestCount(agentId: string, windowMs = 60000): number {
    const now = Date.now();
    const cutoff = now - windowMs;
    const entries = agentVelocityMap.get(agentId) || [];
    return entries.filter((e) => e.timestamp >= cutoff).length;
  }
}
