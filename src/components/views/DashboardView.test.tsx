import { render, screen, within } from '@testing-library/react';
import { DashboardView } from './DashboardView';
import { describe, it, expect, vi } from 'vitest';
import { Bom, Component } from '@cyclonedx/cyclonedx-library/Models';

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

import { ComponentType } from "@cyclonedx/cyclonedx-library/Enums";

describe('DashboardView', () => {
    it('should render KPI cards correctly', () => {
        const sbom = new Bom();
        const c1 = new Component(ComponentType.Library, 'c1');
        const c2 = new Component(ComponentType.Library, 'c2');
        sbom.components.add(c1);
        sbom.components.add(c2);
        
        render(<DashboardView sbom={sbom} />);

        // Check for 'Total Components' card value
        const titleElement = screen.getByText('Total Components');
        const card = titleElement.closest('[data-slot="card"]'); // Shadcn card specific
        // Fallback if data-slot is not available (some versions use just classes)
        // But we saw data-slot in error output.
        
        expect(card).toBeInTheDocument();
        if (card) {
            expect(within(card as HTMLElement).getByText('2')).toBeInTheDocument();
        }
    });
});
