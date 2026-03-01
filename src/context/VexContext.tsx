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
  updateAssessment: (vulnId: string, assessment: Partial<VexAssessment>) => void;
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

  const updateAssessment = useCallback((vulnId: string, assessment: Partial<VexAssessment>) => {
    setAssessments(prev => {
      const current = prev[vulnId] || {
        status: 'none',
        justification: '',
        updatedAt: new Date().toISOString(),
        updatedBy: 'Local User'
      };
      
      return {
        ...prev,
        [vulnId]: {
          ...current,
          ...assessment,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }, []);

  const setAssessment = useCallback((vulnId: string, status: VexStatus, justification: string) => {
    updateAssessment(vulnId, { status, justification });
  }, [updateAssessment]);

  const getAssessment = useCallback((vulnId: string) => {
    return assessments[vulnId];
  }, [assessments]);

  const clearAssessments = useCallback(() => {
    setAssessments({});
  }, []);

  return (
    <VexContext.Provider value={{ assessments, updateAssessment, setAssessment, getAssessment, clearAssessments }}>
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
