// app/glossary/page.tsx

import React from "react";
import Glossary from "@/components/Glossary";
import getData from "@/functions/getData";
import { Cookbook } from "@/types/generated.ts/cookbook-schema";
import "@/app/globals.css"; // Make sure to import your global styles

// This is an async Server Component, which is the default in the App Router.
export default async function GlossaryPage() {
	// 1. Fetch the entire cookbook data object on the server.
	const cookbook = (await getData(["cookbook.json"])) as Cookbook;

	// 2. Extract just the glossary data.
	const glossaryData = cookbook.glossary;

	// 3. Add a robust check in case the glossary data is missing from the file.
	if (!glossaryData) {
		return (
			<main className="text-center p-12">
				<h1>Error: Glossary data could not be loaded.</h1>
			</main>
		);
	}

	// 4. Render the Glossary component, passing the extracted data as a prop.
	//    The <main> tag provides a semantic container for the page content.
	return (
		<main>
			<Glossary data={glossaryData} />
		</main>
	);
}
