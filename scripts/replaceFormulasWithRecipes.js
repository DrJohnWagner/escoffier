#!/usr/bin/env node

/**
 * A Node.js script that reads text from stdin, replaces various "Formula" patterns
 * with "Recipe ####", and writes the transformed text to stdout.
 */

/**
 * Finds all occurrences of "Formula No. ####", "Formula ####", or "No. ####"
 * in a text and replaces them with "Recipe ####".
 *
 * @param {string} text The input text to process.
 * @returns {string} The new text with all patterns replaced.
 */
function replaceFormulasWithRecipes(text) {
    // Regex to match all three patterns case-insensitively and globally.
    // The identifier (\d+[a-zA-Z]?) is captured for reuse.
    const regex = /(?:Formula\s+No\.|Formula|No\.)\s+(\d+[a-zA-Z]?)/gi

    // '$1' in the replacement string refers to the first captured group (the identifier).
    return text.replace(regex, "Recipe $1")
}

/**
 * Reads all data from stdin, calls the processing function, and writes to stdout.
 */
function main() {
    let inputText = ""

    // Set encoding to handle text properly
    process.stdin.setEncoding("utf8")

    // Listen for 'data' chunks and append them
    process.stdin.on("data", (chunk) => {
        inputText += chunk
    })

    // When the input stream ends, process the complete text
    process.stdin.on("end", () => {
        const updatedText = replaceFormulasWithRecipes(inputText)
        // Write the final result to standard output
        process.stdout.write(updatedText)
    })

    process.stdin.on("error", (err) => {
        console.error(err)
    })
}

// Run the main function
main()
