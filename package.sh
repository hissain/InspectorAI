#!/bin/bash

# Define the output filename
OUTPUT_FILE="InspectorAI-Release.zip"

# Remove existing zip if it exists
if [ -f "$OUTPUT_FILE" ]; then
    rm "$OUTPUT_FILE"
fi

# Create the zip file
# Exclude:
# - .git directory
# - .github directory (workflows)
# - .DS_Store (macOS metadata)
# - .vscode (editor settings)
# - node_modules (dependencies, if any)
# - *.zip (prevent recursive zipping of existing archives)
# - package.sh (this script itself)
# - LICENSE (usually included, but user might want to check CWS policies. We'll include it.)
# - README.md (We'll include it)

zip -r "$OUTPUT_FILE" . \
    -x "*.git*" \
    -x ".github/*" \
    -x "*.DS_Store" \
    -x ".vscode/*" \
    -x "node_modules/*" \
    -x "*.zip" \
    -x "package.sh"

echo "---------------------------------------------------"
echo "Successfully created release package: $OUTPUT_FILE"
echo "You can upload this file to the Chrome Web Store."
echo "---------------------------------------------------"
