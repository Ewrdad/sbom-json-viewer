import { Button } from "@/components/ui/button";
import { Download, FileImage } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import type { SbomStats } from "@/types/sbom";

interface ReportGeneratorProps {
  stats: SbomStats;
  sbomName?: string;
}

export function ReportGenerator({ stats, sbomName = "SBOM Report" }: ReportGeneratorProps) {

  const getReportHtml = () => {
    const totalLicenseCount = Object.values(stats.licenseDistribution).reduce((a, b) => a + b, 0);
    const secureComponents = Math.max(0, stats.totalComponents - stats.allVulnerableComponents.length);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          body { 
            margin: 0; 
            padding: 0; 
            background-color: #ffffff; 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
          }
          
          .report-container {
            width: 1000px;
            padding: 40px;
            background-color: #ffffff;
            box-sizing: border-box;
          }
          
          .header {
            margin-bottom: 32px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          
          .header-left h1 { 
            font-size: 32px; 
            font-weight: 700; 
            margin: 0 0 4px 0; 
            letter-spacing: -0.025em;
            color: #0f172a; 
          }
          
          .subtitle { color: #64748b; margin: 0; font-size: 14px; }
          
          /* KPI Cards */
          .kpi-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 16px; 
            margin-bottom: 24px; 
          }
          
          .card { 
            padding: 20px; 
            border-radius: 12px; 
            background-color: #ffffff; 
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          }
          
          .card-title { 
            font-size: 13px; 
            font-weight: 500; 
            color: #64748b; 
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .card-value { 
            font-size: 24px; 
            font-weight: 700; 
            color: #0f172a; 
            margin-bottom: 4px;
          }
          
          .card-value.destructive { color: #ef4444; }
          
          .card-subtext { 
            font-size: 12px; 
            color: #94a3b8; 
          }
          
          /* Main Content Grid */
          .content-grid { 
            display: grid; 
            grid-template-columns: 4fr 3fr; 
            gap: 16px; 
            margin-bottom: 24px; 
          }
          
          .section-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 20px 0;
            color: #0f172a;
          }
          
          /* Charts and Visuals */
          .chart-container {
            height: 220px;
            width: 100%;
            display: flex;
            align-items: flex-end;
            gap: 20px;
            padding-bottom: 20px;
            box-sizing: border-box;
          }
          
          .bar-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            height: 100%;
            justify-content: flex-end;
          }
          
          .bar {
            width: 100%;
            border-radius: 4px 4px 0 0;
            min-height: 4px;
            transition: height 0.3s ease;
          }
          
          .bar-label {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
          }
          
          .bar-value {
            font-size: 11px;
            color: #0f172a;
            font-weight: 600;
          }
          
          /* License Distribution Styles */
          .license-dist {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          
          .pie-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 140px;
          }
          
          .pie-chart {
            width: 120px;
            height: 120px;
            transform: rotate(-90deg);
          }
          
          .legend-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          
          .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
          }
          
          .legend-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
          
          .legend-name { color: #334155; flex: 1; }
          .legend-pct { color: #94a3b8; margin-left: auto; }

          /* Top Licenses List */
          .top-licenses {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          
          .license-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          
          .license-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .license-name {
            font-size: 13px;
            font-weight: 500;
            color: #0f172a;
          }
          
          .license-count {
            font-size: 13px;
            font-weight: 600;
            color: #64748b;
          }
          
          .progress-bg {
            height: 6px;
            background-color: #f1f5f9;
            border-radius: 3px;
            overflow: hidden;
          }
          
          .progress-fill {
            height: 100%;
            background-color: #3b82f6;
            border-radius: 3px;
          }
          
          /* Table Styles */
          .vulnerable-section {
            margin-top: 8px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          
          th {
            text-align: left;
            padding: 12px;
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600;
            border-bottom: 1px solid #e2e8f0;
            background-color: #f8fafc;
          }
          
          td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
          }
          
          .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
            min-width: 20px;
          }
          
          .badge-critical { background-color: #fee2e2; color: #ef4444; }
          .badge-high { background-color: #ffedd5; color: #f97316; }
          .badge-medium { background-color: #fefce8; color: #eab308; }
          
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 11px; 
            color: #94a3b8; 
            border-top: 1px solid #f1f5f9; 
            padding-top: 20px; 
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <div class="header-left">
              <h1>${sbomName}</h1>
              <p class="subtitle">Security & License Overview</p>
            </div>
            <p class="subtitle">Generated: ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="kpi-grid">
            <div class="card">
              <div class="card-title">Total Components</div>
              <div class="card-value">${stats.totalComponents}</div>
              <div class="card-subtext">in current SBOM</div>
            </div>
            <div class="card">
              <div class="card-title">Vulnerability Findings</div>
              <div class="card-value destructive">${stats.totalVulnerabilities}</div>
              <div class="card-subtext">${stats.uniqueVulnerabilityCount} Unique CVEs</div>
            </div>
            <div class="card">
              <div class="card-title">Exposure Rate</div>
              <div class="card-value">${stats.exposureRate}%</div>
              <div class="card-subtext">${stats.allVulnerableComponents.length} impacted</div>
            </div>
            <div class="card">
              <div class="card-title">Secure Components</div>
              <div class="card-value">${secureComponents}</div>
              <div class="card-subtext">No known issues</div>
            </div>
          </div>

          <div class="content-grid">
            <!-- Vulnerability Severity Bar Chart -->
            <div class="card">
              <h2 class="section-title">Vulnerability Severity</h2>
              <div class="chart-container">
                ${[
                  { name: 'Critical', count: stats.vulnerabilityCounts.critical, color: '#ef4444' },
                  { name: 'High', count: stats.vulnerabilityCounts.high, color: '#f97316' },
                  { name: 'Medium', count: stats.vulnerabilityCounts.medium, color: '#eab308' },
                  { name: 'Low', count: stats.vulnerabilityCounts.low, color: '#3b82f6' }
                ].map(d => {
                  const maxCount = Math.max(
                    stats.vulnerabilityCounts.critical,
                    stats.vulnerabilityCounts.high,
                    stats.vulnerabilityCounts.medium,
                    stats.vulnerabilityCounts.low,
                    1
                  );
                  const height = (d.count / maxCount) * 100;
                  return `
                    <div class="bar-wrapper">
                      <span class="bar-value">${d.count}</span>
                      <div class="bar" style="height: ${height}%; background-color: ${d.color};"></div>
                      <span class="bar-label">${d.name}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- License Distribution Pie Chart -->
            <div class="card">
              <h2 class="section-title">License Distribution</h2>
              <div class="license-dist">
                <div class="pie-wrapper">
                  ${(() => {
                    const data = [
                      { name: "Permissive", value: stats.licenseDistribution.permissive, color: "#22c55e" },
                      { name: "Copyleft", value: stats.licenseDistribution.copyleft, color: "#ef4444" },
                      { name: "Weak Copyleft", value: stats.licenseDistribution.weakCopyleft, color: "#f97316" },
                      { name: "Proprietary", value: stats.licenseDistribution.proprietary, color: "#a855f7" },
                      { name: "Unknown", value: stats.licenseDistribution.unknown, color: "#94a3b8" },
                    ].filter(d => d.value > 0);
                    
                    if (data.length === 0) return `<div style="color:#94a3b8; font-size:13px;">No license data</div>`;
                    
                    const total = data.reduce((acc, d) => acc + d.value, 0);
                    let accumulatedAngle = 0;
                    
                    const paths = data.map(d => {
                      const percentage = d.value / total;
                      const angle = percentage * 360;
                      const startAngle = accumulatedAngle;
                      const endAngle = accumulatedAngle + angle;
                      
                      const x1 = 50 + 50 * Math.cos(Math.PI * (startAngle - 90) / 180);
                      const y1 = 50 + 50 * Math.sin(Math.PI * (startAngle - 90) / 180);
                      const x2 = 50 + 50 * Math.cos(Math.PI * (endAngle - 90) / 180);
                      const y2 = 50 + 50 * Math.sin(Math.PI * (endAngle - 90) / 180);
                      
                      const largeArcFlag = angle > 180 ? 1 : 0;
                      const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                      
                      accumulatedAngle += angle;
                      return `<path d="${pathData}" fill="${d.color}" stroke="#ffffff" stroke-width="1.5"></path>`;
                    }).join('');
                    
                    return `<svg viewBox="0 0 100 100" class="pie-chart">${paths}</svg>`;
                  })()}
                </div>
                <div class="legend-grid">
                  ${[
                    { name: "Permissive", value: stats.licenseDistribution.permissive, color: "#22c55e" },
                    { name: "Copyleft", value: stats.licenseDistribution.copyleft, color: "#ef4444" },
                    { name: "Weak Copyleft", value: stats.licenseDistribution.weakCopyleft, color: "#f97316" },
                    { name: "Proprietary", value: stats.licenseDistribution.proprietary, color: "#a855f7" },
                    { name: "Unknown", value: stats.licenseDistribution.unknown, color: "#94a3b8" },
                  ].filter(d => d.value > 0).map(d => `
                    <div class="legend-item">
                      <span class="legend-dot" style="background-color: ${d.color}"></span>
                      <span class="legend-name">${d.name}</span>
                      <span class="legend-pct">${Math.round((d.value / (totalLicenseCount || 1)) * 100)}%</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="content-grid" style="grid-template-columns: 1fr 1fr;">
             <!-- Top Licenses -->
            <div class="card">
              <h2 class="section-title">Top Licenses</h2>
              <div class="top-licenses">
                ${stats.topLicenses.slice(0, 5).map(l => {
                  const percentage = (l.count / (stats.totalComponents || 1)) * 100;
                  return `
                    <div class="license-item">
                      <div class="license-info">
                        <span class="license-name">${l.name}</span>
                        <span class="license-count">${l.count}</span>
                      </div>
                      <div class="progress-bg">
                        <div class="progress-fill" style="width: ${percentage}%;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
                ${stats.topLicenses.length === 0 ? '<p style="color:#94a3b8; font-size:13px; text-align:center; padding: 20px 0;">No license data found.</p>' : ''}
              </div>
            </div>

            <!-- Empty slot or more info -->
            <div class="card" style="border: 1px dashed #e2e8f0; background: transparent; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 13px;">
              Component vulnerability and license audit summary.
            </div>
          </div>

          <!-- Most Vulnerable Components -->
          <div class="card vulnerable-section">
            <h2 class="section-title">Most Vulnerable Components</h2>
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Version</th>
                  <th style="text-align: center;">Critical</th>
                  <th style="text-align: center;">High</th>
                  <th style="text-align: center;">Medium</th>
                  <th style="text-align: center;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${stats.vulnerableComponents.slice(0, 5).map(comp => `
                  <tr>
                    <td style="font-weight: 500;">${comp.name}</td>
                    <td style="font-family: monospace; font-size: 11px;">${comp.version}</td>
                    <td style="text-align: center;">
                      ${comp.critical > 0 ? `<span class="badge badge-critical">${comp.critical}</span>` : '-'}
                    </td>
                    <td style="text-align: center;">
                      ${comp.high > 0 ? `<span class="badge badge-high">${comp.high}</span>` : '-'}
                    </td>
                    <td style="text-align: center;">
                      ${comp.medium > 0 ? `<span class="badge badge-medium">${comp.medium}</span>` : '-'}
                    </td>
                    <td style="text-align: center; font-weight: 700;">${comp.total}</td>
                  </tr>
                `).join('')}
                ${stats.vulnerableComponents.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8; font-style: italic; padding: 32px;">No vulnerabilities detected.</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>

          <div class="footer">Generated by SBOM Viewer - Open Source Security Intelligence</div>
        </div>
      </body>
      </html>
    `;
  };


  const createReportIframe = async (): Promise<{ iframe: HTMLIFrameElement, element: HTMLElement }> => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '1200px'; // Increased width buffer
    iframe.style.height = '2000px'; // Increased height buffer
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      throw new Error("Could not access iframe document");
    }

    doc.open();
    doc.write(getReportHtml());
    doc.close();

    // Wait for content to load/render
    await new Promise(resolve => setTimeout(resolve, 100)); 

    // We capture the body or the container inside
    const element = doc.querySelector('.report-container') as HTMLElement;
    if (!element) {
        document.body.removeChild(iframe);
        throw new Error("Report container not found in iframe");
    }
    
    return { iframe, element };
  };
  
  const generateOverviewImage = async () => {
    try {
      const { iframe, element } = await createReportIframe();
      
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.offsetHeight,
        windowWidth: 1200,
        windowHeight: 2000
      });
      
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "sbom-overview.png";
      link.click();
      
      document.body.removeChild(iframe);
    } catch (err) {
      console.error("Failed to generate overview PNG:", err);
      alert("Failed to generate overview image (see console for details)");
    }
  };

  const generateOverviewReport = async () => {
    try {
      const { iframe, element } = await createReportIframe();
      
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        width: element.offsetWidth, // Explicit dimensions
        height: element.offsetHeight,
        windowWidth: 1200, // Explicit window dimensions to prevent viewport clipping (though iframe is large enough now)
        windowHeight: 2000
      });
      
      const imgData = canvas.toDataURL("image/png");
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2] // Match visual size
      });
      doc.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      doc.save("sbom-overview-report.pdf");
      
      document.body.removeChild(iframe);
    } catch (err) {
      console.error("Failed to generate overview PDF:", err);
      alert("Failed to generate overview report (see console for details)");
    }
  };

  const generateVulnerabilitiesReport = () => {
    const doc = new jsPDF();
    doc.text("Vulnerabilities Report", 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 25);
    
    const tableData = stats.allVulnerableComponents.map(v => [
      v.name,
      v.version,
      v.critical,
      v.high,
      v.medium,
      v.low
    ]);

    autoTable(doc, {
      head: [["Component", "Version", "Critical", "High", "Medium", "Low"]],
      body: tableData,
      startY: 30,
      headStyles: { fillColor: [220, 38, 38] }, // Red header
    });

    doc.save("sbom-vulnerabilities-report.pdf");
  };

  const generateLicensesReport = () => {
    const doc = new jsPDF();
    doc.text("Licenses Report", 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 25);

    const tableData = stats.topLicenses.map(l => [l.name, l.count]);

    autoTable(doc, {
      head: [["License", "Count"]],
      body: tableData,
      startY: 30,
      headStyles: { fillColor: [37, 99, 235] }, // Blue header
    });

    doc.save("sbom-licenses-report.pdf");
  };

  return (
    <div className="flex flex-col gap-4 mt-8">
      <div className="flex flex-wrap gap-2">
        <Button onClick={generateOverviewReport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Overview PDF
        </Button>
        <Button onClick={generateOverviewImage} variant="outline" className="gap-2">
          <FileImage className="h-4 w-4" />
          Overview PNG
        </Button>
        <Button onClick={generateVulnerabilitiesReport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Vulnerabilities List
        </Button>
        <Button onClick={generateLicensesReport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Licenses List
        </Button>
      </div>
    </div>
  );
}
