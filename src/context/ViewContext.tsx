import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ViewType } from '../types';

interface ViewContextType {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");

  return (
    <ViewContext.Provider value={{ activeView, setActiveView }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error("useView must be used within a ViewProvider");
  }
  return context;
}
