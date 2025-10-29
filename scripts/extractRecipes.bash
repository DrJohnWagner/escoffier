#!/bin/bash
#
# An alternative version using a single `awk` command.
#

# --- Safety Checks ---
if [ -z "$1" ]; then
  echo "Error: No filename provided."
  echo "Usage: $0 <path_to_file>"
  exit 1
fi
INPUT_FILE="$1"
if [ ! -r "$INPUT_FILE" ]; then
  echo "Error: File not found or is not readable: '$INPUT_FILE'"
  exit 1
fi

# --- Awk Logic ---
# 1. We match the same regex as before.
# 2. If a line matches, we set the Field Separator (-F) to be a dash or em-dash.
# 3. We then print the built-in FILENAME variable, a colon, and the first field ($1).
awk -F'[—-]' '/^[[:digit:]]+[[:alpha:]]?[—-]/ {print FILENAME ":" $1}' "$INPUT_FILE"