"use client";

import React, { useState, useEffect } from "react";
import { Bot, Power, Plus, Key, CheckCircle2, ShieldCheck, Copy, Check, Terminal, Building2 } from "lucide-react";

interface AgentRecord {
  id: string;
  agentId: string;
  name: string;
  description?: string;
  publicKey: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  role: string;
  ownerEmail: string;
  maxPerOrderCap: number;
  dailySpendCap: number;
  monthlyBudgetCap: number;
  totalSpentPaise: number;
  department?: {
    name: string;
    code: string;
  };
  tokens?: Array<{
    id: string;
    tokenPrefix: string;
    name: string;
  }>;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState("BUYER_AGENT");
  const [ownerEmail, setOwnerEmail] = useState("admin@enterprise.internal");
  const [maxPerOrderCap, setMaxPerOrderCap] = useState(5000);
  const [dailySpendCap, setDailySpendCap] = useState(20000);
  const [monthlyBudgetCap, setMonthlyBudgetCap] = useState(100000);

  // Result after creation
  const [createdResult, setCreatedResult] = useState<{
    agent: AgentRecord;
    credentials?: {
      publicKey?: string;
      apiBearerToken?: string;
    };
  } | null>(null);

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

  const handleNameChange = (val: string) => {
    setName(val);
    const slug = "agent_" + val.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20);
    setAgentId(slug);
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          agentId,
          description,
          role,
          ownerEmail,
          maxPerOrderCap: maxPerOrderCap * 100,
          dailySpendCap: dailySpendCap * 100,
          monthlyBudgetCap: monthlyBudgetCap * 100,
          generateToken: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedResult({
          agent: data,
          credentials: data.credentials,
        });
        fetchAgents();
      } else {
        alert(data.error || "Failed to create agent");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleKillSwitch = async (pAgentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "REVOKED" : "ACTIVE";
    await fetch(`/api/v1/agents/${pAgentId}/kill-switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchAgents();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header with Add Agent Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Agent Registry & IAM Controls</h1>
          <p className="text-xs text-muted-foreground">
            Provision autonomous AI agents, manage Ed25519 identities, and toggle emergency kill-switches
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedResult(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Provision New AI Agent</span>
        </button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => {
          const isActive = agent.status === "ACTIVE";
          const spentPaise = agent.totalSpentPaise || 0;
          const monthlyBudgetPaise = agent.monthlyBudgetCap || 10000000;
          const budgetPercent = Math.min(Math.round((spentPaise / monthlyBudgetPaise) * 100), 100);

          return (
            <div
              key={agent.id}
              className={`p-5 rounded-xl border bg-card shadow-sm space-y-4 transition-all ${
                isActive ? "border-border" : "border-destructive/40 bg-destructive/5"
              }`}
            >
              {/* Card Header */}
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
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm">{agent.name}</h3>
                      {agent.department && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                          {agent.department.name.split(" ")[0]}
                        </span>
                      )}
                    </div>
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

              <p className="text-xs text-muted-foreground">{agent.description || "Autonomous purchasing agent."}</p>

              {/* Budget Progress Meter */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">Monthly Budget Utilization</span>
                  <span className="font-mono font-bold">
                    ₹{(spentPaise / 100).toLocaleString("en-IN")} / ₹{(monthlyBudgetPaise / 100).toLocaleString("en-IN")} ({budgetPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      budgetPercent > 80 ? "bg-destructive" : budgetPercent > 50 ? "bg-amber-500" : "bg-primary"
                    }`}
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
              </div>

              {/* Security Telemetry Box */}
              <div className="p-2.5 rounded-lg border border-border bg-secondary/30 text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Per-Order Auto Cap:</span>
                  <span className="font-bold text-foreground">
                    ₹{(agent.maxPerOrderCap / 100).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Ed25519 Public Key:</span>
                  <span className="truncate max-w-[150px] text-foreground">{agent.publicKey}</span>
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

      {/* Provision New Agent Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            {!createdResult ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <h2 className="font-bold text-sm">Provision Autonomous AI Agent</h2>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateAgent} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground block">Agent Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SRE Cloud Purchasing Bot"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-foreground block">Agent ID (Slug)</label>
                      <input
                        type="text"
                        required
                        value={agentId}
                        onChange={(e) => setAgentId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-foreground block">Owner Email</label>
                      <input
                        type="email"
                        required
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-foreground block">Description & Purpose</label>
                    <textarea
                      rows={2}
                      placeholder="Autonomous procurement of cloud computing, developer seats, and infrastructure..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="font-bold text-foreground block">Per-Order Cap (₹)</label>
                      <input
                        type="number"
                        value={maxPerOrderCap}
                        onChange={(e) => setMaxPerOrderCap(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-foreground block">Daily Limit (₹)</label>
                      <input
                        type="number"
                        value={dailySpendCap}
                        onChange={(e) => setDailySpendCap(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-foreground block">Monthly Budget (₹)</label>
                      <input
                        type="number"
                        value={monthlyBudgetCap}
                        onChange={(e) => setMonthlyBudgetCap(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background font-mono text-center"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-accent"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
                    >
                      🚀 Provision Agent & Generate Keys
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="font-bold">Agent Provisioned Successfully!</h4>
                    <p className="text-[11px] opacity-90">Copy the credentials below. Secret token will not be shown again.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground block">API Bearer Secret Token</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={createdResult.credentials?.apiBearerToken || "tl_live_sec_..."}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-secondary/40 font-mono text-xs select-all"
                      />
                      <button
                        onClick={() => copyToClipboard(createdResult.credentials?.apiBearerToken || "")}
                        className="p-2 rounded-lg border border-border bg-card hover:bg-accent shrink-0"
                      >
                        {copiedToken ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-foreground block">Quickstart Agent SDK (Python / TS)</label>
                    <pre className="p-3 rounded-lg bg-black text-emerald-400 font-mono text-[11px] overflow-x-auto">
{`from trustlayer import TrustLayerClient

client = TrustLayerClient(
    agent_id="${createdResult.agent.agentId}",
    api_key="${createdResult.credentials?.apiBearerToken?.slice(0, 16)}..."
)
order = client.propose_payment(
    amount_inr=1600,
    merchant_id="mid_figma_01"
)`}
                    </pre>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-bold"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
