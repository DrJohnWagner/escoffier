#!/bin/bash

#
# A script to safely process all files in the current directory.
# For each file, it:
# 1. Creates a backup with a .bak extension.
# 2. Runs the Node.js script 'replace.js' to perform an in-place replacement.
#

# --- Configuration ---
# The Node.js script to run. Assumes it's in the same directory.
REPLACE_SCRIPT="../../scripts/replaceFormulasWithRecipes.js"
BACKUP_EXT=".bak"

# --- Pre-run Safety Check ---
if [ ! -f "$REPLACE_SCRIPT" ]; then
  echo "Error: Replacement script not found at '$REPLACE_SCRIPT'"
  exit 1
fi

echo "Starting batch replacement process..."
echo "-----------------------------------"

# --- Main Loop ---
# Loop through all items in the current directory.
for file in chapter-*.json; do
  # --- Filter out items we don't want to process ---

  # 1. Skip if it's not a regular file (e.g., it's a directory)
  if [ ! -f "$file" ]; then
    continue
  fi

  # 2. Skip backup files, the node script, and this script itself
  if [[ "$file" == *"$BACKUP_EXT" ]] || \
     [[ "$file" == "$(basename "$REPLACE_SCRIPT")" ]] || \
     [[ "$file" == "$(basename "$0")" ]]; then
    continue
  fi

  echo "Processing file: '$file'"

  # 1. Create a backup
  cp -p "$file" "$file$BACKUP_EXT"
  if [ $? -ne 0 ]; then
    echo "  -> ERROR: Failed to create backup for '$file'. Skipping."
    continue
  fi
  echo "  -> Backup created: '$file$BACKUP_EXT'"

  # 2. Run the replacement script.
  # We redirect the output to a temporary file. This is safer than trying
  # to read and write to the same file simultaneously.
  TMP_FILE="$file.tmp"
  node "$REPLACE_SCRIPT" < "$file" > "$TMP_FILE"
  if [ $? -ne 0 ]; then
    echo "  -> ERROR: '$REPLACE_SCRIPT' failed on '$file'. Skipping."
    rm -f "$TMP_FILE" # Clean up temp file on failure
    continue
  fi

  # 3. If the script succeeded, replace the original file with the new one.
  mv "$TMP_FILE" "$file"
  if [ $? -ne 0 ]; then
    echo "  -> ERROR: Failed to overwrite original file '$file' with processed version."
    continue
  fi
  echo "  -> File successfully updated."

done

echo "-----------------------------------"
echo "Processing complete."