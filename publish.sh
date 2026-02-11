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
aws s3 sync dist/ s3://sbom.ewrdad.uk --delete

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id E29H4HL7G8MKY4 --paths "/*"