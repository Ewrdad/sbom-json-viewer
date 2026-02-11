# SBOM Viewer - User Guide

## Overview

This SBOM Viewer provides an interactive, hierarchical view of CycloneDX Software Bill of Materials with full support for vulnerabilities, licenses, and nested dependencies.

## Features

### ✨ Core Features

- **Nested Dependency Tree**: View components and their dependencies with infinite scrolling
- **Vulnerability Tracking**: Separate display of direct vs. inherited vulnerabilities
- **Severity-Based Coloring**: Color-coded badges for Critical, High, Medium, and Low vulnerabilities
- **Interactive CVE Links**: Click vulnerability badges to view official NVD details
- **License Display**: View licenses for each component
- **Interactive Expansion**: Expand/collapse dependencies on demand
- **Large SBOM Support**: Capable of rendering 20,000+ components smoothly

### 🎯 Vulnerability Display

- **Critical** (Red badge): Highest severity vulnerabilities
- **High** (Default badge): High severity vulnerabilities
- **Medium** (Secondary badge): Medium severity vulnerabilities
- **Low** (Outline badge): Low severity vulnerabilities
- Shows **direct vulnerabilities** (inherent to the component)
- Shows **inherited vulnerabilities** (from dependencies)
- **Clickable Badges**: Click any severity badge to open the corresponding CVE page on nvd.nist.gov

### 📦 Component Information

Each component card displays:

- Component name, version, and group
- Component type (library, application, etc.)
- BOM reference
- License information
- Dependency count
- Full component details in expandable section

## Using the Viewer

### Loading SBOMs

The viewer can load SBOMs in two ways:

1. **Simple Sample** (Button in header)
   - Small, easy-to-understand SBOM with 5 components
   - Includes example vulnerabilities
   - Perfect for testing and demonstration

2. **Full SBOM** (Button in header)
   - Loads the complete `sbom.cyclonedx.json` from the public folder
   - Real-world complexity with hundreds of components

### Navigation

#### Toolbar & Navigation

- **Search**: Filter by component name, group, version, or CVE ID.
- **Depth Switcher**: Quickly jump to specific levels:
  - **Roots**: Collapse all to top-level.
  - **L1 / L2**: Expand to 1st or 2nd level of depth.
  - **Full**: Expand all components (use with caution on huge SBOMs).
- **Reveal Threats**: specialized "Focus Mode" that filters the tree to show _only_ components with vulnerabilities (direct or transitive).

#### Expanding/Collapsing

- **Toggle**: Click the chevron or row to expand/collapse.
- **Auto-Expansion**: Smart expansion based on search results.

#### Large SBOM Handling

- **Virtualization**: The tree uses "windowing" to only render visible rows, allowing smooth scrolling even with 20k+ components.
- **Web Workers**: Parsing and formatting happen in a background thread to keep the UI responsive.

### Component Cards

#### Header Section

- **Left**: Component name with group prefix (e.g., `@babel/core`)
- **Right**: Component type badge
- **Below**: BOM reference (package URL)

#### Content Section

- **Left Panel**:
  - Vulnerability badges (expandable)
  - Component details (scrollable)
- **Right Panel** (if dependencies exist):
  - Nested dependency components
  - Recursively rendered with same features

#### Footer Section

- **Left**: Show/Hide Dependencies button (if applicable)
- **Right**: License information

## Technical Details

### Architecture

```
App.tsx
  └─ Renderer (Formatter + Loading)
      └─ SBOMComponent (Recursive)
          └─ SBOMComponent (children)
              └─ SBOMComponent (grandchildren)
```

### Data Flow

1. **Load**: Fetch JSON from `/public` folder
2. **Convert**: Transform raw JSON to CycloneDX Bom objects
3. **Format**: Build nested structure with vulnerability aggregation
4. **Render**: Recursively render component tree

### Performance Optimizations

- **Web Workers**: Heavy parsing logic runs in a background thread.
- **UI Virtualization**: `react-virtuoso` renders only the visible portion of the dependency tree.
- **Lazy Expansion**: Dependencies are computed on-the-fly or in background batches.
- **Memoized Components**: React optimization for re-renders.

## Sample SBOM Structure

The included `sample-simple.cyclonedx.json` demonstrates:

```
my-app@1.0.0 (root)
├─ express@4.18.0
│  └─ body-parser@1.20.0
├─ lodash@4.17.20 [⚠️ HIGH: CVE-2021-23337]
└─ axios@0.21.1 [⚠️ HIGH: CVE-2021-3749]
   └─ follow-redirects@1.14.0 [⚠️ MEDIUM: CVE-2022-0155]
```

## Customization

### Changing Max Depth

Edit [SBOMComponent.tsx](src/renderer/SBOMComponent/SBOMComponent.tsx):

```typescript
export const SBOMComponent = ({
  component,
  currentDepth = 0,
  maxDepth = 3, // Change this value
}: SBOMComponentProps) => {
```

### Adding New SBOM Files

1. Place your `.cyclonedx.json` file in `/public`
2. Update [App.tsx](src/App.tsx) to add a new button:

```typescript
<Button
  variant={currentFile === "your-file.cyclonedx.json" ? "default" : "outline"}
  size="sm"
  onClick={() => setCurrentFile("your-file.cyclonedx.json")}
>
  Your SBOM Name
</Button>
```

### Styling

The viewer uses:

- **Tailwind CSS**: For utility classes
- **shadcn/ui**: For component primitives
- **Custom Theme**: Defined in `index.css`

Colors can be customized in [index.css](src/index.css) via CSS variables.

## Development

### Running Locally

```bash
npm run dev
```

Opens on `http://localhost:5173`

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## Troubleshooting

### "Failed to load SBOM" Error

- Ensure your SBOM file is in the `/public` folder
- Check that the filename matches exactly (case-sensitive)
- Verify the JSON is valid CycloneDX format

### Slow Performance

- Reduce `maxDepth` prop on SBOMComponent
- Use smaller SBOMs for testing
- Check browser console for errors

### Missing Vulnerabilities

- Ensure SBOM includes `vulnerabilities` array
- Verify `affects` references match component `bom-ref` values
- Check ratings include `severity` field

## Future Enhancements

Potential additions:

- [ ] Search/filter components
- [ ] Export filtered views
- [ ] Vulnerability severity summaries
- [ ] License compliance checking
- [ ] Dependency graph visualization
- [ ] Import SBOM from URL
- [ ] Compare two SBOMs
- [ ] Generate reports

## Support

For issues or questions:

- Check the component tests for usage examples
- Review [Architecture.md](../../Architecture.md) for system design
- See [IMPLEMENTATION.md](src/renderer/Formatter/IMPLEMENTATION.md) for formatter details
