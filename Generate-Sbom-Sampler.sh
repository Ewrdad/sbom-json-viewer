#!/bin/bash

# Gets Package name (error if not in npm)
PACKAGE_NAME=$(jq -r '.name' package.json)

# make directory based on package name ./[package-name]
mkdir -p "./$PACKAGE_NAME"

# Syft.sbom.json
syft . -o cyclonedx-json > "./$PACKAGE_NAME/Syft.sbom.json"

# TrivyNoScan.sbom.json
trivy fs --format cyclonedx --output "./$PACKAGE_NAME/TrivyNoScan.sbom.json" .

# TrivyScan.sbom.json
trivy fs --format cyclonedx --output "./$PACKAGE_NAME/TrivyScan.sbom.json" . --scanners vuln,license
# GrypeSyft.sbom.json
grype "sbom:./$PACKAGE_NAME/Syft.sbom.json" -o cyclonedx-json > "./$PACKAGE_NAME/GrypeSyft.sbom.json"

# TrivySyft.sbom.json
trivy sbom "./$PACKAGE_NAME/Syft.sbom.json" --format cyclonedx --output "./$PACKAGE_NAME/TrivySyft.sbom.json"

# CDXGEN.sbom.json
cdxgen -o "./$PACKAGE_NAME/CDXGEN.sbom.json" 

# CycloneDXNPM.sbom.json
cyclonedx-npm -o "./$PACKAGE_NAME/CycloneDXNPM.sbom.json" 