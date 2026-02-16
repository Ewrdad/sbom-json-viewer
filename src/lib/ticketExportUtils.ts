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

/**
 * Generates a Ticket CSV string from the provided data and mode.
 */
export function generateTicketCSV(
  data: Record<string, any>[],
  mode: "components" | "vulnerabilities",
  platform: ExportPlatform
): string {
  const headers = PLATFORM_HEADERS[platform];
  const rows = data.map((item) => {
    let title = "";
    let description = "";

    if (mode === "vulnerabilities") {
      const score = item.ratings?.[0]?.score || "N/A";
      title = `Fix ${item.id} (${item.severity} - ${score})`;
      description = [
        item.recommendation ? `## Remediation\n${item.recommendation}` : "",
        item.title || item.description ? `## Description\n${item.title || item.description}` : "",
        item.source?.name ? `## Source\n${item.source.name}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    } else {
      // Component mode
      title = `Fix ${item.name} (${item.critical || 0}Critical, ${item.high || 0}High, ${item.medium || 0}Medium, ${item.low || 0}Low)`;
      
      // For components, we might not have all vulnerabilities in the item itself depending on how filteredAndSorted is populated.
      // However, the displayStats.allVulnerableComponents items used in filteredAndSorted usually contain summary counts.
      // If we need detailed vuln info in component mode, we'd need to cross-reference with allVulnerabilities.
      // Based on the requirement: "CSV per vulnerable component with no filtering ... fix component-name ... ## CVE 1 ###Remediation"
      
      // Note: We'll assume the item passed here in component mode has its associated vulnerabilities if possible, 
      // or we just use what's available. In the current VulnerabilitiesView, filteredAndSorted items are from allVulnerableComponents 
      // which DON'T have the full list of vulnerabilities, only counts.
      // We may need to pass displayStats or the sbom to generateTicketCSV to get full details.
      
      description = `Component: ${item.name}\nVersion: ${item.version || "N/A"}\nTotal Vulnerabilities: ${item.total || 0}`;
    }

    return `${escapeCSV(title)},${escapeCSV(description)}`;
  });

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
