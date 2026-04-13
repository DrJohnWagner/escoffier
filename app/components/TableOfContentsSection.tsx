import React from "react"
import Link from "next/link"
import TableOfContentsItemType from "@/types/TableOfContentsItemType"

interface TableOfContentsSectionProps {
    item: TableOfContentsItemType
    topLevelItemsAreLinks: boolean
}

const TableOfContentsSection: React.FC<TableOfContentsSectionProps> = ({
    item,
    topLevelItemsAreLinks,
}) => {
    return (
        <section className="mb-6">
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

            {item.children && item.children.length > 0 && (
                <div className="mt-4 space-y-4">
                    {item.children.map((child, index) => (
                        <div key={`${child.title}-${index}`} className="pl-4">
                            {child.link ? (
                                <Link
                                    href={child.link}
                                    className="text-lg text-gray-600 hover:text-blue-600 hover:underline transition-colors"
                                >
                                    {child.title}
                                </Link>
                            ) : (
                                <span className="text-lg text-gray-600">
                                    {child.title}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}

export default TableOfContentsSection