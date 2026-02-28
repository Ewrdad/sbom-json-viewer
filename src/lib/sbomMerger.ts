function calculateJsonStats(sbom: any) {
  const components = Array.isArray(sbom.components) ? sbom.components : [];
  const vulnerabilities = Array.isArray(sbom.vulnerabilities) ? sbom.vulnerabilities : [];
  
  const vulnCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  vulnerabilities.forEach((v: any) => {
    let maxSev = "none";
    const ratings = Array.isArray(v.ratings) ? v.ratings : [];
    ratings.forEach((r: any) => {
      const s = (r.severity || "").toLowerCase();
      if (s === "critical") maxSev = "critical";
      else if (s === "high" && maxSev !== "critical") maxSev = "high";
      else if (s === "medium" && maxSev !== "critical" && maxSev !== "high") maxSev = "medium";
      else if (s === "low" && maxSev === "none") maxSev = "low";
    });
    if (maxSev === "critical") vulnCounts.critical++;
    else if (maxSev === "high") vulnCounts.high++;
    else if (maxSev === "medium") vulnCounts.medium++;
    else if (maxSev === "low") vulnCounts.low++;
  });

  // Simple metadata scoring logic (subset of statsUtils for speed)
  let score = 0;
  if (components.length > 0) {
    const hasPurl = components.some((c: any) => !!c.purl);
    const hasLicenses = components.some((c: any) => !!c.licenses && c.licenses.length > 0);
    const hasVersions = components.some((c: any) => !!c.version);
    const hasHashes = components.some((c: any) => !!c.hashes && c.hashes.length > 0);
    
    if (hasVersions) score += 30;
    if (hasLicenses) score += 20;
    if (hasPurl) score += 20;
    if (hasHashes) score += 10;
    if (sbom.metadata?.timestamp) score += 10;
    if (sbom.metadata?.tools) score += 10;
  }

  let grade = "F";
  if (score >= 80) grade = "A";
  else if (score >= 60) grade = "B";
  else if (score >= 40) grade = "C";
  else grade = "D";

  return { 
    componentsFound: components.length, 
    vulnerabilitiesFound: vulnerabilities.length,
    criticalCount: vulnCounts.critical,
    highCount: vulnCounts.high,
    mediumCount: vulnCounts.medium,
    lowCount: vulnCounts.low,
    metadataScore: score,
    metadataGrade: grade
  };
}

/**
 * Merges multiple CycloneDX JSON representations into a single JSON object.
 * Uses the first SBOM as the "base". Appends components that do not exist (by `purl`) 
 * and deduplicates vulnerabilities by their `id` and the Component's `bom-ref`.
 */
