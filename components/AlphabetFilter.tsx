"use client";

import React, { useState, useMemo } from "react";

// --- THE FIX IS HERE ---
// We simplify the constraint. Any type 'T' passed to this component
// just needs to have a 'term' property that is a string.
// We no longer need the '[key: string]: any' index signature.
type FilterableItem = { term: string };
// --- END OF FIX ---

interface AlphabetFilterProps<T extends FilterableItem> {
	title: string;
	data: T[];
	children: (
		filteredData: { [letter: string]: T[] },
		lettersToRender: string[]
	) => React.ReactNode;
}

const AlphabetFilter = <T extends FilterableItem>({
	title,
	data,
	children,
}: AlphabetFilterProps<T>) => {
	const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

	const { groupedEntries, sortedLetters } = useMemo(() => {
		if (!data) return { groupedEntries: {}, sortedLetters: [] };

		// The rest of the component logic remains exactly the same.
		// It works perfectly because 'entry' is of type 'T', which
		// is guaranteed to have the 'term' property we need.
		const grouped: { [letter: string]: T[] } = data.reduce(
			(acc, entry) => {
				if (
					!entry ||
					typeof entry.term !== "string" ||
					entry.term.length === 0
				) {
					return acc;
				}
				const baseLetter = entry.term
					.charAt(0)
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, "")
					.toUpperCase();

				if (!acc[baseLetter]) {
					acc[baseLetter] = [];
				}
				acc[baseLetter].push(entry);
				return acc;
			},
			{} as { [letter: string]: T[] }
		);

		Object.keys(grouped).forEach((letter) => {
			grouped[letter].sort((a, b) =>
				a.term.localeCompare(b.term, "en", { sensitivity: "base" })
			);
		});

		const sorted = Object.keys(grouped).sort();
		return { groupedEntries: grouped, sortedLetters: sorted };
	}, [data]);

	const lettersToRender = selectedLetter ? [selectedLetter] : sortedLetters;

	return (
		<article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<header className="sticky top-0 z-10 py-4 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">
				<div className="text-center">
					<h1 className="text-3xl font-extrabold text-gray-900">{title}</h1>
				</div>

				<nav className="filter-nav flex flex-wrap justify-center gap-2 mt-4">
					<button
						onClick={() => setSelectedLetter(null)}
						className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
							selectedLetter === null
								? "bg-gray-800 text-white shadow"
								: "bg-gray-200 text-gray-700 hover:bg-gray-300"
						}`}
					>
						All
					</button>
					{sortedLetters.map((letter) => (
						<button
							key={letter}
							onClick={() => setSelectedLetter(letter)}
							className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
								selectedLetter === letter
									? "bg-gray-800 text-white shadow"
									: "bg-gray-200 text-gray-700 hover:bg-gray-300"
							}`}
						>
							{letter}
						</button>
					))}
				</nav>
			</header>

			<main className="pt-12">{children(groupedEntries, lettersToRender)}</main>
		</article>
	);
};

export default AlphabetFilter;
