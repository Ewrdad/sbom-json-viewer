import { describe, it, expect } from "vitest";
import { generateTicketCSV } from "./ticketExportUtils";

describe("ticketExportUtils", () => {
  const mockVulnerabilities = [
    {
      id: "CVE-2024-001",
      severity: "Critical",
      recommendation: "Update to v2",
      title: "Buffer overflow",
      source: { name: "NVD" },
      ratings: [{ score: 9.8 }],
    },
    {
      id: "CVE-2024-002",
      severity: "High",
      recommendation: "Set config X",
      description: "Insecure default",
      source: { name: "GitHub" },
      ratings: [{ score: 7.5 }],
    },
  ];

  const mockComponents = [
    {
      name: "lodash",
      version: "4.17.20",
      critical: 2,
      high: 1,
      medium: 0,
      low: 0,
      total: 3,
    },
  ];

  describe("generateTicketCSV", () => {
    it("generates correct headers for Jira", () => {
      const csv = generateTicketCSV([], "vulnerabilities", "Jira");
      expect(csv).toContain('"Summary","Description"');
    });

    it("generates correct headers for GitLab", () => {
      const csv = generateTicketCSV([], "vulnerabilities", "GitLab");
      expect(csv).toContain('"Title","Description"');
    });

    it("generates correct headers for GitHub", () => {
      const csv = generateTicketCSV([], "vulnerabilities", "GitHub");
      expect(csv).toContain('"Title","Body"');
    });

    it("formats vulnerability mode rows correctly", () => {
      const csv = generateTicketCSV([mockVulnerabilities[0]], "vulnerabilities", "Generic");
      expect(csv).toContain('"Fix CVE-2024-001 (Critical - 9.8)"');
      expect(csv).toContain('## Remediation\nUpdate to v2');
      expect(csv).toContain('## Description\nBuffer overflow');
      expect(csv).toContain('## Source\nNVD');
    });

    it("formats component mode rows correctly", () => {
      const csv = generateTicketCSV([mockComponents[0]], "components", "Generic");
      expect(csv).toContain('"Fix lodash (2Critical, 1High, 0Medium, 0Low)"');
      expect(csv).toContain('Component: lodash');
      expect(csv).toContain('Version: 4.17.20');
    });

    it("escapes double quotes in content", () => {
      const data = [{ id: 'CVE-"123"', severity: 'High' }];
      const csv = generateTicketCSV(data, "vulnerabilities", "Generic");
      expect(csv).toContain('CVE-""123""');
    });
  });
});
