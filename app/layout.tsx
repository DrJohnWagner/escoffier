import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Inter } from "next/font/google"
import Header from "@/components/Header"
import { ShoppingListProvider } from "@/app/contexts/ShoppingListContext"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "Escoffier's Digital Guide",
    description: "A modern web implementation of a classic culinary text.",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode
}>) {
    return (
        <html lang="en">
            <body
                className={`${inter.className} flex h-dvh flex-col bg-gray-50 text-gray-800`}
            >
                <ShoppingListProvider>
                    <Header />
                    <div className="flex-1 overflow-y-auto">{children}</div>
                </ShoppingListProvider>
            </body>
        </html>
    )
}
