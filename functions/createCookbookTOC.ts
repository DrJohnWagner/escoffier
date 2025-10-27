// types/createCookbookTOC.ts

import TableOfContentsItemType from "@/types/TableOfContentsItemType"
import { Cookbook } from "@/types/generated.ts/cookbook-schema"

// Adapter #1: Transforms the Cookbook's Table of Contents
const createCookbookTOC = (
    cookbookData: Cookbook
): TableOfContentsItemType[] => {
    return cookbookData.contents.map((part) => ({
        title: `PART ${part.part}: ${part.title}`,
        // --- MODIFICATION HERE ---
        // REMOVED: link: null,
        // By omitting 'link', it becomes 'undefined' and matches the optional type.
        children: part.chapters.map((chapter) => ({
            title: `Chapter ${chapter.chapter}: ${chapter.title}`,
            link: `/chapters/${chapter.id}`,
            children: [],
        })),
    }))
}

export default createCookbookTOC
