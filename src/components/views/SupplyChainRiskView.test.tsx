import { render, screen, fireEvent } from '@testing-library/react';
import { SupplyChainRiskView } from './SupplyChainRiskView';
import { describe, it, expect, vi } from 'vitest';
import { Bom } from '@cyclonedx/cyclonedx-library/Models';
import { ViewProvider } from '../../context/ViewContext';
import { SelectionProvider } from '../../context/SelectionContext';
import { SbomProvider } from '../../context/SbomContext';
import type { formattedSBOM, EnhancedComponent } from '../../types/sbom';

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
        licenses: [{ id: 'MIT' }] as any
    };

    const mockFormattedSbom: Partial<formattedSBOM> = {
        componentMap: new Map([['pkg:npm/test-pkg@1.0.0', mockComponent as EnhancedComponent]]),
        blastRadius: new Map([['pkg:npm/test-pkg@1.0.0', 5]]),
    };

    it('renders risk score and leaderboard', () => {
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

        expect(screen.getByText('Supply Chain Risk')).toBeInTheDocument();
        expect(screen.getAllByText('test-pkg')[0]).toBeInTheDocument();
        // Risk score calculation: 
        // vScore = 1 * 10 = 10
        // blastRadius = 5
        // lScore (MIT) = 0
        // cScore = log1p(5) * 2 = 1.79 * 2 = 3.58
        // totalScore = (10 * (1 + 5/100)) + 0 + 3.58 = 10.5 + 3.58 = 14.08 -> 14.1
        expect(screen.getAllByText('14.1')[0]).toBeInTheDocument();
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

        const searchInput = screen.getByPlaceholderText('Search...');
        fireEvent.change(searchInput, { target: { value: 'alpha' } });

        expect(screen.getAllByText('alpha-pkg')[0]).toBeInTheDocument();
        expect(screen.queryByText('beta-pkg')).not.toBeInTheDocument();
    });
});
