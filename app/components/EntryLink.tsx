import React from "react"
import Link from "next/link"

interface EntryLinkProps {
    chapterId: string
    entryNumber: string
    title?: string
    direction: "previous" | "next"
}

const EntryLink: React.FC<EntryLinkProps> = ({
    chapterId,
    entryNumber,
    title,
    direction,
}) => {
    const isNext = direction === "next"
    const className = `text-blue-600 hover:underline font-medium${
        isNext ? " ml-auto" : ""
    }`
    const label = isNext
        ? `Next: ${title ?? entryNumber} →`
        : `← Previous: ${title ?? entryNumber}`

    return (
        <Link href={`/chapters/${chapterId}/entries/${entryNumber}`} className={className}>
            {label}
        </Link>
    )
}

export default EntryLink