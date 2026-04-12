// functions/createChapterTOC.ts

import { ChapterSection } from "@/types/generated.ts/chapter-schema"
import { InstructionalEntry } from "@/types/generated.ts/entry-schema"
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
    entries: Map<string, InstructionalEntry>
}): TableOfContentsItemType[] => {
    function transformSections(
        sections: ChapterSection[]
    ): TableOfContentsItemType[] {
        return sections.map((section) => {
            const entryChildren = (section.entryIDs ?? [])
                .map((id) => {
                    const entry = chapterData.entries.get(id)
                    if (!entry) return null
                    return {
                        title: `${entry._id}. ${entry.title}`,
                        link: `#entry-${entry._id}`,
                    } satisfies TableOfContentsItemType
                })
                .filter((item): item is NonNullable<typeof item> => item !== null)

            const sectionChildren = section.sections
                ? transformSections(section.sections)
                : []

            return {
                title: section.title,
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
