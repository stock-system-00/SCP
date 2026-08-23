"use client";

import React from "react";
import { PanelLeft } from "lucide-react";
import { useSidebar } from "./SidebarProvider";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  const { navAberto, toggleSidebar } = useSidebar();

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3 md:px-8 bg-surface/20 rounded-t-2xl">
      <button
        onClick={toggleSidebar}
        aria-label={navAberto ? "Recolher menu" : "Expandir menu"}
        aria-expanded={navAberto}
        className="hidden md:flex -ml-1 h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
      >
        <PanelLeft className="h-[17px] w-[17px]" />
      </button>
      <div className="mr-auto">
        <h1 className="text-[15px] md:text-base font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-[11px] md:text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
