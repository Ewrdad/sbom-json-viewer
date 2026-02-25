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
    description?: string;
    detail?: string;
    recommendation?: string;
    advisories?: { title?: string; url: string }[];
    cwes?: number[];
    source?: { name?: string; url?: string };
    references?: { url: string; comment?: string }[];
    ratings?: Record<string, unknown>[];
    analysis?: {
      state?: string;
      justification?: string;
      response?: string[];
      detail?: string;
      firstAppearance?: string;
      lastAppearance?: string;
    };
    created?: string;
    published?: string;
    updated?: string;
    rejected?: string;
    proofOfConcept?: {
      reproductionSteps?: string;
      environment?: string;
      screenshots?: { image: { attachment: string; contentType: string } }[];
    };
    workaround?: string;
    credits?: {
      organizations?: { name: string; url?: string }[];
      individuals?: { name: string; email?: string; url?: string }[];
    };
    tools?: Record<string, unknown>[];
    properties?: Record<string, unknown>[];
    affects?: {
      ref: string;
      versions?: { version: string; status: string }[];
    }[];
    affectedComponentRefs: string[];
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
  cweCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  developerStats?: DeveloperStats;
  multiSbomStats?: MultiSbomStats;
}

export interface MultiSbomStats {
  sources: { name: string; componentsFound: number; vulnerabilitiesFound: number }[];
  overlap: {
    components: { unique: 0; shared: 0; total: 0 };
    vulnerabilities: { unique: 0; shared: 0; total: 0 };
  };
}

export interface DeveloperStats {
  versionConflicts: VersionConflict[];
  metadataQuality: MetadataQuality;
}

export interface VersionConflict {
  name: string;
  versions: string[];
  affectedRefs: string[];
}

export interface MetadataQuality {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: {
    purl: boolean;
    hashes: boolean;
    licenses: boolean;
    supplier: boolean;
    properties: boolean;
    tools: boolean;
    dependencies: boolean;
    versions: boolean;
    types: boolean;
    timestamp: boolean;
  };
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
export interface EnhancedComponent extends Omit<Component, "supplier" | "author" | "publisher"> {
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
  // Extended fields that might be present in JSON from varying cyclonedx versions
  author?: string;
  authors?: Array<{ name?: string; email?: string }>;
  maintainers?: Array<{ name?: string; email?: string }>;
  supplier?: Models.OrganizationalEntity | Record<string, unknown>;
  publisher?: string;
  _raw?: unknown;
  _rawSources?: { name: string; json: Record<string, unknown> }[];
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
  /**
   * Raw CycloneDX JSON
   */
  _raw?: unknown;
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
