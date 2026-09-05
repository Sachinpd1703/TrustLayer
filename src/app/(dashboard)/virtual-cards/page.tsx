"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  Clock,
  ShieldCheck,
  Bot,
  RefreshCw,
  X,
  IndianRupee,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface VirtualCard {
  id: string;
  agentId: string;
  cardToken: string;
  maskedPan: string;
  cardholderName: string;
  currency: string;
  spendLimitPaise: number;
  currentSpentPaise: number;
  status: "ACTIVE" | "CHARGED" | "EXPIRED" | "TERMINATED";
  expiresAt: string;
  createdAt: string;
  agent?: {
    name: string;
    agentId: string;
  };
}

export default function VirtualCardsPage() {
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // Form State
  const [agentId, setAgentId] = useState("agent_procure_v2");
  const [amountInr, setAmountInr] = useState("1600");
  const [cardholderName, setCardholderName] = useState("TrustLayer AI - DevOps Bot");

  async function fetchCards() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/virtual-cards");
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load virtual cards.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCards();
  }, []);

  async function handleMintCard(e: React.FormEvent) {
    e.preventDefault();
    setIsMinting(true);
    try {
      const res = await fetch("/api/v1/virtual-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          spendLimitPaise: Math.round(Number(amountInr) * 100),
          currency: "INR",
          cardholderName,
        }),
      });

      if (!res.ok) throw new Error("Failed to mint card");

      toast.success("Single-use Virtual Card minted successfully with 10-minute TTL!");
      setShowModal(false);
      fetchCards();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mint virtual card.");
    } finally {
      setIsMinting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CreditCard className="h-6 w-6 text-primary" />
            Ephemeral Virtual Cards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Disposable single-use tokenized cards with exact transaction caps and automatic 10-minute self-destruction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCards}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Mint Single-Use Card
          </button>
        </div>
      </div>

      {/* Virtual Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const isExpired = new Date(card.expiresAt) < new Date();
          const activeStatus = isExpired ? "EXPIRED" : card.status;

          return (
            <div
              key={card.id}
              className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card to-muted/50 p-5 shadow-md space-y-4"
            >
              {/* Card Header & Chip */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    RazorpayX Single-Use
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    activeStatus === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 animate-pulse"
                      : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                  }`}
                >
                  {activeStatus}
                </span>
              </div>

              {/* Masked PAN */}
              <div className="pt-2">
                <div className="text-xl font-mono font-bold tracking-widest text-foreground">
                  {card.maskedPan}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono mt-2">
                  <span>EXP: 10-MIN TTL</span>
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-emerald-500" />
                    CVV: ***
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    Cardholder / Bot
                  </div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                    {card.cardholderName}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    Spend Bound
                  </div>
                  <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ₹{(card.spendLimitPaise / 100).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Expiry Bar */}
              <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono pt-1">
                <Clock className="h-3 w-3 text-amber-500" />
                <span>Expires: {new Date(card.expiresAt).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mint Virtual Card Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">Mint Ephemeral Virtual Card</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleMintCard} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Target AI Agent</label>
                <select
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                >
                  <option value="agent_procure_v2">DevOps Procurement Bot (agent_procure_v2)</option>
                  <option value="agent_marketing_v1">Ad-Spend Growth Bot (agent_marketing_v1)</option>
                  <option value="agent_shop_assistant">Travel Concierge Buyer (agent_shop_assistant)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Exact Single-Use Limit (₹ INR)</label>
                <div className="relative mt-1.5">
                  <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={amountInr}
                    onChange={(e) => setAmountInr(e.target.value)}
                    required
                    min="1"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-input bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Cardholder Label</label>
                <input
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  required
                  className="w-full mt-1.5 px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
                🛡️ Card will be minted with a strict <strong>10-Minute TTL</strong> and exact authorization cap. Exfiltration risk is zero.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMinting}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-50"
                >
                  {isMinting ? "Minting..." : "Mint Virtual Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
