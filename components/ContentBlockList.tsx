import { ContentBlock } from "@/types/generated.ts/content-block-schema"
import React from "react"

// The props now match how the component is used in Entry.tsx
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
    // Choose between an ordered or unordered list based on the isOrdered prop
    const ListComponent = isOrdered ? "ol" : "ul"

    // Base classes for the list styling
    const listClasses = `space-y-2 prose prose-gray max-w-none`
    const listItemClasses = isOrdered ? "list-decimal" : "list-disc"

    return (
        <div>
            {/* Render the title passed from Entry.tsx */}
            <h5 className="text-xl font-semibold text-gray-800 mb-3">
                {title}
            </h5>

            <ListComponent className={`${listClasses} ${listItemClasses} ml-5`}>
                {/* Map over the array of items (ingredients, instructions, etc.) */}
                {items.map((item, index) => (
                    <li key={index}>
                        {
                            /* 
                            Check the type of the content block.
                            Based on content-block-schema.json, it's either a string or an object.
                            */}
                        {typeof item === "string" ? (
                            // If it's a simple string, render it directly.
                            <span>{item}</span>
                        ) : (
                            // If it's an object, map over its entries to render the title and details.
                            Object.entries(item).map(([subTitle, details]) => (
                                <div key={subTitle}>
                                    <strong>{subTitle}</strong>
                                    <ul className="list-circle ml-5 mt-1 space-y-1">
                                        {details.map((detail, detailIndex) => (
                                            <li key={detailIndex}>{detail}</li>
                                        ))}
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
