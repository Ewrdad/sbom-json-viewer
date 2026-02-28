import { render, screen, fireEvent } from '@testing-library/react';
import { SupplyChainRiskView } from './SupplyChainRiskView';
import { describe, it, expect, vi } from 'vitest';
import { Bom } from '@cyclonedx/cyclonedx-library/Models';
import { ViewProvider } from '../../context/ViewContext';
import { SelectionProvider } from '../../context/SelectionContext';
import { SbomProvider } from '../../context/SbomContext';
import type { formattedSBOM, EnhancedComponent, SbomStats } from '../../types/sbom';

// Mock Recharts
vi.mock('recharts', async () => {
    const OriginalModule = await vi.importActual('recharts');
    return {
        ...OriginalModule as any,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div style={{ width: 800, height: 400 }}>{children}</div>
        ),
    };
});

// Mock useSbomStats
vi.mock('../../hooks/useSbomStats', () => ({
    useSbomStats: (sbom: any) => ({
        developerStats: {
            versionConflicts: [],
            metadataQuality: { score: 80, grade: 'A', checks: {} }
        }
    } as SbomStats)
}));

describe('SupplyChainRiskView', () => {
    const mockComponent: Partial<EnhancedComponent> = {
        name: 'test-pkg',
        version: '1.0.0',
        bomRef: { value: 'pkg:npm/test-pkg@1.0.0' } as any,
        vulnerabilities: {
            inherent: {
                Critical: [{} as any],
                High: [],
                Medium: [],
                Low: [],
                Informational: []
            },
            transitive: {
                Critical: [],
                High: [],
                Medium: [],
                Low: [],
                Informational: []
            }
        },
        licenses: [{ id: 'MIT' }] as any,
        purl: 'pkg:npm/test-pkg@1.0.0'
    };

    const mockFormattedSbom: Partial<formattedSBOM> = {
        componentMap: new Map([['pkg:npm/test-pkg@1.0.0', mockComponent as EnhancedComponent]]),
        blastRadius: new Map([['pkg:npm/test-pkg@1.0.0', 5]]),
    };

    it('renders security posture and leaderboard', () => {
        render(
            <ViewProvider>
                <SelectionProvider>
                    <SbomProvider value={{ 
                        sbom: new Bom(), 
                        formattedSbom: mockFormattedSbom as formattedSBOM, 
                        sbomStats: null, 
                        scoreHistory: [] 
                    }}>
                        <SupplyChainRiskView />
                    </SbomProvider>
                </SelectionProvider>
            </ViewProvider>
        );

        expect(screen.getByText('Security Posture')).toBeInTheDocument();
        expect(screen.getAllByText('test-pkg')[0]).toBeInTheDocument();
        
        // Risk score calculation: 
        // securityScore: 1 Critical -> rawVScore=10 -> securityScore=100
        // impactScore: blastRadius=5 -> (5/20)*100 = 25
        // complianceScore: MIT -> 0
        // qualityScore: hasConflict=false, hasPurl=true, hasSupplier=false (no author/supplier in mock) -> 0 + 0 + 25 = 25
        // totalScore = (100 * 0.4) + (25 * 0.3) + (0 * 0.15) + (25 * 0.15) = 40 + 7.5 + 0 + 3.75 = 51.25 -> 51.3
        
        expect(screen.getAllByText('51.3')[0]).toBeInTheDocument();
    });

    it('filters components based on search input', () => {
        const mockFormattedSbomMultiple: Partial<formattedSBOM> = {
            componentMap: new Map([
                ['pkg1', { ...mockComponent, name: 'alpha-pkg', bomRef: { value: 'pkg1' } } as EnhancedComponent],
                ['pkg2', { ...mockComponent, name: 'beta-pkg', bomRef: { value: 'pkg2' } } as EnhancedComponent]
            ]),
            blastRadius: new Map([['pkg1', 0], ['pkg2', 0]]),
        };

        render(
            <ViewProvider>
                <SelectionProvider>
                    <SbomProvider value={{ 
                        sbom: new Bom(), 
                        formattedSbom: mockFormattedSbomMultiple as formattedSBOM, 
                        sbomStats: null, 
                        scoreHistory: [] 
                    }}>
                        <SupplyChainRiskView />
                    </SbomProvider>
                </SelectionProvider>
            </ViewProvider>
        );

        expect(screen.getAllByText('alpha-pkg')[0]).toBeInTheDocument();
        expect(screen.getAllByText('beta-pkg')[0]).toBeInTheDocument();

        const searchInput = screen.getByPlaceholderText('Filter components...');
        fireEvent.change(searchInput, { target: { value: 'alpha' } });

        expect(screen.getAllByText('alpha-pkg')[0]).toBeInTheDocument();
        expect(screen.queryByText('beta-pkg')).not.toBeInTheDocument();
    });
});
