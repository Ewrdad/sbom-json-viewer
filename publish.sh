#!/bin/bash

# Run tests first
echo "Running automated tests..."
npm run test
if [ $? -ne 0 ]; then
    echo "Tests failed! Aborting publish."
    exit 1
fi



# Build the app
npm run build 
if [ $? -ne 0 ]; then
    echo "Build failed! Aborting publish."
    exit 1
fi

# Sync to S3

# Generate Self SBOM
echo "Generating Self SBOM..."
if command -v trivy &> /dev/null; then
    rm -rf dist/sboms/self
    mkdir -p dist/sboms/self
    syft . -o cyclonedx-json -c .syft.yaml > latest.sbom.json
    trivy sbom latest.sbom.json --format cyclonedx --output dist/sboms/self/latest.sbom.json --scanners vuln,license 
    # Copy to public/sboms/self so it's available in dev too
    mkdir -p public/sboms/self
    cp dist/sboms/self/latest.sbom.json public/sboms/self/latest.sbom.json
    ./Generate-Sbom-Sampler.sh
    cp ./sbom-json-viewer/* dist/sboms/self/ || true
    cp ./sbom-json-viewer/* public/sboms/self/ || true
else
    echo "Trivy not found, cancelling deployment"
    exit 1
fi

# Dynamically generate manifest.json based on what's in dist/sboms/ and public/sboms/
echo "Generating dynamic manifest.json..."
node scripts/generate-manifest.mjs

aws s3 sync dist/ "$(cat ./config/publish/s3Bucket)" --delete

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id "$(cat ./config/publish/cloudfrontDist)" --paths "/*"