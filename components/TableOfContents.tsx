// components/TableOfContents.tsx

import React from "react"
import Link from "next/link"
import TableOfContentsItemType from "@/types/TableOfContentsItemType"

// We no longer need the TOCEntriesList helper component.

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

    // --- NEW LOGIC: FLATTEN THE DATA STRUCTURE ---
    // Use flatMap to create a single array containing all sections and their children.
    // We add an `isSectionHeader` flag to each item to style it differently in the render loop.
    const allItems = items.flatMap((section) => {
        const sectionHeader = { ...section, isSectionHeader: true }
        const children =
            section.children?.map((child) => ({
                ...child,
                isSectionHeader: false,
            })) || []

        // Return an array containing the section header followed by all its children.
        // flatMap will merge all these arrays into one.
        return [sectionHeader, ...children]
    })
    // --- END OF NEW LOGIC ---

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
                {/* Now, we map over the single, flat array of all items */}
                {allItems.map((item, index) => (
                    // Use a unique key based on the title and index
                    <div key={`${item.title}-${index}`}>
                        {/* --- RENDER LOGIC BASED ON THE 'isSectionHeader' FLAG --- */}
                        {item.isSectionHeader ? (
                            // It's a section header. Render it as a bold heading or link.
                            <>
                                {topLevelItemsAreLinks && item.link ? (
                                    <Link
                                        href={item.link}
                                        className="text-xl font-semibold text-gray-800 hover:text-blue-600 hover:underline"
                                    >
                                        {item.title}
                                    </Link>
                                ) : (
                                    <h3 className="text-2xl font-semibold text-gray-700">
                                        {item.title}
                                    </h3>
                                )}
                            </>
                        ) : (
                            // It's a child item. Render it as a smaller, indented link.
                            <div className="pl-4">
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
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </nav>
    )
}

export default TableOfContents
