// components/Section.tsx

import React from "react"
import Entry from "./Entry"
import { ChapterSection } from "@/types/generated.ts/chapter-schema"
import generateSlug from "@/functions/generateSlug" // Import the slug function

const Section: React.FC<{ section: ChapterSection }> = ({ section }) => {
    const slug = generateSlug(section.title) // Generate the slug

    return (
        // Add the `id` attribute for anchor linking
        <section id={slug} className="chapter-section mt-6 scroll-mt-20">
            <header>
                {/* Section title */}
                <h3 className="text-3xl font-bold text-gray-900 pb-4 mb-6 border-b border-gray-200">
                    {section.title}
                </h3>
            </header>

            {/* Use the "prose" class from Tailwind Typography for beautiful article styling */}
            <div className="prose prose-lg max-w-none">
                {section.introduction &&
                    section.introduction.map((p, i) => <p key={i}>{p}</p>)}
            </div>

            {section.entries &&
                section.entries.map((entry) => (
                    <Entry key={entry.number} entry={entry} />
                ))}

            {/* Recursive call for nested sections */}
            {section.sections &&
                section.sections.map((subSection) => (
                    <Section key={subSection.title} section={subSection} />
                ))}
        </section>
    )
}

export default Section
