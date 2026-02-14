import type { Component, Metadata, License } from "@cyclonedx/cyclonedx-library/Models";
import type * as Models from "@cyclonedx/cyclonedx-library/Models";

type Vulnerability = Models.Vulnerability.Vulnerability;

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
  allVulnerableComponents: {
    name: string;
    version: string;
    ref: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }[];
  totalVulnerabilities: number;
  allVulnerabilities: {
    id: string;
    severity: string;
    affectedCount: number;
    title?: string;
  }[];
  allLicenses: {
    id: string;
    name: string;
    category: string;
    affectedCount: number;
  }[];
  allLicenseComponents: {
    name: string;
    version: string;
    ref: string;
    licenses: { id: string; name: string; category: string }[];
  }[];
  uniqueVulnerabilityCount: number;
  avgVulnerabilitiesPerComponent: number;
  dependencyStats: {
    direct: number;
    transitive: number;
  };
  dependentsDistribution: Record<number, number>;
  vulnerabilityImpactDistribution: Record<number, number>;
}

export interface WorkerProgressUpdate {
  progress: number;
  message: string;
}

export interface LicenseDistribution {
  permissive: number;
  copyleft: number;
  weakCopyleft: number;
  proprietary: number;
  unknown: number;
}

/**
 * Enhanced Component with pre-calculated vulnerability and license metadata
 */
export interface EnhancedComponent extends Component {
  vulnerabilities: {
    inherent: {
      Critical: Vulnerability[];
      High: Vulnerability[];
      Medium: Vulnerability[];
      Low: Vulnerability[];
      Informational: Vulnerability[];
    };
    transitive: {
      Critical: Vulnerability[];
      High: Vulnerability[];
      Medium: Vulnerability[];
      Low: Vulnerability[];
      Informational: Vulnerability[];
    };
  };
  licenseDistribution: LicenseDistribution;
  transitiveLicenseDistribution: LicenseDistribution;
}

export type formattedSBOM = {
  signature?: Signature;
  statistics: {
    licenses: License[];
    vulnerabilities: {
      Critical: Vulnerability[];
      High: Vulnerability[];
      Medium: Vulnerability[];
      Low: Vulnerability[];
      Informational: Vulnerability[];
    };
  };
  metadata: Metadata;
  /**
   * Flat map of components by their bomRef for O(1) lookup
   */
  componentMap: Map<string, EnhancedComponent>;
  /**
   * Adjacency list representing the dependency graph: bomRef -> string[] of dependency bomRefs
   */
  dependencyGraph: Map<string, string[]>;
  /**
   * Reverse dependency graph: bomRef -> string[] of component bomRefs that depend on this one
   */
  dependentsGraph: Map<string, string[]>;
  /**
   * Blast radius: bomRef -> total count of transitive dependents
   */
  blastRadius: Map<string, number>;
  /**
   * Top level component refs (roots of the tree)
   */
  topLevelRefs: string[];
};

export interface Signature {
  algorithm: string;
  certificate?: string;
  publicKey?: {
    kty?: string;
    crv?: string;
    x?: string;
    y?: string;
  };
  value?: string;
  keyId?: string;
}
