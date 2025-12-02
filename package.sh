#!/bin/bash

# Extract version from manifest.json
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)

# Define the output filename with version
OUTPUT_FILE="InspectorAI-v$VERSION.zip"

# Remove existing zip if it exists
if [ -f "$OUTPUT_FILE" ]; then
    rm "$OUTPUT_FILE"
fi

echo "Creating release package: $OUTPUT_FILE"

# Create the zip file with explicit file list (Allowlist approach)
zip -r "$OUTPUT_FILE" \
    manifest.json \
    src \
    assets \
    LICENSE \
    README.md \
    PRIVACY_POLICY.md \
    -x "*.DS_Store" \
    -x "*.git*"

# Verify if zip was successful
if [ $? -eq 0 ]; then
    echo "---------------------------------------------------"
    echo "Successfully created release package: $OUTPUT_FILE"
    echo "Files included:"
    unzip -l "$OUTPUT_FILE"
    echo "---------------------------------------------------"
else
    echo "Error: Failed to create zip file."
    exit 1
fi
