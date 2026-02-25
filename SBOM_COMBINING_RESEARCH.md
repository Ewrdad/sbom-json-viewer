# Research: Combining Multiple SBOMs and Vulnerability Data

## Overview

This document outlines research findings on how to combine multiple Software Bill of Materials (SBOMs), such as merging author details from an npm CycloneDX SBOM with vulnerability reporting from Trivy or Grype, and deduplicating the results.

## Existing CLI Tools & "Pre-Processing" Approaches

If the goal is to merge SBOMs _before_ loading them into the dashboard, several tools exist:

1. **CycloneDX CLI (`cyclonedx-cli merge`)**:
   - Merges multiple CycloneDX XML/JSON files into a single BOM.
   - _Limitation_: It does a structural merge but might not natively deduplicate components with the exact same data, potentially requiring extra tools (like `jq` scripts) or precise configurations to ensure uniqueness.
2. **Hoppr (`hopctl merge`)**:
   - Performs a "deep merge" of CycloneDX SBOMs.
   - Can flatten nested components and uses a custom hashing method to define equality rules, effectively deduplicating.
3. **Pipeline Enrichment (Trivy / Grype)**:
   - Instead of generating two separate SBOMs and merging them, you can generate an initial SBOM (e.g., via `@cyclonedx/cyclonedx-npm` to get rich author/metadata), and then **pass that SBOM into Trivy or Grype**.
   - `trivy sbom input-npm.cdx.json --format cyclonedx --output enriched.cdx.json`: This retains your component metadata (authors, etc.) but appends the vulnerability arrays and remediation advice.
   - `grype sbom:input-npm.cdx.json -o cyclonedx > enriched.cdx.json`: Does the same but with Grype's vulnerability database.

## Dashboard-Level Aggregation ("Runtime" Approach)

If you want the dashboard itself to handle loading multiple distinct files (e.g., `npm.cdx.json`, `trivy.cdx.json`, `grype.cdx.json`) and merge them dynamically:

### The deduplication key: Package URL (`purl`)

To properly deduplicate and merge components from different sources, use the **`purl`** (Package URL) property.
Example PURL: `pkg:npm/express@4.17.1`

### Suggested Dashboard Splicing Logic

1. **Load Base SBOM**:
   - Import the primary SBOM (e.g., the `npm` SBOM with author data).
   - Create an in-memory map of components keyed by their `purl`.
2. **Merge Vulnerability Data**:
   - Iterate through secondary SBOMs (e.g., Trivy, Grype reports).
   - For each vulnerability found, check the `affects` array (which usually references component `bom-ref`s, which map to components with a `purl`).
   - Match the target `purl` from the vulnerability report with the `purl` in the Base SBOM.
   - Append the vulnerability to the Base SBOM's component.
3. **Deduplicate Vulnerabilities**:
   - When merging Trivy and Grype vulnerabilities, deduplicate based on the vulnerability ID (e.g., `CVE-2021-32838` or `GHSA-wx8q-...`).
   - If a vulnerability ID already exists on the component, merge the supplemental data: Grype might provide a better description, while Trivy might provide better `remediation` or `fixed_version` fields.

## Guidance for AI Agents

- **To implement a UI for this**: Create a new "Merge / Compare SBOMs" view that allows uploading multiple files.
- **For data structures**: Extend the internal `SBOM` type parsing to gracefully combine the `vulnerabilities` array across overlapping `purl`s.
- **Deduplication strategy**:
  - Components: `purl` match.
  - Vulnerabilities: `id` (CVE/GHSA) match.
  - Metadata: Prefer the value that is most populated, or use defined precedence (e.g. `npm` native SBOM > `syft` > `trivy` for component metadata).
