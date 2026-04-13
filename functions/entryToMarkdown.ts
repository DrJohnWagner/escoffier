// functions/entryToMarkdown.ts

import {
    ContentBlock,
    InstructionalEntry,
    Recipe,
} from "@/types/generated.ts/entry-schema"

const isRecipe = (entry: InstructionalEntry): entry is Recipe =>
    entry.type === "recipe"

function blockToText(block: ContentBlock): string {
    if (typeof block === "string") {
        return block
    }
    return `${block.title}\n${block.content.map(blockToText).join("\n")}`
}

export function entryToMarkdown(entry: InstructionalEntry): string {
    const sections: string[] = []

    sections.push(`## ${entry._id}. ${entry.title}`)

    if (isRecipe(entry) && entry.yield) {
        sections.push(`*${entry.yield}*`)
    }

    if (isRecipe(entry) && entry.ingredients.length > 0) {
        const lines = entry.ingredients.map((i) => `- ${blockToText(i)}`)
        sections.push(`### Ingredients\n${lines.join("\n")}`)
    }

    if (isRecipe(entry) && entry.instructions.length > 0) {
        const lines = entry.instructions.map(
            (i, idx) => `${idx + 1}. ${blockToText(i)}`
        )
        sections.push(`### Instructions\n${lines.join("\n")}`)
    }

    if (entry.notes && entry.notes.length > 0) {
        const lines = entry.notes.map((n) => `> ${blockToText(n)}`)
        sections.push(lines.join("\n"))
    }

    return sections.join("\n\n")
}
