// components/Section.tsx

import React from "react"
import Entry from "./Entry"
import { ChapterSection } from "@/types/generated.ts/chapter-schema"
import { InstructionalEntry } from "@/types/generated.ts/entry-schema"
import generateSlug from "@/functions/generateSlug"

interface SectionProps {
    section: ChapterSection
    chapterId: string
    entries: Map<string, InstructionalEntry>
}

const Section: React.FC<SectionProps> = ({ section, chapterId, entries }) => {
    const slug = generateSlug(section.title)

    const sectionEntries = (section.entryIDs ?? [])
        .map((id) => entries.get(id))
        .filter((e): e is InstructionalEntry => e !== undefined)

    return (
        <section id={slug} className="chapter-section mt-6 scroll-mt-20">
            <header>
                <h3 className="text-3xl font-bold text-gray-900 pb-4 mb-6 border-b border-gray-200">
                    {section.title}
                </h3>
            </header>

            <div className="prose prose-lg max-w-none">
                {section.introduction &&
                    section.introduction.map((p, i) => <p key={i}>{p}</p>)}
            </div>

            {sectionEntries.map((entry) => (
                <Entry key={entry._id} entry={entry} />
            ))}

            {section.sections &&
                section.sections.map((subSection) => (
                    <Section
                        key={subSection._id}
                        section={subSection}
                        chapterId={chapterId}
                        entries={entries}
                    />
                ))}
        </section>
    )
}

export default Section
