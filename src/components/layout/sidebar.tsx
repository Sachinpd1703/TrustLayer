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
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={clsx(
                    "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
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

      {/* Footer Info */}
      <div className="p-3 rounded-lg border border-border bg-secondary/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-foreground">Razorpay AP2 & x402</span>
          <span className="text-[10px] text-muted-foreground">v0.1.0</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Zero-trust authorization proxy for AI agent-initiated commerce.
        </p>
      </div>
    </aside>
  );
}
