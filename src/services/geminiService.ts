import type { Language, MeasureSystem, Recipe, RecipeData } from "../types.ts";

export const generateAnimeFoodImage = async (dishName: string) => {
	try {
		const response = await fetch("/api/generate-image", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ dishName }),
		});

		if (!response.ok) {
			throw new Error("Failed to generate image");
		}

		const data = await response.json();
		return data.imageUrl;
	} catch (error) {
		console.error("Image Generation Error:", error);
		return null;
	}
};

export const extractRecipe = async (data: {
	url: string;
	language: Language;
	targetSystem: MeasureSystem;
}) => {
	try {
		const response = await fetch("/api/extract-recipe", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to extract recipe");
		}

		return (await response.json()) as Partial<Recipe> | null;
	} catch (error) {
		console.error("Gemini API Error:", error);
		return null;
	}
};

export const convertRecipeUnits = async (data: {
	recipe: Recipe;
	targetSystem: MeasureSystem;
}) => {
	try {
		const response = await fetch("/api/convert-recipe-units", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to convert recipe units");
		}

		return (await response.json()) as RecipeData | null;
	} catch (error) {
		console.error("Conversion Error:", error);
		return null;
	}
};

export const getIngredientExplanation = async (data: {
	ingredient: string;
	language: Language;
}) => {
	try {
		const response = await fetch("/api/get-ingredient-explanation", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error("Failed to get ingredient explanation");
		}

		return (await response.json()) as {
			description: string;
			substitutes: string[];
		} | null;
	} catch (error) {
		console.error("Ingredient Explanation Error:", error);
		return null;
	}
};
