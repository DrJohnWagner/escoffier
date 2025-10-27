#!/usr/bin/awk -f

#
# A standard, portable awk script to convert "key:value" lines
# into a JSON array of objects.
#

# BEGIN block: Runs once before processing any lines.
BEGIN {
    # Set the Field Separator to a colon.
    FS = ":"
    # Print the opening bracket for the JSON array.
    print "["
}

# Main block: Runs for every single line in the input file.
{
    # If this is not the first line (NR > 1), print a comma and a newline
    # to correctly separate the JSON objects.
    if (NR > 1) {
        printf ",\n"
    }

    # Print the formatted JSON object for the current line.
    # $1 is the part before the colon (chapter).
    # $2 is the part after the colon (entry).
    # The output is indented with two spaces for readability.
    printf "  { \"chapter\": \"%s\", \"entry\": \"%s\" }", $1, $2
}

# END block: Runs once after all lines have been processed.
END {
    # Print a final newline and the closing bracket for the array.
    print "\n]"
}