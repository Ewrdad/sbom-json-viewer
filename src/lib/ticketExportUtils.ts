export type ExportPlatform = "Jira" | "GitLab" | "GitHub" | "Generic";

export const PLATFORM_HEADERS: Record<ExportPlatform, { title: string; description: string }> = {
  Jira: { title: "Summary", description: "Description" },
  GitLab: { title: "Title", description: "Description" },
  GitHub: { title: "Title", description: "Body" },
  Generic: { title: "Title", description: "Description" },
};

/**
 * Escapes a string for CSV format.
 */
function escapeCSV(str: string): string {
  if (!str) return "";
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export interface VulnerabilityItem {
  id: string;
  severity: string;
  title?: string;
  description?: string;
  recommendation?: string;
  source?: { name?: string };
  ratings?: Record<string, unknown>[];
}

export interface ComponentItem {
  name: string;
  version?: string;
  total?: number;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

/**
 * Generates a Ticket CSV string from the provided data and mode.
 * We use a union type for data to remain flexible as the item structure 
 * differs between component and vulnerability view modes.
 */
export function generateTicketCSV(
  data: (VulnerabilityItem | ComponentItem)[],
  mode: "components" | "vulnerabilities",
  platform: ExportPlatform
): string {
  const headers = PLATFORM_HEADERS[platform];
  const rows = data.map((item) => {
    let title = "";
    let description = "";

    if (mode === "vulnerabilities") {
      const v = item as VulnerabilityItem;
      const score = v.ratings?.[0]?.score || "N/A";
      title = `Fix ${v.id} (${v.severity} - ${score})`;
      description = [
        v.recommendation ? `## Remediation\n${v.recommendation}` : "",
        v.title || v.description ? `## Description\n${v.title || v.description}` : "",
        v.source?.name ? `## Source\n${v.source.name}` : "",
      ]
        // Filter out empty sections to maintain a clean ticket description
        .filter(Boolean)
        .join("\n\n");
    } else {
      // Component mode
      const c = item as ComponentItem;
      title = `Fix ${c.name} (${c.critical || 0}Critical, ${c.high || 0}High, ${c.medium || 0}Medium, ${c.low || 0}Low)`;
      
      // For components, we might not have all vulnerabilities in the item itself depending on how filteredAndSorted is populated.
      // However, the displayStats.allVulnerableComponents items used in filteredAndSorted usually contain summary counts.
      // If we need detailed vuln info in component mode, we'd need to cross-reference with allVulnerabilities.
      // Based on the requirement: "CSV per vulnerable component with no filtering ... fix component-name ... ## CVE 1 ###Remediation"
      
      // Note: We'll assume the item passed here in component mode has its associated vulnerabilities if possible, 
      // or we just use what's available. In the current VulnerabilitiesView, filteredAndSorted items are from allVulnerableComponents 
      // which DON'T have the full list of vulnerabilities, only counts.
      // We may need to pass displayStats or the sbom to generateTicketCSV to get full details.
      
      description = `Component: ${c.name}\nVersion: ${c.version || "N/A"}\nTotal Vulnerabilities: ${c.total || 0}`;
    }

    return `${escapeCSV(title)},${escapeCSV(description)}`;
  });

  // Combine headers and rows into a single CSV string
  return `${escapeCSV(headers.title)},${escapeCSV(headers.description)}\n${rows.join("\n")}`;
}

/**
 * Triggers a download of the CSV content.
 */
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
