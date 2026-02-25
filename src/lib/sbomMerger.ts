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
    sources: [] as { name: string; componentsFound: number; vulnerabilitiesFound: number }[],
    overlap: {
      components: { unique: 0, shared: 0, total: 0 },
      vulnerabilities: { unique: 0, shared: 0, total: 0 }
    }
  };

  multiSbomStats.sources.push({
    name: getSourceName(0),
    componentsFound: baseSbom.components.length,
    vulnerabilitiesFound: baseSbom.vulnerabilities.length
  });

  // Track shared/unique
  const sharedComponentPurls = new Set<string>();
  const sharedVulnIds = new Set<string>();

  // Map of PURL -> internal bom-ref mapping for the base sbom
  const purlToBomRef = new Map<string, string>();
  
  (baseSbom.components as Record<string, unknown>[]).forEach((comp: Record<string, unknown>) => {
    if (comp.purl) { 
      const ref = comp['bom-ref'] || comp.purl;
      comp['bom-ref'] = ref; // Ensure it has a bom-ref
      purlToBomRef.set(comp.purl as string, ref as string);
    }
    comp._rawSources = [{ name: getSourceName(0), json: JSON.parse(JSON.stringify(comp)) }];
  });

  // Track existing vulnerabilities in base sbom by ID and bom-ref
  // Key: `${vuln.id}-${affected.ref}`
  const existingVulns = new Set<string>();
  
  (baseSbom.vulnerabilities as Record<string, unknown>[]).forEach((v: Record<string, unknown>) => {
    if (v.id && Array.isArray(v.affects)) {
      (v.affects as Record<string, unknown>[]).forEach((affected: Record<string, unknown>) => {
        existingVulns.add(`${v.id}-${affected.ref}`);
      });
    }
    v._rawSources = [{ name: getSourceName(0), json: JSON.parse(JSON.stringify(v)) }];
  });

  for (let i = 1; i < sboms.length; i++) {
    const sbom = sboms[i];
    if (!sbom.components) continue;

    let compsFound = 0;
    let vulnsFound = 0;

    // Track how current secondary SBOM map bom-refs to purls
    const currentBomRefToPurl = new Map<string, string>();

    // Merge components
    (sbom.components as Record<string, unknown>[]).forEach((comp: Record<string, unknown>) => {
      const ref = comp['bom-ref'];
      const purl = comp.purl;
      
      if (ref && purl) {
        currentBomRefToPurl.set(ref as string, purl as string);
      } else if (purl) {
        // Fallback if no bom-ref
        currentBomRefToPurl.set(purl as string, purl as string);
      }

      if (purl && !purlToBomRef.has(purl as string)) {
        // New component, add to base
        const newRef = ref || purl;
        comp['bom-ref'] = newRef;
        comp._rawSources = [{ name: getSourceName(i), json: JSON.parse(JSON.stringify(comp)) }];
        baseSbom.components.push(comp);
        purlToBomRef.set(purl as string, newRef as string);
      } else if (purl) {
        // Shared component
        sharedComponentPurls.add(purl as string);
        const targetRef = purlToBomRef.get(purl as string);
        const baseComp = (baseSbom.components as Record<string, unknown>[]).find(c => c['bom-ref'] === targetRef);
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
        
        const newVuln = JSON.parse(JSON.stringify(v));
        const newAffects: Record<string, unknown>[] = [];
        
        if (Array.isArray(newVuln.affects)) {
           (newVuln.affects as Record<string, unknown>[]).forEach((affected: Record<string, unknown>) => {
             const originalRef = affected.ref;
             const purl = currentBomRefToPurl.get(originalRef as string);
             
             if (purl) {
               const targetBaseRef = purlToBomRef.get(purl as string);
               if (targetBaseRef) {
                 const dedupKey = `${newVuln.id}-${targetBaseRef}`;
                 if (!existingVulns.has(dedupKey)) {
                   existingVulns.add(dedupKey);
                   affected.ref = targetBaseRef; // Rewrite to point to base bom-ref
                   newAffects.push(affected);
                 }
               }
             }
           });
           
           if (newAffects.length > 0) {
             newVuln.affects = newAffects;
             newVuln._rawSources = [{ name: getSourceName(i), json: JSON.parse(JSON.stringify(v)) }];
             baseSbom.vulnerabilities.push(newVuln);
           }
        }
        vulnsFound++;
      });
    }

    multiSbomStats.sources.push({
      name: getSourceName(i),
      componentsFound: compsFound,
      vulnerabilitiesFound: vulnsFound
    });
  }

  multiSbomStats.overlap.components.shared = sharedComponentPurls.size;
  multiSbomStats.overlap.components.total = baseSbom.components.length;
  multiSbomStats.overlap.components.unique = multiSbomStats.overlap.components.total - multiSbomStats.overlap.components.shared;

  multiSbomStats.overlap.vulnerabilities.shared = sharedVulnIds.size;
  multiSbomStats.overlap.vulnerabilities.total = baseSbom.vulnerabilities.length;
  multiSbomStats.overlap.vulnerabilities.unique = multiSbomStats.overlap.vulnerabilities.total - multiSbomStats.overlap.vulnerabilities.shared;

  baseSbom.__multiSbomStats = multiSbomStats;

  return baseSbom;
}
