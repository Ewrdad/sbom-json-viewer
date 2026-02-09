export interface SbomStats {
  totalComponents: number;
  vulnerabilityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  licenseCounts: Record<string, number>;
  topLicenses: { name: string; count: number }[];
  licenseDistribution: {
    permissive: number;
    copyleft: number;
    weakCopyleft: number;
    proprietary: number;
    unknown: number;
  };
  vulnerableComponents: {
    name: string;
    version: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }[];
}

export interface WorkerProgressUpdate {
  progress: number;
  message: string;
}
