export interface Ingredient {
	item: string;
	amount: string;
	unit: string;
	originalString?: string;
}

export interface Instruction {
	text: string;
	ingredients: string[]; // specific ingredients with measurements for this step
}

export type MeasureSystem = "metric" | "imperial";

export interface RecipeData {
	ingredients: string[];
	instructions: Instruction[];
}

export interface Recipe {
	id: string;
	title: string;
	description: string;
	ingredients: string[];
	instructions: Instruction[];
	originalIngredients?: string[];
	prepTime?: string;
	cookTime?: string;
	servings?: string;
	baseServingsCount: number;
	sourceUrl: string;
	imageUrl?: string;
	createdAt: number;
	language: "en" | "sv";
	measureSystem: MeasureSystem;
	metricData?: RecipeData;
	imperialData?: RecipeData;
}

export type Language = "en" | "sv";

export interface AppState {
	recipes: Recipe[];
	view: "list" | "add" | "detail";
	selectedRecipeId: string | null;
	language: Language;
	measureSystem: MeasureSystem;
}

export interface Translation {
	title: string;
	addRecipe: string;
	myRecipes: string;
	enterUrl: string;
	analyze: string;
	analyzing: string;
	ingredients: string;
	instructions: string;
	servings: string;
	prepTime: string;
	cookTime: string;
	source: string;
	delete: string;
	back: string;
	noRecipes: string;
	error: string;
	tryAgain: string;
	pasteLink: string;
	exampleUrl: string;
	save: string;
	cancel: string;
	languageName: string;
	metric: string;
	imperial: string;
	measureSystem: string;
	ingredientInfo: string;
	substitutes: string;
	loadingInfo: string;
	close: string;
	showOriginal: string;
	showConverted: string;
}
