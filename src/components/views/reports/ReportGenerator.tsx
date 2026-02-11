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
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, sans-serif; }
          .report-container {
            width: 800px;
            padding: 40px;
            background-color: #ffffff;
            color: #0f172a;
            border: 1px solid #e2e8f0;
            box-sizing: border-box;
          }
          .header {
            margin-bottom: 32px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 16px;
          }
          h1 { font-size: 32px; font-weight: 700; margin: 0 0 8px 0; line-height: 1.2; color: #1e293b; }
          .subtitle { color: #64748b; margin: 0; font-size: 14px; }
          
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
          .card { padding: 24px; border-radius: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; }
          h2 { font-size: 18px; font-weight: 600; margin: 0 0 20px 0; color: #334155; }
          
          .summary-stat { margin-bottom: 16px; }
          .summary-label { font-size: 14px; color: #64748b; margin-bottom: 4px; display: block; }
          .summary-value { font-size: 24px; font-weight: 700; color: #0f172a; }
          .summary-value.red { color: #dc2626; }
          
          /* Severity Bars */
          .severity-item { margin-bottom: 16px; }
          .severity-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
          .severity-label { font-weight: 500; }
          .severity-count { font-weight: 600; }
          .progress-track { height: 8px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden; }
          .progress-bar { height: 100%; border-radius: 4px; }
          
          /* Licenses */
          .license-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
          .pie-chart-container { display: flex; justify-content: center; align-items: center; }
          .pie-chart {
             width: 140px; height: 140px; 
             transform: rotate(-90deg); /* Start at top */
          }
          .legend { font-size: 13px; }
          .legend-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
          .legend-dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; display: inline-block; }
          .legend-name { color: #334155; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 8px; }
          .legend-count { font-weight: 600; color: #0f172a; }

          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <h1>${sbomName}</h1>
            <p class="subtitle">Generated Report - ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="grid">
            <!-- Summary Stats -->
            <div class="card">
              <h2>Overview</h2>
              <div class="summary-stat">
                <span class="summary-label">Total Components</span>
                <span class="summary-value">${stats.totalComponents}</span>
              </div>
              <div class="summary-stat">
                <span class="summary-label">Total Vulnerabilities</span>
                <span class="summary-value red">${stats.totalVulnerabilities}</span>
              </div>
              <!-- Exposure rate removed -->
            </div>

            <!-- Severity Breakdown -->
            <div class="card">
              <h2>Severity Breakdown</h2>
              <div class="severity-item">
                <div class="severity-header">
                  <span class="severity-label" style="color: #dc2626">Critical</span>
                  <span class="severity-count">${stats.vulnerabilityCounts.critical}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-bar" style="width: ${stats.totalVulnerabilities > 0 ? (stats.vulnerabilityCounts.critical / stats.totalVulnerabilities * 100) : 0}%; background-color: #dc2626;"></div>
                </div>
              </div>
              <div class="severity-item">
                <div class="severity-header">
                  <span class="severity-label" style="color: #ea580c">High</span>
                  <span class="severity-count">${stats.vulnerabilityCounts.high}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-bar" style="width: ${stats.totalVulnerabilities > 0 ? (stats.vulnerabilityCounts.high / stats.totalVulnerabilities * 100) : 0}%; background-color: #ea580c;"></div>
                </div>
              </div>
              <div class="severity-item">
                <div class="severity-header">
                  <span class="severity-label" style="color: #ca8a04">Medium</span>
                  <span class="severity-count">${stats.vulnerabilityCounts.medium}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-bar" style="width: ${stats.totalVulnerabilities > 0 ? (stats.vulnerabilityCounts.medium / stats.totalVulnerabilities * 100) : 0}%; background-color: #ca8a04;"></div>
                </div>
              </div>
              <div class="severity-item">
                <div class="severity-header">
                  <span class="severity-label" style="color: #2563eb">Low</span>
                  <span class="severity-count">${stats.vulnerabilityCounts.low}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-bar" style="width: ${stats.totalVulnerabilities > 0 ? (stats.vulnerabilityCounts.low / stats.totalVulnerabilities * 100) : 0}%; background-color: #2563eb;"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card">
             <h2>License Distribution</h2>
             <div class="license-section">
                <div class="pie-chart-container">
                  ${(() => {
                    const top5 = stats.topLicenses.slice(0, 5);
                    const totalTracked = top5.reduce((acc, l) => acc + l.count, 0);
                    const total = totalTracked || 1; 
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

                    if (top5.length === 0) return `<div style="color:#94a3b8; font-size:14px;">No license data</div>`;
                    
                    // Handle edge case: Single license (100%)
                    if (top5.length === 1) {
                         return `
                          <svg viewBox="0 0 100 100" class="pie-chart">
                            <circle cx="50" cy="50" r="50" fill="${colors[0]}" stroke="#ffffff" stroke-width="1"></circle>
                          </svg>
                        `;
                    }

                    // Handle multiple licenses
                    let accumulatedAngle = 0;
                    const paths = top5.map((l, i) => {
                      const percentage = l.count / total;
                      const angle = percentage * 360;
                      
                      // Calculate coordinates
                      const startAngle = accumulatedAngle;
                      const endAngle = accumulatedAngle + angle;
                      
                      const x1 = 50 + 50 * Math.cos(Math.PI * (startAngle - 90) / 180);
                      const y1 = 50 + 50 * Math.sin(Math.PI * (startAngle - 90) / 180);
                      const x2 = 50 + 50 * Math.cos(Math.PI * (endAngle - 90) / 180);
                      const y2 = 50 + 50 * Math.sin(Math.PI * (endAngle - 90) / 180);
                      
                      const largeArcFlag = angle > 180 ? 1 : 0;
                      
                      const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                      
                      accumulatedAngle += angle;
                      return `<path d="${pathData}" fill="${colors[i]}" stroke="#ffffff" stroke-width="1"></path>`;
                    }).join('');
                    
                    return `
                      <svg viewBox="0 0 100 100" class="pie-chart">
                        ${paths}
                      </svg>
                    `;
                  })()}
                </div>
                
                <div class="legend">
                  ${stats.topLicenses.slice(0, 5).map((l, i) => {
                     const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];
                     return `
                      <div class="legend-item">
                        <div style="display:flex; align-items:center; min-width:0;">
                          <span class="legend-dot" style="background-color: ${colors[i]}"></span>
                          <span class="legend-name">${l.name}</span>
                        </div>
                        <span class="legend-count">${l.count}</span>
                      </div>
                     `;
                  }).join('')}
                </div>
             </div>
          </div>

          <div class="footer">Generated by SBOM Viewer</div>
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
