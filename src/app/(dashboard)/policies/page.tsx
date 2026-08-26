"use client";

import React, { useState, useEffect } from "react";
import { SlidersHorizontal, Save, ShieldCheck, Check } from "lucide-react";

export default function PoliciesPage() {
  const [maxOrder, setMaxOrder] = useState(5000);
  const [dailyLimit, setDailyLimit] = useState(20000);
  const [hardCeiling, setHardCeiling] = useState(50000);
  const [merchants, setMerchants] = useState("mid_slack_01, mid_figma_01, mid_aws_01, mid_github_01");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/v1/policies")
      .then((res) => res.json())
      .then((data) => {
        if (data.maxOrderPaise) {
          setMaxOrder(data.maxOrderPaise / 100);
          setDailyLimit(data.dailySpendLimitPaise / 100);
          setHardCeiling(data.hardCeilingPaise / 100);
          setMerchants((data.allowedMerchants || []).join(", "));
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSave = async () => {
    await fetch("/api/v1/policies", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "GlobalEnterpriseSaaSPolicy",
        maxOrderPaise: maxOrder * 100,
        dailySpendLimitPaise: dailyLimit * 100,
        hardCeilingPaise: hardCeiling * 100,
        allowedCurrencies: ["INR"],
        allowedMccs: ["5734", "7372"],
        allowedMerchants: merchants.split(",").map((m) => m.trim()),
        riskScoreThreshold: 0.35,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Spend Guardrails & Policies</h1>
          <p className="text-xs text-muted-foreground">
            Configure financial bounding limits, merchant whitelists, and velocity caps
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
        >
          {saved ? <Check className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4" />}
          <span>{saved ? "Guardrails Deployed!" : "Save & Deploy"}</span>
        </button>
      </div>

      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-6">
        {/* Limits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Auto-Allow Per-Order Cap (₹)
            </label>
            <input
              type="number"
              value={maxOrder}
              onChange={(e) => setMaxOrder(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground">Orders below this execute instantly.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              24-Hour Velocity Cap (₹)
            </label>
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground">Cumulative rolling daily limit.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Hard Safety Ceiling (₹)
            </label>
            <input
              type="number"
              value={hardCeiling}
              onChange={(e) => setHardCeiling(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground">Orders above this are hard-denied.</p>
          </div>
        </div>

        {/* Merchant Whitelist */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground block">
            Approved Razorpay Merchant IDs (Whitelist)
          </label>
          <textarea
            rows={3}
            value={merchants}
            onChange={(e) => setMerchants(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="mid_slack_01, mid_figma_01, mid_aws_01"
          />
          <p className="text-[11px] text-muted-foreground">
            Comma-separated merchant IDs authorized to receive autonomous agent checkouts.
          </p>
        </div>
      </div>
    </div>
  );
}
