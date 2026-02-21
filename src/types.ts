export interface Ingredient {
	item: string;
	amount: string;
	unit: string;
	originalString?: string;
}

export interface StepIngredient {
	name: string;
	amount: string;
}

export interface Instruction {
	text: string;
	ingredients: StepIngredient[]; // specific ingredients with measurements for this step
}

export type MeasureSystem = "metric" | "imperial";

export interface Recipe {
	id: string;
	title: string;
	description: string;
	ingredients: string[];
	instructions: Instruction[];
	originalInstructions?: Instruction[];
	originalIngredients?: string[];
	time?: string;
	servings?: string;
	baseServingsCount: number;
	sourceUrl: string;
	createdAt: number;
	language: "en" | "sv";
	measureSystem: MeasureSystem;
	recipeType?: "food" | "baking";
}

export type Language = "en" | "sv";
