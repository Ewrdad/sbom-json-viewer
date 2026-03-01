import { createContext, useContext, useState, type ReactNode } from 'react';

interface SelectionContextType {
  selectedComponent: any | null;
  setSelectedComponent: (component: any | null) => void;
  selectedVulnerability: any | null;
  setSelectedVulnerability: (vulnerability: any | null) => void;
  selectedLicense: any | null;
  setSelectedLicense: (license: any | null) => void;
  viewFilters: Record<string, any>;
  setViewFilters: (view: string, filters: any) => void;
  sourceFilter: string | null;
  setSourceFilter: (source: string | null) => void;
  clearSelection: () => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedComponent, setSelectedComponent] = useState<any | null>(null);
  const [selectedVulnerability, setSelectedVulnerability] = useState<any | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<any | null>(null);
  const [viewFilters, setViewFiltersState] = useState<Record<string, any>>({});
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  const setViewFilters = (view: string, filters: any) => {
    setViewFiltersState(prev => ({ ...prev, [view]: filters }));
  };

  // When a component is selected, clear other selections
  const handleSetComponent = (comp: any | null) => {
    setSelectedComponent(comp);
    if (comp) {
      setSelectedVulnerability(null);
      setSelectedLicense(null);
    }
  };

  const handleSetVulnerability = (vuln: any | null) => {
    setSelectedVulnerability(vuln);
    if (vuln) {
      setSelectedComponent(null);
      setSelectedLicense(null);
    }
  };

  const handleSetLicense = (license: any | null) => {
    setSelectedLicense(license);
    if (license) {
      setSelectedComponent(null);
      setSelectedVulnerability(null);
    }
  };

  const clearSelection = () => {
    setSelectedComponent(null);
    setSelectedVulnerability(null);
    setSelectedLicense(null);
  };

  return (
    <SelectionContext.Provider 
      value={{ 
        selectedComponent, 
        setSelectedComponent: handleSetComponent, 
        selectedVulnerability, 
        setSelectedVulnerability: handleSetVulnerability,
        selectedLicense,
        setSelectedLicense: handleSetLicense,
        viewFilters,
        setViewFilters,
        sourceFilter,
        setSourceFilter,
        clearSelection 
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}
