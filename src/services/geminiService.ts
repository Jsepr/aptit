import type { Language, MeasureSystem, Recipe } from "../types.ts";

export type ExtractRecipeErrorCode = "PAGE_NOT_SUPPORTED" | "EXTRACTION_FAILED";

export interface ExtractRecipeResult {
	recipe: Partial<Recipe> | null;
	errorCode?: ExtractRecipeErrorCode;
}

export const generateAnimeFoodImage = async (_dishName: string) => {
	// Image generation disabled for now — return null so callers use extracted image if available.
	return null;
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

		if (response.ok) {
			return {
				recipe: (await response.json()) as Partial<Recipe>,
			} as ExtractRecipeResult;
		}

		let errorCode: ExtractRecipeErrorCode | undefined;
		try {
			const payload = (await response.json()) as {
				errorCode?: ExtractRecipeErrorCode;
			};
			errorCode = payload.errorCode;
		} catch {
			// ignore parse failures and use generic fallback
		}

		return {
			recipe: null,
			errorCode: errorCode || "EXTRACTION_FAILED",
		} as ExtractRecipeResult;
	} catch (error) {
		console.error("Gemini API Error:", error);
		return {
			recipe: null,
			errorCode: "EXTRACTION_FAILED",
		} as ExtractRecipeResult;
	}
};
