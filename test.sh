#!/bin/bash
trivy fs . --format cyclonedx --output enriched-sbom.json --scanners vuln