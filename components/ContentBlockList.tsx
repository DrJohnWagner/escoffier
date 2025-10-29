// components/ContentBlockList.tsx

import { ContentBlock } from "@/types/generated.ts/content-block-schema"
import React from "react"
import EntryText from "@/components/EntryText"

interface ContentBlockListProps {
    title?: string
    items: ContentBlock[]
    isOrdered?: boolean
}

const ContentBlockList: React.FC<ContentBlockListProps> = ({
    title,
    items,
    isOrdered = false,
}) => {
    const ListComponent = isOrdered ? "ol" : "ul"

    // --- THE FIX IS HERE ---
    // Remove the 'prose', 'prose-gray', and 'max-w-none' classes.
    // The parent component is already providing the 'prose' context,
    // so these styles will cascade down to the <ul> and its children correctly.
    const listClasses = `space-y-2`
    // --- END OF FIX ---

    const listItemClasses = isOrdered ? "list-decimal" : "list-disc"

    return (
        <div>
            {title && (
                <h5 className="text-xl font-semibold text-gray-800 mb-3">
                    {title}
                </h5>
            )}
            <ListComponent className={`${listClasses} ${listItemClasses} ml-5`}>
                {items.map((item, index) => (
                    <li key={index}>
                        {/* Your existing logic here is perfectly fine. */}
                        {typeof item === "string" ? (
                            <span>
                                <EntryText text={item} />
                            </span>
                        ) : Array.isArray(item) ? (
                            <div className="space-y-2">
                                {item.map((paragraph, pIndex) => (
                                    <p key={pIndex} className="!my-0">
                                        <EntryText text={paragraph} />
                                    </p>
                                ))}
                            </div>
                        ) : (
                            Object.entries(item).map(([subTitle, details]) => (
                                <div key={subTitle}>
                                    <strong>{subTitle}</strong>
                                    <ul className="list-circle ml-5 mt-1 space-y-1">
                                        {Array.isArray(details) ? (
                                            details.map(
                                                (detail, detailIndex) => (
                                                    <li key={detailIndex}>
                                                        <EntryText
                                                            text={detail}
                                                        />
                                                    </li>
                                                )
                                            )
                                        ) : details ? (
                                            <li>
                                                <EntryText
                                                    text={String(details)}
                                                />
                                            </li>
                                        ) : null}
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
