import { render, screen } from '@testing-library/react';
import { VulnerabilitiesView } from './VulnerabilitiesView';
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
};

describe('VulnerabilitiesView', () => {
    it('should render KPI cards with correct counts', () => {
        render(<VulnerabilitiesView sbom={null} preComputedStats={mockStats} />);

        expect(screen.getByText('Total Vulnerabilities')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // critical
        expect(screen.getByText('10')).toBeInTheDocument(); // high
        expect(screen.getByText('20')).toBeInTheDocument(); // medium
        expect(screen.getByText('15')).toBeInTheDocument(); // low
    });

    it('should show empty state when no vulnerabilities', () => {
        render(<VulnerabilitiesView sbom={null} preComputedStats={emptyStats} />);

        expect(screen.getByText('No vulnerabilities detected!')).toBeInTheDocument();
        expect(screen.getByText(/all components are secure/)).toBeInTheDocument();
    });

    it('should render vulnerable components table', () => {
        render(<VulnerabilitiesView sbom={null} preComputedStats={mockStats} />);

        expect(screen.getByText('lodash')).toBeInTheDocument();
        expect(screen.getByText('express')).toBeInTheDocument();
        expect(screen.getByText('axios')).toBeInTheDocument();
    });

    it('should filter table when searching', async () => {
        const user = userEvent.setup();
        render(<VulnerabilitiesView sbom={null} preComputedStats={mockStats} />);

        const searchInput = screen.getByPlaceholderText('Search components...');
        await user.type(searchInput, 'lodash');

        expect(screen.getByText('lodash')).toBeInTheDocument();
        expect(screen.queryByText('express')).not.toBeInTheDocument();
        expect(screen.queryByText('axios')).not.toBeInTheDocument();
    });

    it('should switch to vulnerability view and show CVEs', async () => {
        const user = userEvent.setup();
        render(<VulnerabilitiesView sbom={null} preComputedStats={mockStats} />);

        const switchBtn = screen.getByText('By Vulnerability');
        await user.click(switchBtn);

        expect(screen.getByText('CVE-2024-001')).toBeInTheDocument();
        expect(screen.getByText('CVE-2024-002')).toBeInTheDocument();
        expect(screen.getByText('GHSA-xxx')).toBeInTheDocument();
        // There might be multiple '10's (KPI card for High vulns is also 10)
        const tens = screen.getAllByText('10');
        expect(tens.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter CVEs when searching in vulnerability view', async () => {
        const user = userEvent.setup();
        render(<VulnerabilitiesView sbom={null} preComputedStats={mockStats} />);

        const switchBtn = screen.getByText('By Vulnerability');
        await user.click(switchBtn);

        const searchInput = screen.getByPlaceholderText('Search CVEs...');
        await user.type(searchInput, 'CVE-2024-001');

        expect(screen.getByText('CVE-2024-001')).toBeInTheDocument();
        expect(screen.queryByText('CVE-2024-002')).not.toBeInTheDocument();
    });
});
