import { createContext, useContext, type ReactNode } from 'react';
import type { Bom } from "@cyclonedx/cyclonedx-library/Models";
import type { formattedSBOM, SbomStats } from "@/types/sbom";

interface SbomContextType {
  sbom: Bom | null;
  formattedSbom: formattedSBOM | null;
  sbomStats: SbomStats | null;
  scoreHistory?: number[];
  currentFile?: string;
  manifest?: any;
  onImport?: (files: File[]) => void;
  processingLogs?: string[];
}

const SbomContext = createContext<SbomContextType | undefined>(undefined);

export function SbomProvider({ 
  children, 
  value 
}: { 
  children: ReactNode; 
  value: SbomContextType 
}) {
  return (
    <SbomContext.Provider value={value}>
      {children}
    </SbomContext.Provider>
  );
}

export function useSbom() {
  const context = useContext(SbomContext);
  if (context === undefined) {
    throw new Error("useSbom must be used within an SbomProvider");
  }
  return context;
}
