# SBom Viewer Design Documentation

This document outlines the UI/UX principles and design patterns for the SBom Viewer application. All development must adhere to these guidelines to ensure a consistent and high-quality user experience.

## Core UI Principles

### 1. Principle of Effort = Detail
The amount of information displayed should be proportional to the user's level of engagement (effort).
- **Level 1 (Immediate):** Stats and high-level charts (Dashboard).
- **Level 2 (Hover):** Tooltips and data labels (Charts, Icons).
- **Level 3 (Focus):** Table rows and basic metadata.
- **Level 4 (Action/Click):** Resizable detail panels on the right side.
- **Level 5 (Deep Dive):** Accordions within detail panels for raw JSON, VEX assessments, and technical analysis.

### 2. Relevant Clustering
Group information based on the user's **intent**, not just the SBOM data structure.
- **Vulnerabilities:** Cluster by Component (impact-centric) or by Vulnerability ID (security-centric).
- **Metadata:** Show provenance (where it came from) alongside findings to build trust.
- **Hierarchy:** Always show the parent/child relationship in dependency views.
- **Interactive Navigation:** KPI cards and charts must be clickable, acting as "Fast Paths" to filtered views (e.g., clicking "Critical" jumps to a filtered list).

### 3. Predictability & Consistency
Users should never be surprised by how an element behaves.
- **Smart Pathing:** Long file paths in tables/trees should be shortened to relative paths or file-name-only, with full paths available on hover.
- **Severity Colors:** 
  - **Critical:** #dc2626 (Red)
  - **High:** #ea580c (Orange)
  - **Medium:** #ca8a04 (Yellow)
  - **Low:** #2563eb (Blue)
  - **None/Fixed:** #16a34a (Green)
- **Actions:** "Details" buttons should always open a panel on the right. "Download" should always trigger a file save.
- **Icons:** Use Lucide-react consistently (e.g., `ShieldAlert` for security issues).

### 4. Users are Lazy (Efficiency)
Front-load the most critical data and reduce the number of clicks needed to achieve a goal.
- **KPI Cards:** Provide at-a-glance summaries of the entire SBOM state.
- **Search & Filter:** Always visible and scoped to the current view.
- **Export:** One-click exports for common ticket systems (Jira, GitHub).

## Technical Implementation Patterns

### View Management
- Use `KeepAliveView` to persist view-specific state (like scroll position) when switching between views.
- **Keyboard Navigation:** `Alt + 1-9` allows instant switching between primary views.
- **Breadcrumbs:** A global `Breadcrumbs` component tracks the active view and selection path.

### Search & Discovery
- **Global Search (Cmd+K):** A centralized command palette for finding components and vulnerabilities.
- **Drill-down:** KPI cards and charts should always be interactive, providing a "Fast Path" to filtered lists.

### Detail Panels
- Use `ResizablePanel` from `shadcn/ui` to allow users to control the balance between the list and the details.
- Detail panels are global and persist across views via `SelectionContext`.
- **Vulnerability Context:** Always show the shortest "Path to Root" for transitive findings.

### State Management
- **SbomContext:** Global access to the loaded SBOM, its formatted structure, and computed statistics.
- **SelectionContext:** Manages globally selected components, vulnerabilities, and licenses.
- **ViewContext:** Manages active view and multi-SBOM mode.
- **VexContext:** Manages vulnerability assessments and overrides.
- **SettingsContext:** Manages user preferences (dark mode, high contrast, search engines).

### Accessibility & Scannability
- **High Contrast Mode:** A global CSS override (`.high-contrast`) for improved visibility.
- **Visual Cues:** Use background tinting (low-opacity reds/oranges) to highlight high-severity rows in tables and "Heatmap" nodes in trees.
- **Progress Feedback:** Use shimmer skeletons during lazy-loading or background analysis to maintain layout stability.

### Actionable Context
- **Cross-Linking:** Analytical tables (like Risk or Dashboard) should provide direct "Jump" icons to primary data views (Explorer, Tree).
- **ID Persistence:** Selecting an ID (CVE, PURL) in one view must highlight it in all other views via `SelectionContext`.

### Multi-Source Transparency
- **Origin Badges:** When multiple SBOMs are loaded, every component and vulnerability must display its origin scanner (e.g., "via Syft").
- **Consensus Metrics:** Highlight findings that are confirmed by multiple scanners to increase user trust.

## Future Work & Recommendations
Refer to the latest UI Audit in `/InternalAudit/UI/` for specific actionable improvements.
