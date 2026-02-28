import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type SearchEngineId = 'google' | 'duckduckgo' | 'bing' | 'google_ai' | 'bing_ai';

export interface SearchEngine {
  id: SearchEngineId;
  name: string;
  urlTemplate: string;
  isAi?: boolean;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { 
    id: 'google', 
    name: 'Google', 
    urlTemplate: 'https://www.google.com/search?q={query}' 
  },
  { 
    id: 'duckduckgo', 
    name: 'DuckDuckGo', 
    urlTemplate: 'https://duckduckgo.com/?q={query}&ia=web' 
  },
  { 
    id: 'bing', 
    name: 'Bing', 
    urlTemplate: 'https://www.bing.com/search?q={query}' 
  },
  { 
    id: 'google_ai', 
    name: 'Google AI', 
    urlTemplate: 'https://www.google.com/search?q={query}&sca_esv=7782a288a773db31&udm=50',
    isAi: true
  },
  { 
    id: 'bing_ai', 
    name: 'Bing AI', 
    urlTemplate: 'https://www.bing.com/search?q={query}&mturn=1',
    isAi: true
  }
];

interface SettingsContextType {
  defaultSearchEngine: SearchEngineId;
  setDefaultSearchEngine: (id: SearchEngineId) => void;
  performSearch: (query: string, engineId?: SearchEngineId) => void;
  getSearchUrl: (query: string, engineId?: SearchEngineId) => string;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [defaultSearchEngine, setDefaultSearchEngineState] = useState<SearchEngineId>('google');
  const [highContrast, setHighContrastState] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const savedEngine = localStorage.getItem('sbom-viewer-default-search-engine');
    if (savedEngine && SEARCH_ENGINES.some(e => e.id === savedEngine)) {
      setDefaultSearchEngineState(savedEngine as SearchEngineId);
    }

    const savedContrast = localStorage.getItem('sbom-viewer-high-contrast');
    if (savedContrast === 'true') {
      setHighContrastState(true);
      document.documentElement.classList.add('high-contrast');
    }
  }, []);

  const setDefaultSearchEngine = (id: SearchEngineId) => {
    setDefaultSearchEngineState(id);
    localStorage.setItem('sbom-viewer-default-search-engine', id);
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    localStorage.setItem('sbom-viewer-high-contrast', String(enabled));
    if (enabled) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  };

  const getSearchUrl = (query: string, engineId?: SearchEngineId) => {
    const engine = SEARCH_ENGINES.find(e => e.id === (engineId || defaultSearchEngine)) || SEARCH_ENGINES[0];
    return engine.urlTemplate.replace('{query}', encodeURIComponent(query));
  };

  const performSearch = (query: string, engineId?: SearchEngineId) => {
    const url = getSearchUrl(query, engineId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <SettingsContext.Provider value={{ 
      defaultSearchEngine, 
      setDefaultSearchEngine, 
      performSearch,
      getSearchUrl,
      highContrast,
      setHighContrast
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
