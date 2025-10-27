// app/index/page.tsx

import React from "react";
import Index from "@/components/Index";
import getData from "@/functions/getData";
import { Cookbook } from "@/types/generated.ts/cookbook-schema";
import "@/app/globals.css"; // Ensure global styles are applied

// This is an async Server Component that fetches data on the server.
export default async function IndexPage() {
	// 1. Fetch the main cookbook data object.
	const cookbook = (await getData(["cookbook.json"])) as Cookbook;

	// 2. Extract the index data from the cookbook object.
	const indexData = cookbook.index;

	// 3. Add a check to handle cases where the index data might be missing.
	if (!indexData) {
		return (
			<main className="text-center p-12">
				<h1>Error: Index data could not be loaded.</h1>
			</main>
		);
	}

	// 4. Render the Index component, passing the server-fetched data down as a prop.
	return (
		<main>
			<Index data={indexData} />
		</main>
	);
}
