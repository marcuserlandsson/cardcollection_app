"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface PanelContextValue {
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
}

const PanelContext = createContext<PanelContextValue>({
  isPanelOpen: false,
  openPanel: () => {},
  closePanel: () => {},
});

export function PanelProvider({ children }: { children: ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);

  return (
    <PanelContext.Provider value={{ isPanelOpen, openPanel, closePanel }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanelContext() {
  return useContext(PanelContext);
}
