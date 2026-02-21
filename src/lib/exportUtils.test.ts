import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportVulnerabilityToPng, exportVulnerabilityToPdf } from './exportUtils';
import * as template from './vulnerabilityCardTemplate';

// Mock dependencies
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock-data'),
    width: 1000,
    height: 1000
  })
}));

const mockJsPdf = {
  addImage: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
  internal: {
    pageSize: {
      getWidth: () => 210,
      getHeight: () => 297
    }
  }
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(function() {
    return mockJsPdf;
  })
}));

// Mock template to avoid complex HTML generation in tests
vi.spyOn(template, 'getVulnerabilityCardHtml').mockReturnValue('<div class="container">Mock HTML</div>');

describe('exportUtils', () => {
  const mockVulnerability = { id: 'CVE-1' };
  const mockComponents: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the body of any lingering iframes
    document.body.innerHTML = '';
    // Mock alert
    vi.stubGlobal('alert', vi.fn());
  });

  describe('exportVulnerabilityToPng', () => {
    it('should call getVulnerabilityCardHtml and trigger a download', async () => {
      // Mock document.createElement and click
      const mockLink = {
        click: vi.fn(),
        href: '',
        download: '',
        style: {}
      };
      
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') return mockLink as any;
        return originalCreateElement(tagName);
      });

      await exportVulnerabilityToPng(mockVulnerability, mockComponents);

      expect(template.getVulnerabilityCardHtml).toHaveBeenCalledWith(mockVulnerability, mockComponents);
      expect(mockLink.download).toBe('vulnerability-CVE-1.png');
      expect(mockLink.click).toHaveBeenCalled();

      createElementSpy.mockRestore();
    });

    it('should log an error if export fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(template, 'getVulnerabilityCardHtml').mockImplementationOnce(() => {
        throw new Error('Test Error');
      });

      await exportVulnerabilityToPng(mockVulnerability, mockComponents);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to export PNG:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('exportVulnerabilityToPdf', () => {
    it('should call getVulnerabilityCardHtml and save a PDF', async () => {
      await exportVulnerabilityToPdf(mockVulnerability, mockComponents);

      expect(template.getVulnerabilityCardHtml).toHaveBeenCalledWith(mockVulnerability, mockComponents);
      expect(mockJsPdf.save).toHaveBeenCalledWith('vulnerability-CVE-1.pdf');
    });
  });
});
