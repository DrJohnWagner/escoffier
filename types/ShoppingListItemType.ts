import { ContentBlock } from "@/types/generated.ts/content-block-schema"

export default interface ShoppingListItemType {
    /**
     * The unique string identifier of the recipe (matches entry._id).
     */
    _id: string
    /**
     * The title of the recipe.
     */
    title: string
    /**
     * The ingredients of the recipe.
     */
    ingredients: ContentBlock[]
}
