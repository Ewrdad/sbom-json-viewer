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

## Granular Error Resilience & Community Branding (2026-03-01)

Implemented a more robust error handling architecture and refined the application's personal branding and community integration.

### Key Concepts

- **Granular Error Isolation**: Transitioned from a single global error boundary to a multi-layered approach.
  - **Component Level**: The sidebar's community feed and main view container now have their own `ErrorBoundary` instances.
  - **Resilience**: A failure in a non-critical section (like an RSS feed fetch error or a specific chart rendering bug) no longer crashes the entire application shell or navigation.
  - **UX**: The enhanced `ErrorBoundary` provides clear "Section Rendering Error" feedback with a "Retry" button and technical details for debugging.
- **Strategic Branding & Community Integration**:
  - **Visual Hierarchy**: Moved technical versioning and personal credits to the top header to establish clear ownership and "live" status immediately upon load.
  - **Design Contrast**: Used a vibrant Sky Blue (`sky-400`) for the "Ewrdad's Latest" section to differentiate community content from the primary utility-focused gray/muted sidebar theme.
  - **Animated Feedback**: Added a pulse indicator and hover-triggered slide animations to the RSS card to make the sidebar feel more "alive" and interactive.

### Technical Implementation

- **Enhanced ErrorBoundary**:
  - Added support for `description`, `className`, and `resetKeys` to make the boundary highly reusable across different UI contexts (e.g., small sidebar cards vs. large dashboard charts).
  - Integrated `lucide-react` icons and "Revamped" styling to ensure error states feel like a first-class part of the application design.
- **Substack RSS Integration**:
  - Used a public CORS proxy (`allorigins.win`) to fetch the XML feed in a zero-backend environment.
  - Implemented `DOMParser` to extract the single latest post title and link, ensuring the feed remains focused and minimal.
- **Automated Versioning**:
  - Imported the `version` directly from `package.json` into the UI components. This eliminates manual "version drift" and ensures the displayed version always matches the project metadata.

### UI/UX Best Practices

- **Color as a Signal**: Using a lighter blue for community updates ensures they stand out on a dark background without clashing with the primary action colors.
- **Reducing "Awkward" Gaps**: Tightened vertical spacing in the sidebar's data management section to create a more cohesive "toolbox" feel.
- **Transparency in Error Handling**: Providing an expandable "Technical Details" section in the error boundary helps developers and advanced users diagnose issues without cluttering the main UI for casual users.

## General Development Learnings

- **Strict Mode in Playwright**: When multiple elements share the same text (e.g., in a KPI card and a table), `getByText` will fail. Use more specific locators or `first()`/`nth()` if the order is guaranteed.
- **TS Record Completeness**: When adding a new view, ensure all exhaustive `Record<ViewType, string>` maps (like `viewLabels` in `Breadcrumbs.tsx`) are updated to avoid build failures.
- **Unused Imports**: Production builds (`tsc -b`) will fail on unused imports or variables if `noUnusedLocals` or `noUnusedParameters` is enabled. Always clean up after refactoring.

- **Responsive Table Layouts with TanStack Table**:
  - **Fixed Width Restriction**: Avoid using `getCenterTotalSize()` as a fixed pixel width on the `<table>` element if the goal is for the table to fill its container. This often leads to "dead space" on the right for smaller datasets or larger screens.
  - **Flexible Expansion**: Use `minWidth: '100%'` and `tableLayout: 'fixed'` on the table, while providing sensible `size` values for columns. This allows the browser to expand columns proportionally to fill the container while still respecting relative column weights and ensuring consistent truncation.
