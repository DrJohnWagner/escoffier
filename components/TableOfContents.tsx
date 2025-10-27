// components/TableOfContents.tsx

import React from "react"
import Link from "next/link"
import TableOfContentsItemType from "@/types/TableOfContentsItemType"

// A small, recursive component to render the nested list of entries
const TOCEntriesList: React.FC<{ items: TableOfContentsItemType[] }> = ({
    items,
}) => {
    return (
        <ul className="space-y-2 mt-2 pl-4">
            {items.map((item) => (
                <li key={item.title}>
                    {/* This check is already correct for nested items */}
                    {item.link ? (
                        <Link
                            href={item.link}
                            className="text-lg text-gray-600 hover:text-blue-600 hover:underline transition-colors"
                        >
                            {item.title}
                        </Link>
                    ) : (
                        <span className="text-lg text-gray-600">
                            {item.title}
                        </span>
                    )}
                </li>
            ))}
        </ul>
    )
}

// The props for our new, unified component
type TableOfContentsProps = {
    items: TableOfContentsItemType[]
    title: string
    variant: "page" | "chapter"
    topLevelItemsAreLinks: boolean
}

const TableOfContents: React.FC<TableOfContentsProps> = ({
    items,
    title,
    variant,
    topLevelItemsAreLinks,
}) => {
    if (!items || items.length === 0) {
        return null
    }

    const containerClasses =
        variant === "chapter" ? "chapter-toc my-10 p-8" : "table-of-contents"
    const gridGapClass = variant === "chapter" ? "gap-y-4" : "gap-y-8"

    return (
        <nav className={containerClasses}>
            <h2 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6 text-center">
                {title}
            </h2>
            <div
                className={`grid grid-cols-1 md:grid-cols-2 gap-x-12 ${gridGapClass}`}
            >
                {items.map((item) => (
                    <div key={item.title}>
                        {/* --- MODIFICATION HERE --- */}
                        {/*
						  Render a link only if topLevelItemsAreLinks is true AND
						  the specific item has a valid link property.
						*/}
                        {topLevelItemsAreLinks && item.link ? (
                            <Link
                                href={item.link}
                                className="text-xl font-semibold text-gray-800 hover:text-blue-600 hover:underline"
                            >
                                {item.title}
                            </Link>
                        ) : (
                            // Fallback for all non-link cases
                            <h3 className="text-2xl font-semibold text-gray-700">
                                {item.title}
                            </h3>
                        )}

                        {item.children && item.children.length > 0 && (
                            <TOCEntriesList items={item.children} />
                        )}
                    </div>
                ))}
            </div>
        </nav>
    )
}

export default TableOfContents
