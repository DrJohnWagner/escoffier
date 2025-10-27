// functions/generateSlug.ts

/**
 * Generates a URL-friendly "slug" from a given string.
 * This is used to create anchor links for section titles.
 *
 * @param text The string to convert into a slug.
 * @returns A URL-friendly slug string.
 *
 * @example
 * // returns "the-quick-brown-fox"
 * generateSlug("The Quick Brown Fox!");
 */
export default function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(/[^\w-]+/g, "") // Remove all non-word chars
}
