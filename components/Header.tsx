"use client"; // 1. Mark this as a Client Component

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; // 2. Import the usePathname hook
import { useShoppingList } from "@/app/contexts/ShoppingListContext"

const Header: React.FC = () => {
	// 3. Get the current URL path
	const pathname = usePathname();
	const { shoppingListItems } = useShoppingList()

    const itemCount = shoppingListItems.length

	// 4. Define the logic: only show the header if the path is NOT the homepage ('/')
	const showHeader = pathname !== "/";

	// If the condition is not met, render nothing
	if (!showHeader) {
		return null;
	}

	// 5. If the condition is met, render the header JSX
	return (
        // The header is no longer sticky; its position is fixed by the flex layout in RootLayout
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left side: Title/Logo */}
                    <div className="shrink-0">
                        <Link
                            href="/"
                            className="text-2xl font-bold text-gray-800 hover:text-blue-600 transition-colors"
                        >
                            Escoffier's Digital Guide
                        </Link>
                    </div>

                    {/* Right side: Navigation Links (optional) */}
                    <nav className="hidden md:flex md:space-x-8">
                        <Link
                            href="/shopping-list"
                            className="relative text-gray-600 hover:text-gray-900 font-medium"
                        >
                            Shopping List
                            {itemCount > 0 && (
                                <span className="absolute top-0 right-0 -mt-2 -mr-4 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                                    {itemCount}
                                </span>
                            )}
                        </Link>
                        <Link
                            href="/glossary"
                            className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                            Glossary
                        </Link>
                        <Link
                            href="/index"
                            className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                            Index
                        </Link>
                        {/* Add other links here in the future */}
                    </nav>
                </div>
            </div>
        </header>
    )
};

export default Header;
