// components/Chapter.tsx

import React from "react"
import Link from "next/link"
import Section from "./Section"
import { CookbookChapter } from "@/types/generated.ts/chapter-schema"
import { InstructionalEntry } from "@/types/generated.ts/entry-schema"
import TableOfContents from "./TableOfContents"
import createChapterTOC from "@/functions/createChapterTOC"
import "@/app/globals.css"

interface AdjacentChapter {
    id: string
    title: string
}

interface ChapterProps {
    data: CookbookChapter
    entries: Map<string, InstructionalEntry>
    prevChapter?: AdjacentChapter
    nextChapter?: AdjacentChapter
}

const Chapter: React.FC<ChapterProps> = ({
    data,
    entries,
    prevChapter,
    nextChapter,
}) => {
    const tocItems = createChapterTOC({ sections: data.sections, entries })

    return (
        <article
            id={data._id}
            className="chapter max-w-4xl mx-auto my-12 p-8 md:p-12 rounded-lg shadow-lg border border-gray-200"
        >
            <header className="chapter-header mb-10">
                <h4 className="mx-12 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 text-center">
                    {data.title}
                </h4>
            </header>

            {data.sections && data.sections.length > 0 && (
                <TableOfContents
                    items={tocItems}
                    title="In This Chapter"
                    variant="chapter"
                    topLevelItemsAreLinks={true}
                />
            )}

            {data.introduction && (
                <div className="chapter-introduction prose prose-xl max-w-none text-gray-600 leading-relaxed">
                    {data.introduction.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                </div>
            )}

            <div className="chapter-body">
                {data.sections.map((section) => (
                    <Section
                        key={section._id}
                        section={section}
                        chapterId={data._id}
                        entries={entries}
                    />
                ))}
            </div>

            {(prevChapter || nextChapter) && (
                <nav className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
                    {prevChapter && (
                        <Link
                            href={`/chapters/${prevChapter.id}`}
                            className="text-blue-600 hover:underline font-medium"
                        >
                            {`← Previous chapter: ${prevChapter.title}`}
                        </Link>
                    )}
                    {nextChapter && (
                        <Link
                            href={`/chapters/${nextChapter.id}`}
                            className="text-blue-600 hover:underline font-medium ml-auto"
                        >
                            {`Next chapter: ${nextChapter.title} →`}
                        </Link>
                    )}
                </nav>
            )}
        </article>
    )
}

export default Chapter
