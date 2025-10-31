 import { ContentBlock } from "@/types/generated.ts/content-block-schema.d"

export default interface ShoppingListItemType {
    /**
     * The unique number of the recipe.
     */
    number: number
    /**
     * The title of the recipe.
     */
    title: string
    /**
     * The ingredients of the recipe.
     */
    ingredients: ContentBlock[]
}
