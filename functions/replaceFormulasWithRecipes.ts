/**
 * Finds all occurrences of "Formula No. ####", "Formula ####", or "No. ####"
 * in a text and replaces them with "Recipe ####".
 *
 * The identifier (####) is defined as one or more digits, optionally
 * followed by a single letter. Case is ignored for the search patterns.
 *
 * @param text The input text to process.
 * @returns The new text with all patterns replaced.
 */
function replaceFormulasWithRecipes(text: string): string {
    // Regex Breakdown:
    // ( ... )       -> A non-capturing group for the prefixes.
    // Formula\s+No\. | Formula | No\. -> The core logic. It looks for the longest match first
    //                 ("Formula No.") to avoid partially matching just "Formula".
    //                 '|' means OR. '\s+' is one or more spaces. '\.' is a literal dot.
    // \s+           -> Matches the space(s) separating the prefix from the identifier.
    // ( ... )       -> A CAPTURING GROUP for the identifier itself. This is key.
    // \d+           -> One or more digits.
    // [a-zA-Z]?     -> An optional single letter (a-z or A-Z).
    // Flags:
    // g -> Global: Replace all occurrences, not just the first one.
    // i -> Case-Insensitive: Match "formula", "Formula", "FORMULA", etc.
    const regex = /(?:Formula\s+No\.|Formula|No\.)\s+(\d+[a-zA-Z]?)/gi

    // The .replace() method can use a special syntax for replacement strings:
    // '$1' refers to the content of the first capturing group. In our regex,
    // the first (and only) capturing group is the identifier `(\d+[a-zA-Z]?)`.
    return text.replace(regex, "Recipe $1")
}

// --- Usage Examples ---

// const inputText = `
// For this experiment, first consult Formula No. 101.
// Then, mix it with the contents from Formula 23a.
// Finally, add the catalyst from No. 45c as described.
// Do not use formula 99. The results of formula no. 102b were inconclusive.
// `

// const updatedText = replaceFormulasWithRecipes(inputText)

// console.log("--- ORIGINAL TEXT ---")
// console.log(inputText)

// console.log("\n--- UPDATED TEXT ---")
// console.log(updatedText)
// /*
// Expected Output:
// --- UPDATED TEXT ---

// For this experiment, first consult Recipe 101.
// Then, mix it with the contents from Recipe 23a.
// Finally, add the catalyst from Recipe 45c as described.
// Do not use Recipe 99. The results of Recipe 102b were inconclusive.

// */

// console.log("\n--- Another Example ---")
// const singleLine = "Check No. 505 and Formula 506b."
// const updatedLine = replaceFormulasWithRecipes(singleLine)
// console.log(`Original: "${singleLine}"`)
// console.log(`Updated:  "${updatedLine}"`)
// Expected Output: Updated: "Check Recipe 505 and Recipe 506b."

export default replaceFormulasWithRecipes;