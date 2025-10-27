"use client";

import React from "react";
import {
	CookbookGlossary,
	GlossaryEntry,
} from "@/types/generated.ts/glossary-schema";
import AlphabetFilter from "./AlphabetFilter"; // Import the new component

interface GlossaryProps {
	data: CookbookGlossary;
}

const Glossary: React.FC<GlossaryProps> = ({ data }) => {
	if (!data) return null;

	return (
		<AlphabetFilter<GlossaryEntry> title="Glossary" data={data}>
			{(groupedEntries, lettersToRender) =>
				lettersToRender.map((letter) => {
					// Key tracker is now scoped inside the map, which is correct
					const keyTracker: { [key: string]: number } = {};
					return (
						<section key={letter} className="mb-12">
							<h2 className="text-4xl font-bold text-gray-800 border-b pb-4 mb-8">
								{letter}
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
								{groupedEntries[letter].map((entry) => {
									keyTracker[entry.term] = (keyTracker[entry.term] || 0) + 1;
									const uniqueKey = `${entry.term}-${keyTracker[entry.term]}`;
									return (
										<div key={uniqueKey} className="glossary-entry">
											<h3 className="text-xl font-semibold text-gray-700">
												{entry.term}
											</h3>
											<div className="mt-1 text-gray-600">
												{entry.definition && <p>{entry.definition}</p>}
												{entry.see_recipe && (
													<p>
														<em>See Recipe No. {entry.see_recipe}</em>
													</p>
												)}
												{entry.see_term && (
													<p>
														<em>See: {entry.see_term}</em>
													</p>
												)}
												{entry.sub_terms && (
													<ul className="list-disc list-inside mt-2">
														{entry.sub_terms.map((sub) => (
															<li key={sub}>{sub}</li>
														))}
													</ul>
												)}
											</div>
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

export default Glossary;
