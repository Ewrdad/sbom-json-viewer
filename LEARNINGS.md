# Learnings - SBOM Viewer

## Supply Chain Risk Analysis (2026-02-28)

Implemented a new "Supply Chain Risk" view to help users prioritize remediation efforts.

### Key Concepts

- **Risk Score calculation**: We developed a composite metric: `(VulnerabilityScore * (1 + BlastRadius/100)) + LicensePenalty + CentralityWeight`.
  - **Vulnerability Score**: Weighted by severity (Critical: 10, High: 5, Medium: 2, Low: 0.5).
  - **Impact Multiplier**: Uses Blast Radius (total transitive dependents) to scale the security risk. This correctly identifies that a vulnerability in a core utility (like `lodash`) is riskier than one in a leaf component.
  - **Compliance Risk**: Penalties for Copyleft or Unknown licenses.
- **Risk Exposure Matrix**: A scatter plot visualizing the relationship between Impact (Blast Radius) and Security Risk (Vuln Score). This helps users identify "high-impact, high-risk" outliers in the top-right quadrant.

### Technical Implementation

- **Lazy Loading**: Integrated the new view with React's `Suspense` and `lazy` to maintain small initial bundle size.
- **KeepAliveView**: Wrapped the view in `KeepAliveView` to preserve search and filter state when the user navigates between views.
- **Responsive Charts**: Used `recharts` with a customized theme to match the app's aesthetic.
- **Unit Testing**: Verified the risk calculation logic with edge cases (no vulns, multiple vulns, varying blast radius).
- **E2E Testing**: Verified the navigation flow and search/filter functionality in the leaderboard.

### UI/UX Best Practices

- **Effort = Detail**: KPI cards provide high-level stats, the Matrix provides a visual map, and the Leaderboard provides actionable details.
- **Predictability**: Used consistent severity colors and icons (`AlertTriangle`, `Target`, `ShieldAlert`) to match the rest of the application.
- **Efficiency**: Included a search filter in the leaderboard to allow quick lookup of specific components.

## General Development Learnings

- **Strict Mode in Playwright**: When multiple elements share the same text (e.g., in a KPI card and a table), `getByText` will fail. Use more specific locators or `first()`/`nth()` if the order is guaranteed.
- **TS Record Completeness**: When adding a new view, ensure all exhaustive `Record<ViewType, string>` maps (like `viewLabels` in `Breadcrumbs.tsx`) are updated to avoid build failures.
- **Unused Imports**: Production builds (`tsc -b`) will fail on unused imports or variables if `noUnusedLocals` or `noUnusedParameters` is enabled. Always clean up after refactoring.
