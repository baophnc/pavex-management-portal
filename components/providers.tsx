"use client";

import { Toaster } from "sonner";

import { AppThemeProvider } from "@/components/theme/app-theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppThemeProvider>
      {children}
      <Toaster richColors closeButton position="top-right" />
    </AppThemeProvider>
  );
}
