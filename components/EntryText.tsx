"use client"

import React, { JSX } from "react"
import extractEntryNumbers from "@/functions/extractEntryNumbers" // Adjust path as needed
import dictionary from "@/data/chapter-entry-dictionary"

// Define the component's props
interface EntryTextProps {
    text: string
}

/**
 * A React component that takes a text string, finds all recipe identifiers
 * within it (e.g., "Recipe 123a"), and replaces them with clickable links.
 */
const EntryText: React.FC<EntryTextProps> = ({ text }) => {
    // Extract all identifiers and their locations.
    const foundIdentifiers = extractEntryNumbers(text)
    // If no valid recipe list is found, simply return the original text.
    if (!foundIdentifiers) {
        return <>{text}</>
    }
    // This is the core logic: we build an array of mixed strings and JSX elements.
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    // Iterate through each identifier that was found.
    foundIdentifiers.forEach((found, i) => {
        // Add the plain text part BEFORE the current identifier.
        // This is the slice of text from the end of the last
        // match to the start of this one.
        if (found.index > lastIndex) {
            parts.push(text.substring(lastIndex, found.index))
        }
        // Directly access the chapter using the identifier as the key.
        const chapter = dictionary[found.identifier]
        if (chapter) {
            // If a chapter was found, create the link.
            const href = `/chapters/${chapter}#entry-${found.identifier}`
            parts.push(
                <a key={`${found.identifier}-${i}`} href={href}>
                    {found.identifier}
                </a>
            )
        } else {
            // If the key doesn't exist, render as plain text.
            parts.push(found.identifier)
        }
        // Update our cursor to the position right after the current identifier.
        lastIndex = found.index + found.identifier.length
    })
    // 4. After the loop, add any remaining plain text from the end of the last match
    // to the end of the original string.
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex))
    }
    // React can render an array of strings and elements directly.
    // We wrap it in a fragment to avoid adding an extra DOM node.
    return <>{parts}</>
}

export default EntryText
