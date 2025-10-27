// components/ContentBlockList.tsx

import { ContentBlock } from "@/types/generated.ts/content-block-schema"
import React from "react"

interface ContentBlockListProps {
    title: string
    items: ContentBlock[]
    isOrdered?: boolean
}

const ContentBlockList: React.FC<ContentBlockListProps> = ({
    title,
    items,
    isOrdered = false,
}) => {
    const ListComponent = isOrdered ? "ol" : "ul"
    const listClasses = `space-y-2 prose prose-gray max-w-none`
    const listItemClasses = isOrdered ? "list-decimal" : "list-disc"

    return (
        <div>
            <h5 className="text-xl font-semibold text-gray-800 mb-3">
                {title}
            </h5>

            <ListComponent className={`${listClasses} ${listItemClasses} ml-5`}>
                {items.map((item, index) => (
                    <li key={index}>
                        {typeof item === "string" ? (
                            <span>{item}</span>
                        ) : (
                            Object.entries(item).map(([subTitle, details]) => (
                                <div key={subTitle}>
                                    <strong>{subTitle}</strong>
                                    <ul className="list-circle ml-5 mt-1 space-y-1">
                                        {/* --- FIX IS HERE --- */}
                                        {/* First, check if 'details' is an array. */}
                                        {Array.isArray(details) ? (
                                            // If it is, map over it as before.
                                            details.map((detail, detailIndex) => (
                                                <li key={detailIndex}>{detail}</li>
                                            ))
                                        ) : // If it's not an array, render it as a single item to prevent crashing.
                                        details ? (
                                            <li>{String(details)}</li>
                                        ) : null}
                                        {/* --- END OF FIX --- */}
                                    </ul>
                                </div>
                            ))
                        )}
                    </li>
                ))}
            </ListComponent>
        </div>
    )
}

export default ContentBlockList