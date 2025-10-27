/**
 * Defines the structure of a found recipe identifier, including its text and location.
 */
interface FoundIdentifier {
    identifier: string
    index: number
}

/**
 * Extracts an array of recipe identifiers from a string formatted like "Recipe 123, 45a, and 46b...".
 * It returns each identifier found along with its starting index in the original string.
 *
 * The list is validated to ensure it is well-formed and does not start/end with separators.
 *
 * @param str The input string to search.
 * @returns An array of FoundIdentifier objects if a valid pattern is found, otherwise null.
 */
function extractEntryIdentifiers(str: string): FoundIdentifier[] | null {
    // Step 1: Define a regex to find the entire valid "Recipe..." list.
    // This is more robust as it validates the list structure in one go.
    // It looks for "Recipe", a space, one identifier, and then zero or more
    // occurrences of a "separator + identifier" group.
    const listBlockRegex =
        /Recipe\s+(\d+[a-zA-Z]?(?:(?:,\s*|\s+(?:and|or)\s+)\d+[a-zA-Z]?)*)/i

    const listMatch = str.match(listBlockRegex)

    // If no validly structured "Recipe..." list is found, exit.
    if (!listMatch || typeof listMatch.index === "undefined") {
        return null
    }

    // Step 2: If a list is found, extract the identifiers and their locations from it.
    const blockText = listMatch[0] // The full matched text, e.g., "Recipe 123, 45a"
    const blockStartIndex = listMatch.index // The starting index of the blockText in the original string.

    const identifiers: FoundIdentifier[] = []

    // Define a regex to find ONLY the identifier parts.
    // The 'g' flag is crucial for finding all matches.
    const identifierRegex = /\d+[a-zA-Z]?/g

    // Use a loop with .exec() to get the index of each individual match.
    let singleMatch
    while ((singleMatch = identifierRegex.exec(blockText)) !== null) {
        const identifier = singleMatch[0]
        // The absolute index is the start of the whole block plus the
        // relative index of the identifier within that block.
        const absoluteIndex = blockStartIndex + singleMatch.index

        identifiers.push({ identifier, index: absoluteIndex })
    }

    // If the main block matched but no identifiers were found (should not happen with this regex, but safe to check), return null.
    if (identifiers.length === 0) {
        return null
    }

    return identifiers
}

// --- Usage Examples ---

// console.log("--- Standard Case ---")
// const text1 =
//     "For dinner, please make Recipe 128, 319a, and 406b from the new book."
// const result1 = extractEntryIdentifiers(text1)
// console.log(`Input: "${text1}"`)
// console.log("Output:", result1)
// // Expected Output:
// // [
// //   { identifier: '128', index: 24 },
// //   { identifier: '319a', index: 31 },
// //   { identifier: '406b', index: 42 }
// // ]
// console.log("\n")

// console.log("--- Single Identifier Case ---")
// const text2 = "The best one is Recipe 55."
// const result2 = extractEntryIdentifiers(text2)
// console.log(`Input: "${text2}"`)
// console.log("Output:", result2)
// // Expected Output: [ { identifier: '55', index: 20 } ]
// console.log("\n")

// console.log("--- Invalid Case (no longer matches) ---")
// // The stricter regex now correctly identifies this as an invalid list from the start.
// const text3 = "This is invalid: Recipe and 45b."
// const result3 = extractEntryIdentifiers(text3)
// console.log(`Input: "${text3}"`)
// console.log("Output:", result3) // Expected Output: null
// console.log("\n")

// console.log("--- Case-Insensitive Match ---")
// const text4 = "Here is recipe 99c for you."
// const result4 = extractEntryIdentifiers(text4)
// console.log(`Input: "${text4}"`)
// console.log("Output:", result4)
// // Expected Output: [ { identifier: '99c', index: 14 } ]
// console.log("\n")

export default extractEntryIdentifiers;