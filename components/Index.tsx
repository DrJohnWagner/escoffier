"use client";

import React from "react";
import {
	CookbookIndex,
	IndexEntry,
	IndexCrossReference,
} from "@/types/generated.ts/index-schema";
import AlphabetFilter from "./AlphabetFilter";

interface IndexProps {
	data: CookbookIndex;
}

const Index: React.FC<IndexProps> = ({ data }) => {
	if (!data) return null;

	// --- THE FIX IS HERE ---
	// Make the flattening process robust. If a group is missing its 'entries'
	// property, use an empty array `[]` as a fallback. This prevents the
	// flatMap from failing and ensures it always produces a valid array.
	const flatIndexData = data.flatMap((group) => group.entries || []);
	// --- END OF FIX ---

	const isCrossReference = (
		entry: IndexEntry
	): entry is IndexCrossReference => {
		return "see" in entry;
	};

	return (
		<AlphabetFilter<IndexEntry> title="Index" data={flatIndexData}>
			{(groupedEntries, lettersToRender) =>
				lettersToRender.map((letter) => {
					const keyTracker: { [key: string]: number } = {};
					return (
						<section key={letter} className="mb-12">
							<h2 className="text-4xl font-bold text-gray-800 border-b pb-4 mb-8">
								{letter}
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
								{/* This check is now safe because we know groupedEntries[letter] exists */}
								{groupedEntries[letter].map((entry) => {
									keyTracker[entry.term] = (keyTracker[entry.term] || 0) + 1;
									const uniqueKey = `${entry.term}-${keyTracker[entry.term]}`;

									return (
										<div
											key={uniqueKey}
											className="index-entry flex justify-between items-baseline"
										>
											{isCrossReference(entry) ? (
												<span className="text-lg text-gray-600">
													{entry.term} <em>See: {entry.see}</em>
												</span>
											) : (
												<>
													<span className="text-lg text-gray-800">
														{entry.term}
													</span>
													{entry.recipe_number && (
														<span className="text-md font-mono text-gray-500">
															{entry.recipe_number}
														</span>
													)}
												</>
											)}
										</div>
									);
								})}
							</div>
						</section>
					);
				})
			}
		</AlphabetFilter>
	);
};

export default Index;
