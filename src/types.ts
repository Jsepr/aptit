import { z } from "zod";

export const ingredientSchema = z.object({
	name: z.string(),
	amount: z.string(),
	unit: z.string(),
});
export type Ingredient = z.infer<typeof ingredientSchema>;

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
	ingredients: z.array(ingredientSchema),
	originalIngredients: z.array(ingredientSchema),
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
