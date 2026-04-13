// components/TableOfContents.tsx

import React from "react"
import Link from "next/link"
import TableOfContentsSection from "@/components/TableOfContentsSection"
import TableOfContentsItemType from "@/types/TableOfContentsItemType"

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

    const allItems = items.flatMap((section) => {
        const sectionHeader = { ...section, isSectionHeader: true }
        const children =
            section.children?.map((child) => ({
                ...child,
                isSectionHeader: false,
            })) || []
        return [sectionHeader, ...children]
    })

    const containerClasses =
        variant === "chapter" ? "chapter-toc my-10 p-8" : "table-of-contents"
    const itemMarginClass = variant === "chapter" ? "mb-2" : "mb-4"

    return (
        <nav className={containerClasses}>
            <h2 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6 text-center">
                {title}
            </h2>
            {variant === "page" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                    {items.map((item, index) => (
                        <TableOfContentsSection
                            key={`${item.title}-${index}`}
                            item={item}
                            topLevelItemsAreLinks={topLevelItemsAreLinks}
                        />
                    ))}
                </div>
            ) : (
                <div className="columns-1 md:columns-2">
                    {allItems.map((item, index) => (
                        <div
                            key={`${item.title}-${index}`}
                            className={`break-inside-avoid ${itemMarginClass}`}
                        >
                            {item.isSectionHeader ? (
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
            )}
        </nav>
    )
}

export default TableOfContents
