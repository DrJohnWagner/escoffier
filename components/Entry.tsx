import React from "react"
import { InstructionalEntry } from "@/types/generated.ts/chapter-schema"
import ContentBlockList from "./ContentBlockList"
import EntryText from "@/components/EntryText"

const Entry: React.FC<{ entry: InstructionalEntry }> = ({ entry }) => {
    return (
        // Each entry is a "card" with a border, padding, and vertical margin
        <div
            id={`entry-${entry.number}`}
            className="entry bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8"
        >
            <header>
                {/* Entry title */}
                <h4 className="text-2xl font-semibold text-gray-800 mb-4">
                    <span className="text-gray-400 mr-2">{entry.number}</span>—
                    <span className="entry-title">{entry.title}</span>
                </h4>
            </header>

            {/* The introduction for a principle, definition, etc. */}
            {entry.introduction && (
                <div className="entry-introduction prose prose-gray max-w-none mb-4">
                    {typeof entry.introduction === "string" ? (
                        <p><EntryText text={entry.introduction} /></p>
                    ) : (
                        <ContentBlockList items={[entry.introduction]} />
                    )}
                </div>
            )}

            {/* Only render this section if the type is 'recipe' */}
            {entry.type === "recipe" && (
                <div className="recipe-details space-y-4">
                    {entry.yield && (
                        <p className="recipe-yield text-gray-600 italic">
                            <strong>Yield:</strong> {entry.yield}
                        </p>
                    )}
                    <ContentBlockList
                        title="Ingredients"
                        items={entry.ingredients}
                    />
                    <ContentBlockList
                        title="Instructions"
                        items={entry.instructions}
                        isOrdered={true}
                    />
                </div>
            )}

            {/* The notes section, styled as a distinct "callout" box */}
            {entry.notes && (
                <aside className="entry-notes mt-6 p-4 bg-gray-50 rounded-md border-l-4 border-gray-300">
                    <ContentBlockList title="Notes" items={entry.notes} />
                </aside>
            )}
        </div>
    )
}
export default Entry
