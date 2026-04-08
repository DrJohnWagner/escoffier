import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
    title: "Shopping List | Escoffier's Digital Guide",
}

export default function ShoppingListLayout({
    children,
}: {
    children: ReactNode
}) {
    return children
}
