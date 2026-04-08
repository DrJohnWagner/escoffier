// app/page.tsx

import TableOfContents from "@/components/TableOfContents"
import ContentBlockList from "@/components/ContentBlockList"
import Glossary from "@/components/Glossary"
import Index from "@/components/Index"
import DataLoadError from "@/components/DataLoadError"
import { getCookbook } from "@/functions/apiClient"
import createCookbookTOC from "@/functions/createCookbookTOC"

export default async function HomePage() {
    // The /api/cookbook document embeds the TOC, glossary and index — one
    // request is enough for every section on this page.
    const cookbook = await getCookbook()

    if (!cookbook) {
        return <DataLoadError resource="cookbook" />
    }

    const tocItems = createCookbookTOC(cookbook.contents)

    return (
        <main className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <header className="text-center mb-12">
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
                    {cookbook.title}
                </h1>
                <p className="mt-4 text-xl text-gray-600">
                    By {cookbook.authors.join(", ")}
                </p>
            </header>

            <section className="source-info bg-gray-100 border border-gray-200 rounded-lg p-6 mb-12 text-center">
                <h2 className="text-lg font-semibold text-gray-800">
                    Source Publication
                </h2>
                <p className="mt-2 text-gray-600">
                    Based on{" "}
                    <em>
                        {cookbook.source.title}
                        {cookbook.source.edition &&
                            ` (${cookbook.source.edition})`}
                    </em>{" "}
                    by {cookbook.source.authors.join(", ")}, published{" "}
                    {cookbook.source.year}.
                </p>
                {cookbook.source.url && (
                    <a
                        href={cookbook.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View the original source text at Project Gutenberg (opens in a new tab)"
                        className="mt-3 inline-block text-blue-600 hover:underline"
                    >
                        View Original Source at Project Gutenberg
                    </a>
                )}
            </section>

            {cookbook.introduction && cookbook.introduction.length > 0 && (
                <section className="introduction-section prose prose-lg max-w-none mb-12">
                    <ContentBlockList items={cookbook.introduction} />
                </section>
            )}

            <TableOfContents
                items={tocItems}
                title="Contents"
                variant="page"
                topLevelItemsAreLinks={false}
            />

            {cookbook.glossary && cookbook.glossary.length > 0 && (
                <section className="glossary-section mt-12">
                    <Glossary data={cookbook.glossary} />
                </section>
            )}

            {cookbook.index && cookbook.index.length > 0 && (
                <section className="index-section mt-12">
                    <Index data={cookbook.index} />
                </section>
            )}
        </main>
    )
}
