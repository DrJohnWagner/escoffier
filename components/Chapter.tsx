// components/Chapter.tsx

import React from "react"
import Section from "./Section"
import { CookbookChapter } from "@/types/generated.ts/chapter-schema"
import TableOfContents from "./TableOfContents" // Import the new component
import createChapterTOC from "@/functions/createChapterTOC" // 1. Import the function
import "@/app/globals.css"

const Chapter: React.FC<{ data: CookbookChapter }> = ({ data }) => {
    const tocItems = createChapterTOC({ sections: data.sections })

    return (
        <article
            id={data.id}
            className="chapter max-w-4xl mx-auto my-12 p-8 md:p-12 rounded-lg shadow-lg border border-gray-200"
        >
            <header className="chapter-header mb-10">
                <h4 className="mx-12 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 text-center">
                    {data.title}
                </h4>
            </header>

            {/* --- THIS IS THE NEW SECTION --- */}
            {/* Render the chapter-specific TOC if there are sections */}
            {data.sections && data.sections.length > 0 && (
                <TableOfContents
                    items={tocItems}
                    title="In This Chapter"
                    variant="chapter"
                    topLevelItemsAreLinks={true}
                />
            )}
            {/* --- END OF NEW SECTION --- */}

            {data.introduction && (
                <div className="chapter-introduction prose prose-xl max-w-none text-gray-600 leading-relaxed">
                    {data.introduction.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                </div>
            )}

            <div className="chapter-body">
                {data.sections.map((section) => (
                    <Section key={section.title} section={section} />
                ))}
            </div>
        </article>
    )
}

export default Chapter
