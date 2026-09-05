"use client";

import React from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden select-text">
      {/* Top Header Navigation */}
      <Header />

      {/* Main Viewport Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible / Responsive Sidebar */}
        <Sidebar />

        {/* Scrollable Main Content Canvas */}
        <main className="flex-1 flex flex-col h-full relative min-w-0 bg-background/50">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth hide-scrollbar">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
