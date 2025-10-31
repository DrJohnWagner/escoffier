import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import { ShoppingListProvider } from "@/app/contexts/ShoppingListContext"
import "./globals.css"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: "Escoffier's Digital Guide",
    description: "A modern web implementation of a classic culinary text.",
}

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            {/* The body is now a flex container that takes the full viewport height */}
            <body
                className={`${inter.className} ${geistSans.variable} ${geistMono.variable} flex h-screen flex-col bg-gray-50 text-gray-800`}
            >
                <ShoppingListProvider>
                    <Header />
                    {/* The main content area fills remaining space and is scrollable */}
                    <main className="flex-1 overflow-y-auto">
                        <div className="mx-12">{children}</div>
                    </main>
                </ShoppingListProvider>
            </body>
        </html>
    )
}

