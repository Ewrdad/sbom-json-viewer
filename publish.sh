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
mkdir -p dist/sboms/self
if command -v trivy &> /dev/null; then
    trivy fs . --format cyclonedx --output dist/sboms/self/latest.sbom.json --scanners vuln,misconfig,secret,license --include-dev-deps
    # Copy to public/sboms/self so it's available in dev too
    mkdir -p public/sboms/self
    cp dist/sboms/self/latest.sbom.json public/sboms/self/latest.sbom.json
else
    echo "Trivy not found, cancelling deployment"
    exit 1
fi

aws s3 sync dist/ "$(cat ./config/publish/s3Bucket)" --delete

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id "$(cat ./config/publish/cloudfrontDist)" --paths "/*"