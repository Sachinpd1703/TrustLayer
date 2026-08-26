"use client";

import React, { useState, useEffect } from "react";
import { Bot, Power, ShieldAlert, Key, CheckCircle2 } from "lucide-react";

interface AgentRecord {
  id: string;
  agentId: string;
  name: string;
  description: string;
  publicKey: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  role: string;
  totalSpentPaise: number;
}

export function AgentsPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/v1/agents");
      const data = await res.json();
      if (Array.isArray(data)) setAgents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const toggleKillSwitch = async (agentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "REVOKED" : "ACTIVE";
    await fetch(`/api/v1/agents/${agentId}/kill-switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchAgents();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Agent Registry & IAM Controls</h1>
          <p className="text-xs text-muted-foreground">
            Manage cryptographic identities, permissions, and emergency kill-switches
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => {
          const isActive = agent.status === "ACTIVE";

          return (
            <div
              key={agent.id}
              className={`p-5 rounded-xl border bg-card shadow-sm space-y-4 transition-all ${
                isActive ? "border-border" : "border-destructive/40 bg-destructive/5"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-lg ${
                      isActive ? "bg-primary/10 text-primary" : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{agent.name}</h3>
                    <span className="font-mono text-[11px] text-muted-foreground">{agent.agentId}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-destructive/20 text-destructive border border-destructive/30"
                  }`}
                >
                  {agent.status}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">{agent.description}</p>

              <div className="p-2.5 rounded-lg border border-border bg-secondary/30 text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Ed25519 Key:</span>
                  <span className="truncate max-w-[160px] text-foreground">{agent.publicKey}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Total Gated Spend:</span>
                  <span className="font-bold text-foreground">
                    ₹{((agent.totalSpentPaise || 0) / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Emergency Kill Switch Button */}
              <button
                onClick={() => toggleKillSwitch(agent.agentId, agent.status)}
                className={`w-full py-2 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  isActive
                    ? "bg-destructive hover:bg-destructive/90 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                <span>{isActive ? "Emergency Kill-Switch (Revoke)" : "Restore Active Status"}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AgentsPage;
