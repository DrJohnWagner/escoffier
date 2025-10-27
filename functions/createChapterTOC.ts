// functions/createChapterTOC.ts

import {
    ChapterSection,
    InstructionalEntry,
} from "@/types/generated.ts/chapter-schema"
import TableOfContentsItemType from "@/types/TableOfContentsItemType"

// A simple helper function to create URL-friendly slugs for anchor links.
function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
}

const createChapterTOC = (chapterData: {
    sections: ChapterSection[]
}): TableOfContentsItemType[] => {
    // This function can be recursive to handle nested sections
    function transformSections(
        sections: ChapterSection[]
    ): TableOfContentsItemType[] {
        return sections.map((section) => {
            // --- THIS IS THE FIX ---
            // 1. Map the entries for the current section into the correct shape.
            const entryChildren = section.entries
                ? section.entries.map((entry: InstructionalEntry) => ({
                      title: `${entry.number}. ${entry.title}`,
                      link: `#entry-${entry.number}`,
                  }))
                : []

            // 2. Recursively transform any nested sub-sections.
            const sectionChildren = section.sections
                ? transformSections(section.sections)
                : []

            // 3. Return the complete object for the TOC component.
            return {
                title: section.title,
                // This link will jump to the section header itself.
                // We'll need to add an `id` to the Section component for this to work.
                link: `#${generateSlug(section.title)}`,
                children: [...entryChildren, ...sectionChildren],
            }
        })
    }

    if (!chapterData || !chapterData.sections) {
        return []
    }

    return transformSections(chapterData.sections)
}

export default createChapterTOC
