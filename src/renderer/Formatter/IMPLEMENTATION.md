# Formatter Implementation

## Overview

The Formatter transforms a raw CycloneDX SBOM into a nested, hierarchical structure suitable for tiered rendering with vulnerability tracking.

## Key Features

### 1. Nested Component Structure

- Components are organized hierarchically based on their dependency relationships
- Each component includes all its dependencies fully replicated (no references)
- If a component is used multiple times, it appears in full in each location

### 2. Vulnerability Tracking

Each component tracks two types of vulnerabilities:

#### Inherent Vulnerabilities

Direct vulnerabilities affecting the component itself, categorized by severity:

- Critical
- High
- Medium
- Low
- Informational

#### Transitive Vulnerabilities

Vulnerabilities inherited from all dependencies (recursively aggregated), also categorized by severity.

### 3. Statistics Extraction

The formatter extracts global statistics:

- **Unique Licenses**: All unique licenses across all components
- **Unique Vulnerabilities**: All unique vulnerabilities categorized by severity

## Implementation Details

### Component Resolution

1. **Build Component Map**: Creates a Map of all components keyed by their `bom-ref`
2. **Build Dependency Map**: Extracts dependencies from each component's `dependencies` property
3. **Identify Top-Level Components**: Finds components that are not dependencies of others
4. **Recursive Building**: Recursively builds nested structure starting from top-level components

### Circular Dependency Handling

- Tracks visited components in the current path
- Skips components already visited in the current traversal path
- Prevents infinite recursion while allowing component replication across different branches

### Progress Tracking

The formatter provides detailed progress updates:

- 0-10%: Initialization and statistics extraction
- 10-35%: Building maps and identifying top-level components
- 35-90%: Building nested component structures
- 90-100%: Finalization and deduplication

### Vulnerability Categorization

Vulnerabilities are categorized by:

1. Checking if the vulnerability affects the component (via `affects` property)
2. Extracting severity from the first rating
3. Normalizing severity to match standard categories
4. Deduplicating transitive vulnerabilities by ID

## Data Flow

```
Raw SBOM (CycloneDX)
    ↓
Extract Statistics (licenses, vulnerabilities)
    ↓
Build Maps (components, dependencies)
    ↓
Identify Top-Level Components
    ↓
Recursive Build (with vulnerability aggregation)
    ↓
Deduplicate Transitive Vulnerabilities
    ↓
Formatted SBOM (nested structure)
```

## Type Compatibility

### CycloneDX Library Types

The implementation works with CycloneDX library's special repository types:

- `ComponentRepository`: Set-like collection of components (iterable)
- `VulnerabilityRepository`: Set-like collection of vulnerabilities (iterable)
- `BomRefRepository`: Set-like collection of bom references (iterable)
- `LicenseRepository`: Set-like collection of licenses (iterable)

These are not plain arrays but extend `SortableComparables<T>` and implement Set interface.

## Usage Example

```typescript
const formattedSBOM = await Formatter({
  rawSBOM: myCycloneDXBom,
  setProgress: (progress) => {
    console.log(`${progress.progress}%: ${progress.message}`);
  },
});

// Access top-level components
formattedSBOM.components.forEach((component) => {
  console.log(component.name);

  // Check inherent vulnerabilities
  const criticalVulns = component.vulnerabilities.inherent.Critical;

  // Check transitive vulnerabilities
  const transitiveVulns = component.vulnerabilities.transitive.High;

  // Access nested dependencies
  component.formattedDependencies.forEach((dep) => {
    // Each dependency is fully replicated
    console.log(dep.name, dep.vulnerabilities);
  });
});
```

## Why Components are Replicated

Components are fully replicated rather than referenced because:

1. **Simplifies Rendering**: Each component subtree is self-contained
2. **Vulnerability Context**: Each instance can show vulnerabilities in its specific context
3. **Independent Expansion**: Users can expand/collapse different instances independently
4. **Consistent Structure**: No need to resolve references during rendering

The trade-off is increased memory usage, but this is acceptable for typical SBOM sizes and provides a much better user experience.
