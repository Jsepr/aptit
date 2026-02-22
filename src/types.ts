import { z } from "zod";

export const ingredientSchema = z.object({
	name: z.string(),
	amount: z.string(),
	unit: z.string(),
});
export type Ingredient = z.infer<typeof ingredientSchema>;

export const ingredientSectionSchema = z.object({
	title: z.string(),
	ingredients: z.array(ingredientSchema),
});
export type IngredientSection = z.infer<typeof ingredientSectionSchema>;

export const instructionSchema = z.object({
	text: z.string(),
	ingredients: z.array(ingredientSchema),
});
export type Instruction = z.infer<typeof instructionSchema>;

export const measureSystemSchema = z.enum(["metric", "imperial"]);
export type MeasureSystem = z.infer<typeof measureSystemSchema>;

export const languageSchema = z.enum(["en", "sv"]);
export type Language = z.infer<typeof languageSchema>;

export const recipeTypeSchema = z.enum(["food", "baking"]);

export const recipeExtractSchema = z.object({
	title: z.string(),
	description: z.string(),
	ingredients: z.array(ingredientSectionSchema),
	originalIngredients: z.array(ingredientSectionSchema),
	originalInstructions: z.array(instructionSchema),
	baseServingsCount: z.number(),
	instructions: z.array(instructionSchema),
	time: z.string().optional(),
	servings: z.string(),
	recipeType: recipeTypeSchema,
});
export type RecipeExtract = z.infer<typeof recipeExtractSchema>;

export const recipeSchema = recipeExtractSchema.extend({
	id: z.string(),
	sourceUrl: z.string(),
	createdAt: z.number(),
	language: languageSchema,
	measureSystem: measureSystemSchema,
});
export type Recipe = z.infer<typeof recipeSchema>;

/** Normalize ingredients to sectioned form (supports legacy flat Ingredient[] from localStorage). */
export const getIngredientSections = (
	ingredients: IngredientSection[] | Ingredient[],
): IngredientSection[] => {
	if (ingredients.length === 0) return [];
	const first = ingredients[0];
	if (
		"ingredients" in first &&
		Array.isArray((first as IngredientSection).ingredients)
	)
		return ingredients as IngredientSection[];
	return [{ title: "", ingredients: ingredients as Ingredient[] }];
};

/** Flatten sections into a single list of ingredients (for matching step ingredients, etc.). Supports legacy flat array. */
export const getFlatIngredients = (
	sections: IngredientSection[] | Ingredient[],
): Ingredient[] => {
	if (sections.length === 0) return [];
	const first = sections[0];
	if (
		"ingredients" in first &&
		Array.isArray((first as IngredientSection).ingredients)
	)
		return (sections as IngredientSection[]).flatMap((s) => s.ingredients);
	return sections as Ingredient[];
};
