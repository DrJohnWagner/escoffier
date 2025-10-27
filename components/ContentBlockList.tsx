// components/ContentBlockList.tsx

import { ContentBlock } from "@/types/generated.ts/content-block-schema";
import React from "react";

// --- FIX #1: Make the 'title' prop optional ---
interface ContentBlockListProps {
	title?: string; // Changed from 'string' to 'string | undefined'
	items: ContentBlock[];
	isOrdered?: boolean;
}

const ContentBlockList: React.FC<ContentBlockListProps> = ({
	title,
	items,
	isOrdered = false,
}) => {
	const ListComponent = isOrdered ? "ol" : "ul";
	const listClasses = `space-y-2 prose prose-gray max-w-none`;
	const listItemClasses = isOrdered ? "list-decimal" : "list-disc";

	return (
		<div>
			{/* --- FIX #2: Conditionally render the title only if it exists --- */}
			{title && (
				<h5 className="text-xl font-semibold text-gray-800 mb-3">{title}</h5>
			)}

			<ListComponent className={`${listClasses} ${listItemClasses} ml-5`}>
				{items.map((item, index) => (
					<li key={index}>
						{typeof item === "string" ? (
							<span>{item}</span>
						) : (
							Object.entries(item).map(([subTitle, details]) => (
								<div key={subTitle}>
									<strong>{subTitle}</strong>
									<ul className="list-circle ml-5 mt-1 space-y-1">
										{/* This check handles both arrays and non-arrays gracefully */}
										{Array.isArray(details) ? (
											details.map((detail, detailIndex) => (
												<li key={detailIndex}>{detail}</li>
											))
										) : details ? (
											<li>{String(details)}</li>
										) : null}
									</ul>
								</div>
							))
						)}
					</li>
				))}
			</ListComponent>
		</div>
	);
};

export default ContentBlockList;
