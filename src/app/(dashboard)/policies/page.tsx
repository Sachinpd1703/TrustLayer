"use client";

import React, { useState, useEffect } from "react";
import { SlidersHorizontal, Save, ShieldCheck, Check, Clock, Layers, ShieldAlert, Ban } from "lucide-react";

export default function PoliciesPage() {
  // Multi-tier Thresholds
  const [tier1AutoAllow, setTier1AutoAllow] = useState(5000);
  const [tier2SingleManager, setTier2SingleManager] = useState(25000);
  const [tier3DualCustody, setTier3DualCustody] = useState(100000);
  const [hardCeiling, setHardCeiling] = useState(100000);
  const [dailyLimit, setDailyLimit] = useState(20000);

  // Merchants & MCCs
  const [merchants, setMerchants] = useState("mid_slack_01, mid_figma_01, mid_aws_01, mid_github_01, mid_cloudflare_01");
  const [allowedMccs, setAllowedMccs] = useState("5734, 7372, 4816, 7011, 4511");
  const [blockedMccs, setBlockedMccs] = useState("6051, 7995, 4829");

  // Temporal Guardrails
  const [enforceWorkingHours, setEnforceWorkingHours] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState(0.35);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/v1/policies")
      .then((res) => res.json())
      .then((data) => {
        if (data.tier1MaxOrderPaise) {
          setTier1AutoAllow(data.tier1MaxOrderPaise / 100);
          setTier2SingleManager(data.tier2ThresholdPaise / 100);
          setTier3DualCustody(data.tier3ThresholdPaise / 100);
          setHardCeiling(data.hardCeilingPaise / 100);
          setDailyLimit(data.dailySpendLimitPaise / 100);
          setMerchants((data.allowedMerchants || []).join(", "));
          setAllowedMccs((data.allowedMccs || []).join(", "));
          setBlockedMccs((data.blockedMccs || []).join(", "));
          setEnforceWorkingHours(Boolean(data.enforceWorkingHours));
          setRiskThreshold(data.riskScoreThreshold || 0.35);
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
        tier1MaxOrderPaise: tier1AutoAllow * 100,
        tier2ThresholdPaise: tier2SingleManager * 100,
        tier3ThresholdPaise: tier3DualCustody * 100,
        hardCeilingPaise: hardCeiling * 100,
        dailySpendLimitPaise: dailyLimit * 100,
        allowedCurrencies: ["INR"],
        allowedMccs: allowedMccs.split(",").map((m) => m.trim()).filter(Boolean),
        blockedMccs: blockedMccs.split(",").map((m) => m.trim()).filter(Boolean),
        allowedMerchants: merchants.split(",").map((m) => m.trim()).filter(Boolean),
        enforceWorkingHours,
        workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
        startHourUtc: 3,
        endHourUtc: 14,
        riskScoreThreshold: riskThreshold,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Spend Guardrails & Multi-Tier Policies</h1>
          <p className="text-xs text-muted-foreground">
            Configure multi-level approval matrices, MCC category allowlists, and temporal operating rules
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm shrink-0"
        >
          {saved ? <Check className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4" />}
          <span>{saved ? "Guardrails Deployed!" : "Save & Deploy Policies"}</span>
        </button>
      </div>

      {/* 1. Multi-Tier Approval Escalation Matrix */}
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">1. Multi-Tier Approval Escalation Matrix</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tier 1 */}
          <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-2">
            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
              Tier 1: 100% Autonomous
            </span>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground block">Max Auto-Cap (₹)</label>
              <input
                type="number"
                value={tier1AutoAllow}
                onChange={(e) => setTier1AutoAllow(Number(e.target.value))}
                className="w-full px-2.5 py-1 text-xs rounded border border-input bg-background font-mono font-bold"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">₹0 to ₹{tier1AutoAllow.toLocaleString()} instant Razorpay execution.</p>
          </div>

          {/* Tier 2 */}
          <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
            <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block">
              Tier 2: Single Manager
            </span>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground block">Threshold (₹)</label>
              <input
                type="number"
                value={tier2SingleManager}
                onChange={(e) => setTier2SingleManager(Number(e.target.value))}
                className="w-full px-2.5 py-1 text-xs rounded border border-input bg-background font-mono font-bold"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">₹{tier1AutoAllow.toLocaleString()} to ₹{tier2SingleManager.toLocaleString()} single 1-click review.</p>
          </div>

          {/* Tier 3 */}
          <div className="p-3.5 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2">
            <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block">
              Tier 3: Dual-Custody
            </span>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground block">Dual Cap (₹)</label>
              <input
                type="number"
                value={tier3DualCustody}
                onChange={(e) => setTier3DualCustody(Number(e.target.value))}
                className="w-full px-2.5 py-1 text-xs rounded border border-input bg-background font-mono font-bold"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Requires Dept Lead + Finance signature.</p>
          </div>

          {/* Tier 4 */}
          <div className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/5 space-y-2">
            <span className="text-[10px] font-bold uppercase text-destructive block">
              Tier 4: Hard Deny
            </span>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground block">Hard Ceiling (₹)</label>
              <input
                type="number"
                value={hardCeiling}
                onChange={(e) => setHardCeiling(Number(e.target.value))}
                className="w-full px-2.5 py-1 text-xs rounded border border-input bg-background font-mono font-bold text-destructive"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">&gt; ₹{hardCeiling.toLocaleString()} zero money debited.</p>
          </div>
        </div>

        <div className="pt-2">
          <label className="text-xs font-bold text-foreground block mb-1">Rolling 24-Hour Velocity Cap (₹)</label>
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(Number(e.target.value))}
            className="w-full max-w-xs px-3 py-1.5 text-xs rounded-lg border border-input bg-background font-mono font-bold"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Cumulative spend across 24h before forcing human review.</p>
        </div>
      </div>

      {/* 2. Merchant & MCC Filtering */}
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <h3 className="font-bold text-sm">2. Merchant & MCC Category Code Allow/Deny Lists</h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-foreground block">Approved Razorpay Merchant IDs</label>
            <input
              type="text"
              value={merchants}
              onChange={(e) => setMerchants(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-emerald-600 dark:text-emerald-400 block">Allowed MCC Codes (e.g. 5734 Software, 7372 SaaS)</label>
              <input
                type="text"
                value={allowedMccs}
                onChange={(e) => setAllowedMccs(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-destructive block">Blocked MCC Codes (e.g. 6051 Crypto, 7995 Gambling)</label>
              <input
                type="text"
                value={blockedMccs}
                onChange={(e) => setBlockedMccs(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background font-mono text-destructive"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Temporal & Risk Sensitivity Guardrails */}
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">3. Temporal Operating Windows & Risk Scoring</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg border border-border bg-secondary/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold">Working Hours Gating</h4>
                <p className="text-[11px] text-muted-foreground">Force after-hours / weekend purchases to Step-Up Approval</p>
              </div>
              <input
                type="checkbox"
                checked={enforceWorkingHours}
                onChange={(e) => setEnforceWorkingHours(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">Mon-Fri 08:30 AM to 07:30 PM IST</p>
          </div>

          <div className="p-4 rounded-lg border border-border bg-secondary/20 space-y-3">
            <div>
              <div className="flex justify-between font-bold">
                <span>Prompt-Injection Sensitivity</span>
                <span className="font-mono">{riskThreshold}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Threshold for escalating anomaly risk to Step-Up Review</p>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={riskThreshold}
              onChange={(e) => setRiskThreshold(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
