// functions/createCookbookTOC.ts

import TableOfContentsItemType from "@/types/TableOfContentsItemType"
import { CookbookTableOfContents } from "@/types/generated.ts/cookbook-schema"

/**
 * Convert the cookbook's table of contents into the flat shape that the
 * `TableOfContents` component expects.
 */
const createCookbookTOC = (
    contents: CookbookTableOfContents
): TableOfContentsItemType[] => {
    return contents.map((part) => ({
        title: `PART ${part.part}: ${part.title}`,
        children: part.chapters.map((chapter) => ({
            title: `Chapter ${chapter.chapter}: ${chapter.title}`,
            link: `/chapters/${chapter.id}`,
            children: [],
        })),
    }))
}

export default createCookbookTOC
