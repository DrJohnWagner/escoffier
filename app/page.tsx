import TableOfContents from "@/components/TableOfContents"
import ContentBlockList from "@/components/ContentBlockList"
import getData from "@/functions/getData"
import { Cookbook } from "@/types/generated.ts/cookbook-schema"
import createCookbookTOC from "@/functions/createCookbookTOC"
import "./globals.css"

// This is your main homepage component
export default async function HomePage() {
    const cookbook = (await getData(["cookbook.json"])) as Cookbook

    // Handle case where data fails to load
    if (!cookbook) {
        return (
            <main className="text-center p-12">
                <h1>Error: Cookbook data could not be loaded.</h1>
            </main>
        )
    }

    // Transform the cookbook's contents into the generic TOC structure
    const tocItems = createCookbookTOC(cookbook)

    return (
        <main className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            {/* --- Header Section --- */}
            <header className="text-center mb-12">
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
                    {cookbook.title}
                </h1>
                <p className="mt-4 text-xl text-gray-600">
                    By {cookbook.authors.join(", ")}
                </p>
            </header>
            {/* --- Source Info Section --- */}
            <section className="source-info bg-gray-100 border border-gray-200 rounded-lg p-6 mb-12 text-center">
                <h2 className="text-lg font-semibold text-gray-800">
                    Source Publication
                </h2>
                <p className="mt-2 text-gray-600">
                    Based on{" "}
                    <em>
                        {cookbook.source.title} ({cookbook.source.edition})
                    </em>
                    by {cookbook.source.authors.join(", ")}, published{" "}
                    {cookbook.source.year}.
                </p>
                <a
                    href={cookbook.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-blue-600 hover:underline"
                >
                    View Original Source at Project Gutenberg
                </a>
            </section>
            {/* --- Introduction Section (if it exists) --- */}
            {cookbook.introduction && cookbook.introduction.length > 0 && (
                <section className="introduction-section prose prose-lg max-w-none mb-12">
                    <ContentBlockList items={cookbook.introduction} />
                </section>
            )}
            {/* --- Table of Contents Section --- */}
            <TableOfContents
                items={tocItems}
                title="Contents"
                variant="page"
                topLevelItemsAreLinks={false}
            />
        </main>
    )
}
