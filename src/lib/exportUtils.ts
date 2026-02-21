import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getVulnerabilityCardHtml, type VulnerabilityPrintData, type ComponentPrintData } from './vulnerabilityCardTemplate';

/**
 * Creates a hidden iframe and injects HTML content for capturing.
 * This isolates the capture from the main document's CSS (e.g. oklch).
 */
const createCaptureIframe = async (html: string): Promise<{ iframe: HTMLIFrameElement, element: HTMLElement }> => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '1200px'; // Wider to avoid any overflow clipping
  iframe.style.height = '3000px'; // Tall enough for long reports
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Could not access iframe document");
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for resources to load
  await new Promise(resolve => setTimeout(resolve, 250));

  const element = doc.querySelector('.container') as HTMLElement;
  if (!element) {
    document.body.removeChild(iframe);
    throw new Error("Capture container not found in iframe");
  }

  return { iframe, element };
};

const captureFromIframe = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
  try {
    // Get precise dimensions
    const rect = element.getBoundingClientRect();
    const width = rect.width || element.offsetWidth;
    const height = rect.height || element.offsetHeight;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: width,
      height: height,
      windowWidth: width + 100, // Small buffer to ensure no clipping
      windowHeight: height,
      logging: false,
      x: 0,
      y: 0,
    });
    return canvas;
  } catch (err) {
    console.error('html2canvas failed in iframe:', err);
    throw err;
  }
};

/**
 * Exports a vulnerability card to PNG.
 */
export const exportVulnerabilityToPng = async (vulnerability: unknown, allVulnerableComponents: unknown[]) => {
  let iframeObj: { iframe: HTMLIFrameElement; element: HTMLElement } | null = null;
  try {
    const html = getVulnerabilityCardHtml(vulnerability as VulnerabilityPrintData, allVulnerableComponents as ComponentPrintData[]);
    iframeObj = await createCaptureIframe(html);
    const canvas = await captureFromIframe(iframeObj.element);
    
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `vulnerability-${(vulnerability as VulnerabilityPrintData).id}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to export PNG:', error);
    alert('Failed to generate PNG card. Check console for details.');
  } finally {
    if (iframeObj) document.body.removeChild(iframeObj.iframe);
  }
};

/**
 * Exports a vulnerability card to PDF.
 */
export const exportVulnerabilityToPdf = async (vulnerability: unknown, allVulnerableComponents: unknown[]) => {
  let iframeObj: { iframe: HTMLIFrameElement; element: HTMLElement } | null = null;
  try {
    const html = getVulnerabilityCardHtml(vulnerability as VulnerabilityPrintData, allVulnerableComponents as ComponentPrintData[]);
    iframeObj = await createCaptureIframe(html);
    const canvas = await captureFromIframe(iframeObj.element);
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(`vulnerability-${(vulnerability as VulnerabilityPrintData).id}.pdf`);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('Failed to generate PDF card. Check console for details.');
  } finally {
    if (iframeObj) document.body.removeChild(iframeObj.iframe);
  }
};
