import { render, screen, fireEvent, within } from '@testing-library/react';
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

// Mock DropdownMenu to avoid portal issues in tests
vi.mock("@/components/ui/dropdown-menu", () => ({
    DropdownMenu: ({ children }: any) => <div data-testid="mock-dropdown">{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div data-testid="mock-dropdown-trigger">{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div data-testid="mock-dropdown-content">{children}</div>,
    DropdownMenuCheckboxItem: ({ children, onCheckedChange, checked }: any) => (
        <div data-testid="mock-checkbox" onClick={() => onCheckedChange?.(!checked)}>
            {children}
        </div>
    ),
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuGroup: ({ children }: any) => <div>{children}</div>,
    DropdownMenuRadioGroup: ({ children }: any) => <div>{children}</div>,
    DropdownMenuRadioItem: ({ children }: any) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>,
    DropdownMenuShortcut: ({ children }: any) => <div>{children}</div>,
    DropdownMenuPortal: ({ children }: any) => <>{children}</>,
}));

vi.mock("../../lib/ticketExportUtils", () => ({
    generateTicketCSV: vi.fn(() => "mock-csv"),
    downloadCSV: vi.fn(),
}));

import { generateTicketCSV, downloadCSV } from "../../lib/ticketExportUtils";

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
        { id: 'CVE-2024-001', severity: 'critical', affectedCount: 10, title: 'Critical Vuln', affectedComponentRefs: ['ref-lodash'] },
        { id: 'CVE-2024-002', severity: 'high', affectedCount: 5, title: 'High Vuln', affectedComponentRefs: ['ref-express'] },
        { id: 'GHSA-xxx', severity: 'medium', affectedCount: 2, title: 'Medium Vuln', affectedComponentRefs: ['ref-axios'] },
    ],
    allLicenses: [],
    allLicenseComponents: [],
    uniqueVulnerabilityCount: 3,
    avgVulnerabilitiesPerComponent: 0.5,
    dependencyStats: { direct: 30, transitive: 70 },
    dependentsDistribution: { 0: 30, 1: 40, 5: 30 },
    vulnerabilityImpactDistribution: { 0: 10, 1: 20, 5: 20 },
    cweCounts: { 'CWE-123': 1 },
    sourceCounts: { 'NVD': 1 }
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
    cweCounts: {},
    sourceCounts: {},
};

