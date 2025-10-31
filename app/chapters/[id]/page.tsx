// app/chapters/[id]/page.tsx

import Chapter from "@/components/Chapter"
import getData from "@/functions/getData"
import {
    Cookbook,
    PartEntry,
    ChapterEntry,
} from "@/types/generated.ts/cookbook-schema"
import { CookbookChapter } from "@/types/generated.ts/chapter-schema"
import "@/app/globals.css"

export async function generateStaticParams() {
    const cookbook = (await getData(["cookbook.json"])) as Cookbook
    const allChapterIds = cookbook.contents.flatMap((part: PartEntry) =>
        part.chapters.map((chapter: ChapterEntry) => chapter.id)
    )
    return allChapterIds.map((id: string) => ({ id }))
}

export default async function ChapterPage({
    params,
}: {
    params: { id: string }
}) {
    const { id } = await params
    const chapter = (await getData([
        "chapters",
        `${id}.json`,
    ])) as CookbookChapter

    if (!chapter) {
        return (
            <div>
                Chapter not found! (Could not find a chapter with id: {id})
            </div>
        )
    }

    // The Chapter component now handles its own internal TOC.
    // No need to render a separate TOC component here.
    return <Chapter data={chapter} />
}
