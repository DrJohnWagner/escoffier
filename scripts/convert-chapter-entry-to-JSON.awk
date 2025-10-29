#!/usr/bin/awk -f

#
# Converts "chapter:entry" lines into a single JSON object (map).
#

# BEGIN block: Runs once before processing.
BEGIN {
    # Set the Field Separator to a colon.
    FS = ":"
    import = "import { RecipeDictionaryMap } from"
    from = "\"@/types/generated.ts/chapter-entry-schema\";"
    print import, from, "\n\n"
    printf "const dictionary: RecipeDictionaryMap = {\n"
    # Use a flag to handle commas correctly.
    first_line = 1
}

# Main block: Runs for every single line.
{
    if (!first_line) {
        # If this isn't the first line, print a comma and a newline
        # to separate it from the previous entry.
        printf ",\n"
    }
    first_line = 0

    # Print the formatted key-value pair.
    # $2 is the entry (e.g., "26a"), $1 is the chapter.
    # Indented with two spaces for readability.
    printf "  \"%s\": \"%s\"", $2, $1
}

# END block: Runs once after all lines have been processed.
END {
    # Print a final newline and the closing brace for the object.
    print "\n};\n\nexport default dictionary"
}