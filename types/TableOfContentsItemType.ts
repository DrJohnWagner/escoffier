// types/TableOfContentsItemType.ts

export default interface TableOfContentsItemType {
    title: string
    // --- MODIFICATION HERE ---
    link?: string // link is now optional
    children?: TableOfContentsItemType[]
}
