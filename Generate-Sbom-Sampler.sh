#!/bin/bash
set -eo pipefail

# Gets Package name (error if not in npm)
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found!"
  exit 1
fi

PACKAGE_NAME=$(jq -r '.name' package.json)

if [ -z "$PACKAGE_NAME" ] || [ "$PACKAGE_NAME" == "null" ]; then
  echo "Error: Could not determine package name from package.json"
  exit 1
fi

#If directory exists remove it
rm -rf "./$PACKAGE_NAME"

# make directory based on package name ./[package-name]
mkdir -p "./$PACKAGE_NAME"

# Syft.sbom.json
syft . --exclude './.git/**' -c .syft.yaml -o cyclonedx-json > "./$PACKAGE_NAME/Syft.sbom.json" 

# TrivyNoScan.sbom.json
trivy fs --format cyclonedx --output "./$PACKAGE_NAME/TrivyNoScan.sbom.json" .

# TrivyScan.sbom.json
trivy fs --format cyclonedx --output "./$PACKAGE_NAME/TrivyScan.sbom.json" --scanners vuln,license .
# GrypeSyft.sbom.json
grype "sbom:./$PACKAGE_NAME/Syft.sbom.json" -o cyclonedx-json > "./$PACKAGE_NAME/GrypeSyft.sbom.json"

# TrivySyft.sbom.json
trivy sbom "./$PACKAGE_NAME/Syft.sbom.json" --format cyclonedx --output "./$PACKAGE_NAME/TrivySyft.sbom.json" --scanners vuln,license

# CDXGEN.sbom.json
cdxgen -o "./$PACKAGE_NAME/CDXGEN.sbom.json" 

# Trivy Enriched CDXGEN.sbom.json
trivy sbom "./$PACKAGE_NAME/CDXGEN.sbom.json" --format cyclonedx --output "./$PACKAGE_NAME/TrivyCDXGEN.sbom.json" --scanners vuln,license

# CycloneDXNPM.sbom.json
cyclonedx-npm -o "./$PACKAGE_NAME/CycloneDXNPM.sbom.json" 

# Trivy Enriched CycloneDXNPM.sbom.json
trivy sbom "./$PACKAGE_NAME/CycloneDXNPM.sbom.json" --format cyclonedx --output "./$PACKAGE_NAME/TrivyCycloneDXNPM.sbom.json" --scanners vuln,license


# NPM Default
npm sbom --sbom-format cyclonedx > "./$PACKAGE_NAME/NPMDefault.sbom.json"

# Trivy Enriched NPM Default
trivy sbom "./$PACKAGE_NAME/NPMDefault.sbom.json" --format cyclonedx --output "./$PACKAGE_NAME/TrivyNPMDefault.sbom.json" --scanners vuln,license

# Grype Enriched NPM Default
grype "sbom:./$PACKAGE_NAME/NPMDefault.sbom.json" -o cyclonedx-json > "./$PACKAGE_NAME/GrypeNPMDefault.sbom.json"
