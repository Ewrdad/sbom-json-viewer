import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Temporarily unhides the target element, captures it as a canvas, and triggers a download.
 * @param elementId The ID of the HTML element to capture
 * @returns Promise that resolves to the generated canvas
 */
const captureElement = async (elementId: string): Promise<HTMLCanvasElement> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  // Ensure element is visible before capturing
  const originalDisplay = element.style.display;
  const originalPosition = element.style.position;
  const originalTop = element.style.top;
  const originalLeft = element.style.left;
  const originalZIndex = element.style.zIndex;

  element.style.display = 'block';
  element.style.position = 'fixed';
  element.style.top = '0';
  element.style.left = '-9999px'; // Render off-screen to prevent flash
  element.style.zIndex = '-1';

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Higher resolution
      useCORS: true, // Allow cross-origin images to be rendered
      logging: false, // Turn off html2canvas logging
      backgroundColor: '#ffffff', // Force white background
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });
    return canvas;
  } finally {
    // Restore original styles
    element.style.display = originalDisplay;
    element.style.position = originalPosition;
    element.style.top = originalTop;
    element.style.left = originalLeft;
    element.style.zIndex = originalZIndex;
  }
};

/**
 * Captures an element and downloads it as a PNG file.
 * @param elementId The ID of the element to export
 * @param filename The desired filename (without extension)
 */
export const exportElementToPng = async (elementId: string, filename: string): Promise<void> => {
  try {
    const canvas = await captureElement(elementId);
    
    // Create download link
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to export PNG:', error);
    throw error;
  }
};

/**
 * Captures an element and embeds it into a downloaded A4 PDF.
 * @param elementId The ID of the element to export
 * @param filename The desired filename (without extension)
 */
export const exportElementToPdf = async (elementId: string, filename: string): Promise<void> => {
  try {
    const canvas = await captureElement(elementId);
    const imgData = canvas.toDataURL('image/png', 1.0);

    // Calculate dimensions for A4 paper (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Optional: handle page breaks if the canvas is longer than one A4 page
    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    // Remaining pages
    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw error;
  }
};