export function mergeSBOMs(sboms: Record<string, unknown>[], sourceNames: string[] = []): Record<string, unknown> | null {
  if (!sboms || sboms.length === 0) return null;
  if (sboms.length === 1) return sboms[0];

  // Deep clone the first sbom to use as the base
  const baseSbom = JSON.parse(JSON.stringify(sboms[0]));
  
  if (!baseSbom.components) baseSbom.components = [];
  if (!baseSbom.vulnerabilities) baseSbom.vulnerabilities = [];

  const getSourceName = (idx: number) => sourceNames[idx] || `Source ${idx + 1}`;

  const multiSbomStats = {
    sources: [] as any[],
    overlap: {
      components: { unique: 0, shared: 0, total: 0 },
      vulnerabilities: { unique: 0, shared: 0, total: 0 }
    },
    gaps: [] as any[],
    crossSourceComponents: [] as any[]
  };

  // Calculate stats for all sources
  const allSourceStats = sboms.map((s, idx) => ({
    name: getSourceName(idx),
    ...calculateJsonStats(s)
  }));

  // Ranking logic: More components + More vulnerabilities + Higher metadata score
  const rankedSources = [...allSourceStats].sort((a, b) => {
    // Priority 1: High fidelity (Metadata Score)
    if (b.metadataScore !== a.metadataScore) return b.metadataScore - a.metadataScore;
    // Priority 2: Discovery Efficacy (Vulns)
    if (b.vulnerabilitiesFound !== a.vulnerabilitiesFound) return b.vulnerabilitiesFound - a.vulnerabilitiesFound;
    // Priority 3: Breadth (Components)
    return b.componentsFound - a.componentsFound;
  });

  multiSbomStats.sources = allSourceStats.map(s => {
    const rank = rankedSources.findIndex(rs => rs.name === s.name) + 1;
    return { ...s, rank, isBest: rank === 1 };
  });

  // Track shared/unique

  // Track shared/unique
  const sharedComponentPurls = new Set<string>();
  const sharedVulnIds = new Set<string>();

  // Map of PURL -> internal bom-ref mapping for the base sbom
  const purlToBomRef = new Map<string, string>();
  // Map of "name@version" -> internal bom-ref mapping (fallback)
  const identityToBomRef = new Map<string, string>();
  
  const getIdentity = (name: any, version: any) => `${name}@${version || 'unknown'}`;

  (baseSbom.components as Record<string, unknown>[]).forEach((comp: Record<string, unknown>) => {
    const ref = comp['bom-ref'] || comp.purl || `${comp.name}@${comp.version}`;
    comp['bom-ref'] = ref; // Ensure it has a bom-ref
    
    if (comp.purl) { 
      purlToBomRef.set(comp.purl as string, ref as string);
    }
    if (comp.name) {
      identityToBomRef.set(getIdentity(comp.name, comp.version), ref as string);
    }
    comp._rawSources = [{ name: getSourceName(0), json: JSON.parse(JSON.stringify(comp)) }];
  });

  // Track existing vulnerabilities in base sbom by ID and bom-ref
  // Key: `${vuln.id}-${affected.ref}` or just `${vuln.id}` for global ones
  const existingVulns = new Set<string>();
  
  (baseSbom.vulnerabilities as Record<string, unknown>[]).forEach((v: Record<string, unknown>) => {
    if (v.id) {
      if (Array.isArray(v.affects) && v.affects.length > 0) {
        (v.affects as Record<string, unknown>[]).forEach((affected: Record<string, unknown>) => {
          existingVulns.add(`${v.id}-${affected.ref}`);
        });
      } else {
        existingVulns.add(v.id as string);
      }
    }
    v._rawSources = [{ name: getSourceName(0), json: JSON.parse(JSON.stringify(v)) }];
  });

  for (let i = 1; i < sboms.length; i++) {
    const sbom = sboms[i];
    if (!sbom.components) continue;

    let compsFound = 0;
    let vulnsFound = 0;

    // Track how current secondary SBOM map bom-refs to purls/identities
    const currentBomRefToPurl = new Map<string, string>();
    const currentBomRefToIdentity = new Map<string, string>();

    // Merge components
    (sbom.components as Record<string, unknown>[]).forEach((comp: Record<string, unknown>) => {
      const ref = comp['bom-ref'];
      const purl = comp.purl;
      const identity = getIdentity(comp.name, comp.version);
      
      if (ref) {
        if (purl) currentBomRefToPurl.set(ref as string, purl as string);
        if (comp.name) currentBomRefToIdentity.set(ref as string, identity);
      }

      const existingRef = (purl && purlToBomRef.get(purl as string)) || identityToBomRef.get(identity);

      if (!existingRef) {
        // New component, add to base
        const newRef = ref || purl || identity;
        comp['bom-ref'] = newRef;
        comp._rawSources = [{ name: getSourceName(i), json: JSON.parse(JSON.stringify(comp)) }];
        baseSbom.components.push(comp);
        
        if (purl) purlToBomRef.set(purl as string, newRef as string);
        if (comp.name) identityToBomRef.set(identity, newRef as string);
      } else {
        // Shared component
        sharedComponentPurls.add(purl as string || identity);
        const baseComp = (baseSbom.components as Record<string, unknown>[]).find(c => c['bom-ref'] === existingRef);
        if (baseComp) {
          if (!baseComp._rawSources) baseComp._rawSources = [];
          (baseComp._rawSources as Record<string, unknown>[]).push({ name: getSourceName(i), json: JSON.parse(JSON.stringify(comp)) });
        }
      }
      compsFound++;
    });

    // Merge vulnerabilities
    if (sbom.vulnerabilities && Array.isArray(sbom.vulnerabilities)) {
      (sbom.vulnerabilities as Record<string, unknown>[]).forEach((v: Record<string, unknown>) => {
        if (!v.id) return;
        
        const newAffects: Record<string, unknown>[] = [];
        let isShared = false;

        if (Array.isArray(v.affects) && v.affects.length > 0) {
           (v.affects as Record<string, unknown>[]).forEach((affected: Record<string, unknown>) => {
             const originalRef = affected.ref;
             
             // Try to find matching component in base by PURL first, then Identity
             const purl = currentBomRefToPurl.get(originalRef as string);
             const identity = currentBomRefToIdentity.get(originalRef as string);
             
             const targetBaseRef = (purl && purlToBomRef.get(purl)) || (identity && identityToBomRef.get(identity));
             
             if (targetBaseRef) {
               const dedupKey = `${v.id}-${targetBaseRef}`;
               if (!existingVulns.has(dedupKey)) {
                 existingVulns.add(dedupKey);
                 const clonedAffected = JSON.parse(JSON.stringify(affected));
                 clonedAffected.ref = targetBaseRef; // Rewrite to point to base bom-ref
                 newAffects.push(clonedAffected);
               } else {
                 isShared = true;
               }
             }
           });
        } else {
          // No affects, just check global ID deduplication
          if (!existingVulns.has(v.id as string)) {
            existingVulns.add(v.id as string);
            const newVuln = JSON.parse(JSON.stringify(v));
            newVuln._rawSources = [{ name: getSourceName(i), json: JSON.parse(JSON.stringify(v)) }];
            baseSbom.vulnerabilities.push(newVuln);
          } else {
            isShared = true;
          }
        }

        // If we found any new affects OR it's a shared vulnerability, 
        // we should update the base vulnerability or add a new one.
        if (newAffects.length > 0 || isShared) {
          if (isShared) sharedVulnIds.add(v.id as string);

          // Find if this vulnerability ID already exists in baseSbom
          const baseVuln = (baseSbom.vulnerabilities as Record<string, unknown>[]).find(bv => bv.id === v.id);
          
          if (baseVuln) {
            // Merge into existing vulnerability
            if (newAffects.length > 0) {
              if (!Array.isArray(baseVuln.affects)) baseVuln.affects = [];
              (baseVuln.affects as any[]).push(...newAffects);
            }
            
            // Track source
            if (!baseVuln._rawSources) baseVuln._rawSources = [];
            const alreadyHasSource = (baseVuln._rawSources as any[]).some(s => s.name === getSourceName(i));
            if (!alreadyHasSource) {
              (baseVuln._rawSources as any[]).push({ name: getSourceName(i), json: JSON.parse(JSON.stringify(v)) });
            }
          } else if (newAffects.length > 0) {
            // New vulnerability ID with new affects
            const newVuln = JSON.parse(JSON.stringify(v));
            newVuln.affects = newAffects;
            newVuln._rawSources = [{ name: getSourceName(i), json: JSON.parse(JSON.stringify(v)) }];
            baseSbom.vulnerabilities.push(newVuln);
          }
        }
        
        vulnsFound++;
      });
    }
  }

  multiSbomStats.overlap.components.shared = sharedComponentPurls.size;
  multiSbomStats.overlap.components.total = baseSbom.components.length;
  multiSbomStats.overlap.components.unique = multiSbomStats.overlap.components.total - multiSbomStats.overlap.components.shared;

  multiSbomStats.overlap.vulnerabilities.shared = sharedVulnIds.size;
  multiSbomStats.overlap.vulnerabilities.total = baseSbom.vulnerabilities.length;
  multiSbomStats.overlap.vulnerabilities.unique = multiSbomStats.overlap.vulnerabilities.total - multiSbomStats.overlap.vulnerabilities.shared;

  // Gap Analysis: What did ONE scanner find that ALL others missed?
  const actualSourceNames = sboms.map((_, idx) => getSourceName(idx));
  const gaps: any[] = actualSourceNames.map(name => ({
    sourceName: name,
    uniqueComponents: [],
    uniqueVulnerabilities: []
  }));

  (baseSbom.components as any[]).forEach(comp => {
    if (comp._rawSources && comp._rawSources.length === 1) {
      const sourceIdx = actualSourceNames.indexOf(comp._rawSources[0].name);
      if (sourceIdx !== -1) {
        gaps[sourceIdx].uniqueComponents.push({
          name: comp.name,
          version: comp.version,
          purl: comp.purl
        });
      }
    }
  });

  (baseSbom.vulnerabilities as any[]).forEach(vuln => {
    if (vuln._rawSources && vuln._rawSources.length === 1) {
      const sourceIdx = actualSourceNames.indexOf(vuln._rawSources[0].name);
      if (sourceIdx !== -1) {
        const affects = vuln.affects?.[0]?.ref || "";
        const comp = (baseSbom.components as any[]).find(c => c["bom-ref"] === affects);
        
        let maxSev = "unknown";
        if (Array.isArray(vuln.ratings)) {
            const highSev = vuln.ratings.find((r: any) => ["critical", "high"].includes((r.severity || "").toLowerCase()));
            if (highSev) maxSev = highSev.severity;
            else if (vuln.ratings[0]) maxSev = vuln.ratings[0].severity;
        }

        gaps[sourceIdx].uniqueVulnerabilities.push({
          id: vuln.id,
          severity: maxSev,
          componentName: comp?.name || "Unknown"
        });
      }
    }
  });

  multiSbomStats.gaps = gaps;
  
  // Cross-source component comparison data
  multiSbomStats.crossSourceComponents = (baseSbom.components as any[]).map(comp => {
    const metadataBySource: Record<string, any> = {};
    const foundBy: string[] = [];

    if (comp._rawSources) {
      comp._rawSources.forEach((src: any) => {
        foundBy.push(src.name);
        const json = src.json || {};
        metadataBySource[src.name] = {
          hasPurl: !!json.purl,
          hasLicenses: !!(json.licenses && json.licenses.length > 0),
          hasHashes: !!(json.hashes && (Array.isArray(json.hashes) ? json.hashes.length > 0 : Object.keys(json.hashes).length > 0))
        };
      });
    }

    return {
      name: comp.name,
      version: comp.version,
      purl: comp.purl,
      foundBy,
      metadataBySource
    };
  });
  
  // Update sources with unique counts
  multiSbomStats.sources.forEach((s, idx) => {
    if (gaps[idx]) {
      s.uniqueComponents = gaps[idx].uniqueComponents.length;
      s.uniqueVulnerabilities = gaps[idx].uniqueVulnerabilities.length;
    }
  });

  baseSbom.__multiSbomStats = multiSbomStats;

  return baseSbom;
}