describe('VulnerabilitiesView', () => {
    it('should render KPI cards with correct counts', () => {
        vi.setConfig({ testTimeout: 15000 });
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
                    },
                    source: {
                        name: 'NVD',
                        url: 'https://nvd.nist.gov'
                    }
                }
            ],
            cweCounts: { 'CWE-79': 1 },
            sourceCounts: { 'NVD': 1 }
        };

        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={null} preComputedStats={detailedStats} />
            </SettingsProvider>
        );

        const switchBtn = screen.getByText('By Vulnerability');
        await user.click(switchBtn);

        const detailsBtn = screen.getByText('Details');
        fireEvent.click(detailsBtn);

        // Wait for details panel to appear
        expect(await screen.findByText('Vulnerability Details')).toBeInTheDocument();
        expect(screen.getByText('Severity:')).toBeInTheDocument();
        expect(screen.getByText('ID:')).toBeInTheDocument();

        // Check Overview (Open by default)
        expect((await screen.findAllByText('Detailed Title')).length).toBeGreaterThan(0);
        expect((await screen.findAllByText('Fix it now')).length).toBeGreaterThan(0);
        expect((await screen.findAllByText('CWE-79')).length).toBeGreaterThan(0);

        // Check Technical Details (Open by default)
        expect((await screen.findAllByText('Detailed Description')).length).toBeGreaterThan(0);
        expect((await screen.findAllByText(/not_affected/i)).length).toBeGreaterThan(0);
        expect((await screen.findAllByText(/code_not_reachable/i)).length).toBeGreaterThan(0);
        
        // Open Remediation & Evidence
        const remTrigger = screen.getAllByRole('button', { name: /Remediation & Evidence/ })[0];
        fireEvent.click(remTrigger);
        expect((await screen.findAllByText('Step 1: Run it')).length).toBeGreaterThan(0);

        // Open Metadata & Provenance
        const metaTrigger = screen.getAllByRole('button', { name: /Metadata & Provenance/ })[0];
        fireEvent.click(metaTrigger);
        expect(await screen.findByText('Primary Source')).toBeInTheDocument();
        expect(screen.getAllByText('NVD').length).toBeGreaterThanOrEqual(1);
    });

    it('should render all extended vulnerability fields', async () => {
        const user = userEvent.setup();
        const extendedStats: SbomStats = {
            ...mockStats,
            allVulnerabilities: [
                {
                    id: 'CVE-EXTENDED',
                    severity: 'critical',
                    affectedCount: 1,
                    affectedComponentRefs: ['ref-lodash'],
                    title: 'Extended Title',
                    description: 'Extended Description',
                    recommendation: 'Fix it',
                    workaround: 'Do this instead',
                    credits: {
                        organizations: [{ name: 'Security Org', url: 'https://security.org' }],
                        individuals: [{ name: 'Jane Doe', email: 'jane@doe.com' }]
                    },
                    tools: [{ name: 'VulnScanner', version: '1.0' }],
                    properties: [{ name: 'custom-prop', value: 'custom-val' }],
                    cwes: [123],
                    affects: [
                        {
                            ref: 'ref-lodash',
                            versions: [{ version: '4.17.20', status: 'affected' }]
                        }
                    ],
                    ratings: [
                        {
                            source: { name: 'NVD' },
                            score: 9.8,
                            severity: 'critical',
                            method: 'CVSSv3',
                            vector: 'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
                        }
                    ]
                }
            ],
            cweCounts: { 'CWE-123': 1 },
            sourceCounts: { 'NVD': 1 }
        };

        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={null} preComputedStats={extendedStats} />
            </SettingsProvider>
        );

        const switchBtn = screen.getByText('By Vulnerability');
        await user.click(switchBtn);

        const detailsBtn = screen.getByText('Details');
        fireEvent.click(detailsBtn);

        // Wait for panel
        expect(await screen.findByText('Vulnerability Details')).toBeInTheDocument();

        // Check Overview (Open by default)
        expect((await screen.findAllByText('CWE-123')).length).toBeGreaterThan(0);
        
        // Open Remediation & Evidence
        const remediationTrigger = screen.getAllByRole('button', { name: /Remediation & Evidence/ })[0];
        fireEvent.click(remediationTrigger);
        expect((await screen.findAllByText('Workaround')).length).toBeGreaterThan(0);
        expect((await screen.findAllByText('Do this instead')).length).toBeGreaterThan(0);

        // Open Metadata & Provenance
        const metadataTrigger = screen.getAllByRole('button', { name: /Metadata & Provenance/ })[0];
        fireEvent.click(metadataTrigger);
        expect((await screen.findAllByText('Credits')).length).toBeGreaterThan(0);
        expect((await screen.findAllByText('Security Org')).length).toBeGreaterThan(0);
        expect((await screen.findAllByText('Jane Doe')).length).toBeGreaterThan(0);
        expect((await screen.findAllByText('Extended Properties')).length).toBeGreaterThan(0);
        expect((await screen.findAllByText('custom-prop')).length).toBeGreaterThan(0);
        expect((await screen.findAllByText('custom-val')).length).toBeGreaterThan(0);

        // Already open or checked via Technical Details
        expect((await screen.findAllByText('CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')).length).toBeGreaterThan(0);
        
        // Open Affected Components
        const triggers = screen.getAllByRole('button', { name: /Affected Components/ });
        // The one in the detail panel is likely the second one.
        fireEvent.click(triggers[triggers.length - 1]);
        
        expect((await screen.findAllByText(/affected/i)).length).toBeGreaterThanOrEqual(3); // One in list, one in trigger, one in details row, plus any in print view
    });
    it('should filter by severity when clicking KPI cards', async () => {
        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={{ components: [] }} preComputedStats={mockStats} />
            </SettingsProvider>
        );

        // Find and click the 'Critical' KPI card
        const criticalText = screen.getByText('Immediate action');
        const criticalCard = criticalText.closest('[data-slot="card"]');
        if (!criticalCard) throw new Error('Critical card not found');
        
        await userEvent.click(criticalCard);

        expect(screen.getByText('lodash')).toBeInTheDocument();
        expect(screen.getByText('express')).toBeInTheDocument();
        expect(screen.queryByText('axios')).not.toBeInTheDocument();

        // Click again to toggle off
        await userEvent.click(criticalCard);
        expect(screen.getByText('axios')).toBeInTheDocument();
    });

    it('should filter by severity when selecting from dropdown', async () => {
        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={{ components: [] }} preComputedStats={mockStats} />
            </SettingsProvider>
        );

        // In the mock, the content is always present or at least easily accessible
        // Select Critical - in our mock we click the div
        // Use a more specific selector to avoid the table header which also says 'Critical'
        const dropdownContents = screen.getAllByTestId('mock-dropdown-content');
        const filterDropdown = dropdownContents.find(d => within(d).queryByText('Severity'));
        if (!filterDropdown) throw new Error('Filter dropdown not found');
        const criticalOption = within(filterDropdown).getByText('Critical');
        await userEvent.click(criticalOption);

        // Check if only lodash and express (have critical) are shown, axios (only high/medium) is hidden
        expect(screen.getByText('lodash')).toBeInTheDocument();
        expect(screen.getByText('express')).toBeInTheDocument();
        expect(screen.queryByText('axios')).not.toBeInTheDocument();

        // Check badge count on filter button
        const filterBtnAfter = screen.getByTestId('severity-filter-button');
        expect(within(filterBtnAfter).getByText('1')).toBeInTheDocument(); // Badge count
    });

    it('should clear all filters when clicking Clear button', async () => {
        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={{ components: [] }} preComputedStats={mockStats} />
            </SettingsProvider>
        );

        const criticalText = screen.getByText('Immediate action');
        const criticalCard = criticalText.closest('[data-slot="card"]');
        if (!criticalCard) throw new Error('Critical card not found');
        await userEvent.click(criticalCard);
        
        expect(screen.queryByText('axios')).not.toBeInTheDocument();

        const clearBtn = screen.getByText(/clear/i);
        await userEvent.click(clearBtn);

        expect(screen.getByText('axios')).toBeInTheDocument();
    });

    it('should trigger export when selecting a platform from dropdown', async () => {
        render(
            <SettingsProvider>
                <VulnerabilitiesView sbom={{ components: [] }} preComputedStats={mockStats} />
            </SettingsProvider>
        );

        const exportBtn = screen.getByTestId('export-button');
        expect(exportBtn).toBeInTheDocument();

        // In the mock dropdown, we click the item directly
        // We have two dropdown contents now (Filter and Export)
        const dropdownContents = screen.getAllByTestId('mock-dropdown-content');
        const exportDropdown = dropdownContents.find(d => within(d).queryByText('Ticket Systems'));
        if (!exportDropdown) throw new Error('Export dropdown not found');
        const jiraOption = within(exportDropdown).getByText('Export for Jira');
        await userEvent.click(jiraOption);

        expect(generateTicketCSV).toHaveBeenCalled();
        expect(downloadCSV).toHaveBeenCalledWith("mock-csv", expect.stringContaining("jira"));
    });
});
