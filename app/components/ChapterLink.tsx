import React from "react"
import Link from "next/link"

interface ChapterLinkProps {
    chapter: {
        id: string
        title: string
    }
    direction: "previous" | "next"
}

const ChapterLink: React.FC<ChapterLinkProps> = ({ chapter, direction }) => {
    const isNext = direction === "next"
    const className = `text-blue-600 hover:underline font-medium${
        isNext ? " ml-auto" : ""
    }`
    const label = isNext
        ? `Next chapter: ${chapter.title} →`
        : `← Previous chapter: ${chapter.title}`

    return (
        <Link href={`/chapters/${chapter.id}`} className={className}>
            {label}
        </Link>
    )
}

export default ChapterLink