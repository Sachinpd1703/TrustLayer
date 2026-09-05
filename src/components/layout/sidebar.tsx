"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  SlidersHorizontal,
  Bot,
  FileCheck,
  Terminal,
  CreditCard,
  Repeat,
  ExternalLink,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  {
    label: "Live Traffic",
    href: "/",
    icon: Activity,
    badge: "Live",
  },
  {
    label: "Pending Approvals",
    href: "/approvals",
    icon: CheckCircle2,
  },
  {
    label: "Policy & Limits",
    href: "/policies",
    icon: SlidersHorizontal,
  },
  {
    label: "Agents & Kill-Switch",
    href: "/agents",
    icon: Bot,
  },
  {
    label: "SaaS Subscriptions",
    href: "/subscriptions",
    icon: Repeat,
    badge: "Auto-Prune",
  },
  {
    label: "Virtual Cards",
    href: "/virtual-cards",
    icon: CreditCard,
    badge: "10-Min TTL",
  },
  {
    label: "Agent Simulator",
    href: "/simulator",
    icon: Terminal,
  },
  {
    label: "Audit Explorer",
    href: "/audit",
    icon: FileCheck,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card/50 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Control Plane
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={clsx(
                    "h-4 w-4 transition-colors",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={clsx(
                    "text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Network Health / Version Footer */}
      <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            Gateway Node
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active (Edge)
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
          <span>Target Engine</span>
          <span className="font-mono text-foreground font-medium">Razorpay v0.3.0</span>
        </div>

        <a
          href="/.well-known/ai-commerce.json"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between text-[10px] text-primary hover:underline pt-1"
        >
          <span>AI Commerce Catalog</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </aside>
  );
}
