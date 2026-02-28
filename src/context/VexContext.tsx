import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type VexStatus = 'not_affected' | 'affected' | 'fixed' | 'under_investigation' | 'none';

export interface VexAssessment {
  status: VexStatus;
  justification: string;
  updatedAt: string;
  updatedBy: string;
}

interface VexContextType {
  assessments: Record<string, VexAssessment>;
  setAssessment: (vulnId: string, status: VexStatus, justification: string) => void;
  getAssessment: (vulnId: string) => VexAssessment | undefined;
  clearAssessments: () => void;
}

const VexContext = createContext<VexContextType | undefined>(undefined);

export function VexProvider({ children }: { children: React.ReactNode }) {
  const [assessments, setAssessments] = useState<Record<string, VexAssessment>>(() => {
    const saved = localStorage.getItem('sbom_viewer_vex_assessments');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('sbom_viewer_vex_assessments', JSON.stringify(assessments));
  }, [assessments]);

  const setAssessment = useCallback((vulnId: string, status: VexStatus, justification: string) => {
    setAssessments(prev => {
      if (status === 'none') {
        const next = { ...prev };
        delete next[vulnId];
        return next;
      }
      return {
        ...prev,
        [vulnId]: {
          status,
          justification,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Local User'
        }
      };
    });
  }, []);

  const getAssessment = useCallback((vulnId: string) => {
    return assessments[vulnId];
  }, [assessments]);

  const clearAssessments = useCallback(() => {
    setAssessments({});
  }, []);

  return (
    <VexContext.Provider value={{ assessments, setAssessment, getAssessment, clearAssessments }}>
      {children}
    </VexContext.Provider>
  );
}

export function useVex() {
  const context = useContext(VexContext);
  if (context === undefined) {
    throw new Error('useVex must be used within a VexProvider');
  }
  return context;
}
