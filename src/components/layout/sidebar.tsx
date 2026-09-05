"use client";

import React, { useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
} from "lucide-react";
import { useSidebar } from "./sidebar-provider";
import { cn } from "@/lib/utils";

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
  const { isMobileOpen, closeMobile, isCollapsed, toggleCollapse } = useSidebar();

  // Close mobile sidebar whenever route changes
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Element */}
      <aside
        className={cn(
          "bg-card/75 backdrop-blur-md border-r border-border flex flex-col justify-between flex-shrink-0 transition-all duration-300 ease-in-out",
          // Mobile responsive positioning
          "fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-20 h-full",
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          // Desktop width handling
          isCollapsed ? "lg:w-20" : "lg:w-64",
          "w-72" // Default width when open on mobile
        )}
      >
        {/* Top Header / Control Section */}
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Mobile Close Button & Header */}
          <div className="flex lg:hidden items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>TrustLayer Menu</span>
            </div>
            <button
              onClick={closeMobile}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop Section Header & Toggle */}
          <div className={cn(
            "hidden lg:flex items-center pt-4 pb-2 relative transition-all duration-300",
            isCollapsed ? "justify-center px-2" : "justify-center px-4"
          )}>
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center transition-all duration-300 whitespace-nowrap overflow-hidden",
                isCollapsed ? "opacity-0 w-0" : "opacity-100 flex-1"
              )}
            >
              Control Plane
            </p>
            <button
              type="button"
              onClick={toggleCollapse}
              className={cn(
                "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
                isCollapsed ? "" : "absolute right-3"
              )}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto overflow-x-hidden hide-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-xl text-xs font-medium transition-all group relative",
                    isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    
                    {/* Animated label */}
                    <span
                      className={cn(
                        "whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out truncate",
                        isCollapsed ? "lg:max-w-0 lg:opacity-0" : "max-w-[170px] opacity-100"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Badge */}
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full transition-all duration-300 whitespace-nowrap flex-shrink-0 ml-1.5",
                        isCollapsed ? "hidden" : "inline-flex items-center",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Collapsed Active Indicator Dot */}
                  {isCollapsed && isActive && (
                    <span className="hidden lg:block absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer: Gateway Node Telemetry / Health */}
        <div className="p-3 border-t border-border mt-auto flex-shrink-0">
          {isCollapsed ? (
            <div
              className="flex items-center justify-center p-2 rounded-xl bg-muted/40 border border-border/50 cursor-pointer"
              title="Gateway Node: Active (Razorpay v0.3.0)"
              onClick={toggleCollapse}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-border/60 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Gateway Node
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
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
          )}
        </div>
      </aside>
    </>
  );
}
