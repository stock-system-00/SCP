"use client";

import React, { createContext, useContext, useState } from "react";

interface SidebarContextType {
  navAberto: boolean;
  setNavAberto: (value: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [navAberto, setNavAberto] = useState(false);

  const toggleSidebar = () => setNavAberto((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ navAberto, setNavAberto, toggleSidebar }}>
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
