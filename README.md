# SBOM Viewer

A high-performance, interactive viewer for CycloneDX Software Bill of Materials (SBOM) files. Visualize dependencies, track vulnerabilities, and analyze license compliance with ease.

## ✨ Key Features

- **Nested Dependency Tree**: Explore component hierarchies with infinite-scroll virtualization.
- **Vulnerability Tracking**:
  - Real-time aggregation of direct and transitive vulnerabilities.
  - Severity-based coloring (Critical, High, Medium, Low).
  - **Interactive CVE Links**: Click badges to view official NVD/CVE details.
- **Performance Optimized**:
  - Handles **20,000+ components** smoothly using **Web Workers** and **Virtualization**.
  - Background processing ensures the UI never freezes.
- **Advanced Navigation**:
  - **Depth Switcher**: Quickly jump between dependency levels (Roots, L1, L2, Full).
  - **Focus Mode**: "Reveal Threats" button to filter the tree to only vulnerable paths.
  - **Smart Toolbar**: Search by name, group, or CVE ID.
- **Data Privacy**: Client-side only processing. Your SBOM data never leaves your browser.

## 🚀 Quick Start

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Run Locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

3. **Load an SBOM**
   - Click "Simple Sample" for a quick demo.
   - Click "Huge SBOM" to test performance.
   - Or upload your own `.json` CycloneDX file.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui, Lucide Icons
- **Visualization**: React Virtuoso (Virtualization), Mermaid.js (Graphs)
- **Data**: Web Workers for background parsing
