"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type SidebarContextValue = {
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapse: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Read saved preference from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("trustlayer_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleSetIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem("trustlayer_sidebar_collapsed", String(collapsed));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    handleSetIsCollapsed(!isCollapsed);
  }, [handleSetIsCollapsed, isCollapsed]);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const value = useMemo(
    () => ({
      isMobileOpen,
      setMobileOpen,
      openMobile,
      closeMobile,
      isCollapsed,
      setIsCollapsed: handleSetIsCollapsed,
      toggleCollapse,
    }),
    [closeMobile, handleSetIsCollapsed, isCollapsed, isMobileOpen, openMobile, toggleCollapse]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
