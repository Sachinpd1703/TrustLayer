"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Menu, 
  Play, 
  UserCheck, 
  ExternalLink, 
  Activity, 
  Radio, 
  ChevronDown,
  Lock,
  Cpu
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "./sidebar-provider";

export function Header() {
  const { openMobile } = useSidebar();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 md:h-[70px] w-full border-b border-border bg-card/85 backdrop-blur-md flex-shrink-0 relative z-30 transition-colors">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        
        {/* Left: Hamburger (Mobile) & Brand Identity */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={openMobile}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105 border border-primary/20">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base md:text-lg tracking-tight text-foreground">
                  TrustLayer
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-blue-400 border border-primary/20 hidden xs:inline-block">
                  Gateway
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Gated & Explainable Authorization for Razorpay
              </p>
            </div>
          </Link>
        </div>

        {/* Right: Environment Badge, Actions & Operator Profile */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* Razorpay Test Mode Live Badge */}
          <div className="flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">Razorpay Test Mode</span>
            <span className="sm:hidden text-[10px] font-bold">TEST</span>
          </div>

          {/* Quick Simulator Link */}
          <Link
            href="/simulator"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Agent Simulator</span>
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Operator Profile / Gateway Status Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-foreground transition-all hover:border-border/80 focus:outline-none"
              aria-label="Gateway operator menu"
            >
              <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                <UserCheck className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium hidden md:inline-block pr-1">
                Admin
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:inline-block" />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-card border border-border shadow-2xl p-3 z-50 text-xs"
                >
                  <div className="pb-2.5 mb-2 border-b border-border">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Security Officer
                    </p>
                    <p className="font-semibold text-sm text-foreground">
                      gateway-admin@trustlayer.local
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <Radio className="h-3 w-3 animate-pulse" />
                      <span>Edge Node: Active (SOC 2 Mode)</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      href="/approvals"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        Approvals Queue
                      </span>
                    </Link>

                    <Link
                      href="/policies"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                        Policy Configuration
                      </span>
                    </Link>

                    <Link
                      href="/audit"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                        Audit Explorer
                      </span>
                    </Link>
                  </div>

                  <div className="pt-2 mt-2 border-t border-border">
                    <a
                      href="/.well-known/ai-commerce.json"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors font-medium text-[11px]"
                    >
                      <span>AI Commerce Catalog</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </header>
  );
}
