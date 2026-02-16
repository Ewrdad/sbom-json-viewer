import { render, screen } from '@testing-library/react';
import { LicensesView } from './LicensesView';
import { describe, it, expect, vi } from 'vitest';
import type { SbomStats } from '@/types/sbom';
import userEvent from '@testing-library/user-event';

// Mock Recharts to avoid responsive container issues in jsdom
vi.mock('recharts', async () => {
    const OriginalModule = await vi.importActual('recharts');
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...OriginalModule as any,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div style={{ width: 800, height: 800 }}>{children}</div>
        ),
    };
});

const mockStats: SbomStats = {
    totalComponents: 100,
    vulnerabilityCounts: { critical: 5, high: 10, medium: 20, low: 15, none: 50 },
    licenseCounts: { 'MIT': 50, 'Apache-2.0': 30, 'GPL-3.0': 10 },
    topLicenses: [
        { name: 'MIT', count: 50 },
        { name: 'Apache-2.0', count: 30 },
        { name: 'GPL-3.0', count: 10 },
    ],
    licenseDistribution: { permissive: 80, copyleft: 10, weakCopyleft: 0, proprietary: 0, unknown: 10 },
    vulnerableComponents: [],
    allVulnerableComponents: [],
    totalVulnerabilities: 50,
    allVulnerabilities: [],
    allLicenses: [
        { id: 'MIT', name: 'MIT License', category: 'permissive', affectedCount: 50 },
        { id: 'Apache-2.0', name: 'Apache License 2.0', category: 'permissive', affectedCount: 30 },
        { id: 'GPL-3.0', name: 'GNU GPL v3', category: 'copyleft', affectedCount: 10 },
    ],
    allLicenseComponents: [
        { name: 'react', version: '18.2.0', ref: 'ref-react', licenses: [{ id: 'MIT', name: 'MIT', category: 'permissive' }] },
        { name: 'express', version: '4.17.1', ref: 'ref-express', licenses: [{ id: 'MIT', name: 'MIT', category: 'permissive' }] },
    ],
    uniqueVulnerabilityCount: 0,
    avgVulnerabilitiesPerComponent: 0,
    dependencyStats: { direct: 50, transitive: 50 },
    dependentsDistribution: { 0: 50, 1: 50 },
    vulnerabilityImpactDistribution: {},
    cweCounts: {},
    sourceCounts: {},
};


describe('LicensesView', () => {
    it('should render KPI cards with correct counts', () => {
        vi.setConfig({ testTimeout: 15000 });
        render(<LicensesView sbom={null} preComputedStats={mockStats} />);

        expect(screen.getByText('Unique Licenses')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // total unique licenses
        expect(screen.getByText('80')).toBeInTheDocument(); // permissive
        // There might be multiple '10's (KPI card and license count)
        const tens = screen.getAllByText('10');
        expect(tens.length).toBeGreaterThanOrEqual(1);
    });

    it('should render license components table', () => {
        render(<LicensesView sbom={null} preComputedStats={mockStats} />);

        expect(screen.getByText('react')).toBeInTheDocument();
        expect(screen.getByText('express')).toBeInTheDocument();
    });

    it('should filter components when searching', async () => {
        const user = userEvent.setup();
        render(<LicensesView sbom={null} preComputedStats={mockStats} />);

        const searchInput = screen.getByPlaceholderText('Search components or licenses...');
        await user.type(searchInput, 'react');

        expect(screen.getByText('react')).toBeInTheDocument();
        expect(screen.queryByText('express')).not.toBeInTheDocument();
    });

    it('should switch to license registry view and show licenses', async () => {
        const user = userEvent.setup();
        render(<LicensesView sbom={null} preComputedStats={mockStats} />);

        const switchBtn = screen.getByText('By License');
        await user.click(switchBtn);

        expect(screen.getByText('MIT')).toBeInTheDocument();
        expect(screen.getByText('Apache-2.0')).toBeInTheDocument();
        expect(screen.getByText('GPL-3.0')).toBeInTheDocument();
    });

    it('should filter licenses when searching in license view', async () => {
        const user = userEvent.setup();
        render(<LicensesView sbom={null} preComputedStats={mockStats} />);

        const switchBtn = screen.getByText('By License');
        await user.click(switchBtn);

        const searchInput = screen.getByPlaceholderText('Search licenses...');
        await user.type(searchInput, 'MIT');

        expect(screen.getByText('MIT')).toBeInTheDocument();
        expect(screen.queryByText('GPL-3.0')).not.toBeInTheDocument();
    });
});
