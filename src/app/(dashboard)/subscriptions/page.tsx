"use client";

import React, { useState, useEffect } from "react";
import {
  Repeat,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Trash2,
  RefreshCw,
  Building,
  Mail,
  Calendar,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";

interface SubscriptionSeat {
  id: string;
  merchantId: string;
  merchantName: string;
  sku: string;
  allocatedEmail: string;
  allocatedName: string | null;
  employeeId: string | null;
  departmentCode: string | null;
  monthlyCostPaise: number;
  status: "ACTIVE" | "INACTIVE" | "PENDING_PRUNING" | "CANCELLED";
  lastActivityDate: string | null;
  nextRenewalDate: string;
}

interface ReconcileAnalysis {
  totalSeats: number;
  activeSeats: number;
  zombieSeats: number;
  monthlySpendPaise: number;
  monthlySavingsPaise: number;
  prunableSeats: {
    id: string;
    merchantId: string;
    merchantName: string;
    allocatedEmail: string;
    allocatedName: string | null;
    monthlyCostPaise: number;
    lastActivityDate: string | null;
  }[];
}

export default function SubscriptionsPage() {
  const [seats, setSeats] = useState<SubscriptionSeat[]>([]);
  const [analysis, setAnalysis] = useState<ReconcileAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPruning, setIsPruning] = useState(false);

  async function fetchSeatsAndAnalysis() {
    setIsLoading(true);
    try {
      const [seatsRes, analysisRes] = await Promise.all([
        fetch("/api/v1/subscriptions"),
        fetch("/api/v1/subscriptions/reconcile"),
      ]);

      if (seatsRes.ok) {
        const seatsData = await seatsRes.json();
        setSeats(seatsData);
      }

      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        setAnalysis(analysisData);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load subscription seats.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchSeatsAndAnalysis();
  }, []);

  async function handlePruneZombies() {
    if (!analysis?.prunableSeats.length) {
      toast.info("No zombie seats detected to prune.");
      return;
    }

    setIsPruning(true);
    try {
      const seatIds = analysis.prunableSeats.map((s) => s.id);
      const res = await fetch("/api/v1/subscriptions/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIds }),
      });

      if (!res.ok) throw new Error("Failed to prune seats");

      const result = await res.json();
      toast.success(
        `Successfully pruned ${result.prunedCount} zombie seats! Saved ₹${(
          result.totalSavedPaise / 100
        ).toLocaleString()} / month.`
      );
      fetchSeatsAndAnalysis();
    } catch (err) {
      console.error(err);
      toast.error("Failed to prune zombie seats.");
    } finally {
      setIsPruning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Repeat className="h-6 w-6 text-primary" />
            SaaS Subscriptions & Seat Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Autonomous license lifecycle management, active employee allocations, and pre-renewal zombie seat pruning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSeatsAndAnalysis}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Directory
          </button>

          <button
            onClick={handlePruneZombies}
            disabled={isPruning || !analysis?.zombieSeats}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isPruning ? "Pruning Seats..." : `Auto-Prune ${analysis?.zombieSeats || 0} Zombie Seats`}
          </button>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Provisioned Seats</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {analysis?.totalSeats || seats.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Across Figma, Slack & AWS
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Active Monthly SaaS Spend</span>
            <IndianRupee className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            ₹{((analysis?.monthlySpendPaise || 0) / 100).toLocaleString()}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            Gated through TrustLayer PDP
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Active Employee Seats</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {analysis?.activeSeats || 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Verified usage within 30 days
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-sm border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-medium">
            <span>Zombie Seats (Prunable)</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {analysis?.zombieSeats || 0}
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-300 font-semibold mt-1">
            Save ₹{((analysis?.monthlySavingsPaise || 0) / 100).toLocaleString()} / month on renewal
          </div>
        </div>
      </div>

      {/* Allocated Seats Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Employee License Allocations</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Machine-readable licenses provisioned via Razorpay fulfillment webhooks.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-semibold">
            {seats.length} Total Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="py-3 px-4">Beneficiary / Employee</th>
                <th className="py-3 px-4">Vendor & SKU</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Monthly Cost</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Next Renewal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {seats.map((seat) => (
                <tr key={seat.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                        {seat.allocatedName ? seat.allocatedName.charAt(0).toUpperCase() : "E"}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {seat.allocatedName || "Employee"}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {seat.allocatedEmail}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-medium text-foreground">{seat.merchantName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {seat.sku}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-foreground">
                      <Building className="h-3 w-3" />
                      {seat.departmentCode || "ENGINEERING"}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-foreground">
                      ₹{(seat.monthlyCostPaise / 100).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground"> /mo</span>
                  </td>

                  <td className="py-3.5 px-4">
                    {seat.status === "ACTIVE" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        ACTIVE
                      </span>
                    ) : seat.status === "INACTIVE" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="h-3 w-3" />
                        ZOMBIE (PRUNABLE)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                        <Trash2 className="h-3 w-3" />
                        CANCELLED
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(seat.nextRenewalDate).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
