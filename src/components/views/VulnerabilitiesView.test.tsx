import { render, screen, fireEvent } from '@testing-library/react';
import { VulnerabilitiesView } from './VulnerabilitiesView';
import { describe, it, expect, vi } from 'vitest';
import type { SbomStats } from '@/types/sbom';
import userEvent from '@testing-library/user-event';
import { SettingsProvider } from "../../context/SettingsContext";

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
    licenseCounts: {},
    topLicenses: [],
    licenseDistribution: { permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0 },
    vulnerableComponents: [],
    allVulnerableComponents: [
        { name: 'lodash', version: '4.17.20', ref: 'ref-lodash', critical: 2, high: 3, medium: 1, low: 0, total: 6 },
        { name: 'express', version: '4.17.1', ref: 'ref-express', critical: 1, high: 2, medium: 0, low: 1, total: 4 },
        { name: 'axios', version: '0.21.0', ref: 'ref-axios', critical: 0, high: 1, medium: 2, low: 0, total: 3 },
    ],
    totalVulnerabilities: 50,
    allVulnerabilities: [
        { id: 'CVE-2024-001', severity: 'critical', affectedCount: 10, title: 'Critical Vuln' },
        { id: 'CVE-2024-002', severity: 'high', affectedCount: 5, title: 'High Vuln' },
        { id: 'GHSA-xxx', severity: 'medium', affectedCount: 2, title: 'Medium Vuln' },
    ],
    allLicenses: [],
    allLicenseComponents: [],
    uniqueVulnerabilityCount: 3,
    avgVulnerabilitiesPerComponent: 0.5,
    dependencyStats: { direct: 30, transitive: 70 },
    dependentsDistribution: { 0: 30, 1: 40, 5: 30 },
    vulnerabilityImpactDistribution: { 0: 10, 1: 20, 5: 20 },
};

const emptyStats: SbomStats = {
    totalComponents: 50,
    vulnerabilityCounts: { critical: 0, high: 0, medium: 0, low: 0, none: 50 },
    licenseCounts: {},
    topLicenses: [],
    licenseDistribution: { permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0 },
    vulnerableComponents: [],
    allVulnerableComponents: [],
    totalVulnerabilities: 0,
    allVulnerabilities: [],
    allLicenses: [],
    allLicenseComponents: [],
    uniqueVulnerabilityCount: 0,
    avgVulnerabilitiesPerComponent: 0,
    dependencyStats: { direct: 50, transitive: 0 },
    dependentsDistribution: { 0: 50 },
    vulnerabilityImpactDistribution: {},
};

describe('VulnerabilitiesView', () => {
    it('should render KPI cards with correct counts', () => {
        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={null} preComputedStats={mockStats} />
            </SettingsProvider>
        );

        expect(screen.getByText('Total Findings')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('Unique CVEs')).toBeInTheDocument();
        expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);

        expect(screen.getAllByText('Critical').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Medium').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Low').length).toBeGreaterThanOrEqual(1);

        expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('20').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('15').length).toBeGreaterThanOrEqual(1);
    });

    it('should show empty state when no vulnerabilities', () => {
        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={null} preComputedStats={emptyStats} />
            </SettingsProvider>
        );

        expect(screen.getByText('No vulnerabilities detected!')).toBeInTheDocument();
        expect(screen.getByText(/all components are secure/)).toBeInTheDocument();
    });

    it('should render vulnerable components table', () => {
        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={null} preComputedStats={mockStats} />
            </SettingsProvider>
        );

        expect(screen.getByText('lodash')).toBeInTheDocument();
        expect(screen.getByText('express')).toBeInTheDocument();
        expect(screen.getByText('axios')).toBeInTheDocument();
    });

    it('should filter table when searching', async () => {
        const user = userEvent.setup();
        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={null} preComputedStats={mockStats} />
            </SettingsProvider>
        );

        const searchInput = screen.getByPlaceholderText('Search components...');
        await user.type(searchInput, 'lodash');

        expect(screen.getByText('lodash')).toBeInTheDocument();
        expect(screen.queryByText('express')).not.toBeInTheDocument();
        expect(screen.queryByText('axios')).not.toBeInTheDocument();
    });

    it('should switch to vulnerability view and show CVEs', async () => {
        const user = userEvent.setup();
        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={null} preComputedStats={mockStats} />
            </SettingsProvider>
        );

        const switchBtn = screen.getByText('By Vulnerability');
        await user.click(switchBtn);

        expect(screen.getByText('CVE-2024-001')).toBeInTheDocument();
        expect(screen.getByText('CVE-2024-002')).toBeInTheDocument();
        expect(screen.getByText('GHSA-xxx')).toBeInTheDocument();
        const tens = screen.getAllByText('10');
        expect(tens.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter CVEs when searching in vulnerability view', async () => {
        const user = userEvent.setup();
        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={null} preComputedStats={mockStats} />
            </SettingsProvider>
        );

        const switchBtn = screen.getByText('By Vulnerability');
        await user.click(switchBtn);

        const searchInput = screen.getByPlaceholderText('Search CVEs...');
        fireEvent.change(searchInput, { target: { value: 'CVE-2024-001' } });

        expect(screen.getByText('CVE-2024-001')).toBeInTheDocument();
        expect(screen.queryByText('CVE-2024-002')).not.toBeInTheDocument();
    });

    it('should render comprehensive vulnerability details when selected', async () => {
        const user = userEvent.setup();
        const detailedStats: SbomStats = {
            ...mockStats,
            allVulnerabilities: [
                {
                    id: 'CVE-9999-DETAILED',
                    severity: 'high',
                    affectedCount: 1,
                    affectedComponentRefs: ['ref-lodash'],
                    title: 'Detailed Title',
                    description: 'Detailed Description',
                    detail: 'Detailed long text',
                    recommendation: 'Fix it now',
                    cwes: [79],
                    analysis: {
                        state: 'not_affected',
                        justification: 'code_not_reachable'
                    },
                    created: '2024-01-01T00:00:00Z',
                    proofOfConcept: {
                        reproductionSteps: 'Step 1: Run it'
                    }
                }
            ]
        };

        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={null} preComputedStats={detailedStats} />
            </SettingsProvider>
        );

        const switchBtn = screen.getByText('By Vulnerability');
        await user.click(switchBtn);

        const detailsBtn = screen.getByText('Details');
        await user.click(detailsBtn);

        expect(screen.getByText('Detailed Title')).toBeInTheDocument();
        expect(screen.getByText('Detailed Description')).toBeInTheDocument();
        expect(screen.getByText('Detailed long text')).toBeInTheDocument();
        expect(screen.getByText('Fix it now')).toBeInTheDocument();
        expect(screen.getByText('CWE-79')).toBeInTheDocument();
        expect(screen.getByText(/not_affected/i)).toBeInTheDocument();
        expect(screen.getByText(/code_not_reachable/i)).toBeInTheDocument();
        expect(screen.getByText('Step 1: Run it')).toBeInTheDocument();
        // Check for "Timeline" header to ensure we are in the right section
        expect(screen.getByText('Timeline')).toBeInTheDocument();
    });
});
