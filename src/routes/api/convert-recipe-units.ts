import { GoogleGenAI } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { MeasureSystem, Recipe, RecipeData } from "../../types";
import { normalizeInstruction } from "../../utils/stepIngredients";

const parseJson = (text: string) => {
	try {
		// Remove markdown code fences
		const cleaned = text
			.replace(/```json/g, "")
			.replace(/```/g, "")
			.trim();

		if (!cleaned) return null;

		// Find the first '{' and the last '}' to extract just the JSON object
		const firstBrace = cleaned.indexOf("{");
		const lastBrace = cleaned.lastIndexOf("}");

		if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
			console.error("No valid JSON object found in response");
			return null;
		}

		// Extract only the JSON object, ignoring any text before or after
		const jsonText = cleaned.substring(firstBrace, lastBrace + 1);

		return JSON.parse(jsonText);
	} catch (e) {
		console.error("JSON Parse Error", e);
		console.error("Failed to parse text:", text.substring(0, 500));
		return null;
	}
};

const convertedRecipeDataSchema = z.object({
	ingredients: z.array(z.string()),
	instructions: z.array(
		z.object({
			text: z.string(),
			ingredients: z.array(
				z.object({
					name: z.string(),
					amount: z.string(),
				}),
			),
		}),
	),
});

export const Route = createFileRoute("/api/convert-recipe-units")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { recipe, targetSystem } = (await request.json()) as {
					recipe: Recipe;
					targetSystem: MeasureSystem;
				};
				if (!process.env.GEMINI_API_KEY) return Response.json(null);

				const apiKey = process.env.GEMINI_API_KEY;
				const ai = new GoogleGenAI({ apiKey });

				const systemInstruction = `
            You are a conversion tool for professional recipes. 
            Convert the recipe to ${targetSystem.toUpperCase()} units.
            Keep the language as ${recipe.language === "sv" ? "Swedish" : "English"}.
            For each instruction step, return ingredients as objects with:
            - "name": ingredient name only
            - "amount": converted amount with unit
            Return ONLY JSON.
        `;

				const prompt = `Convert the following recipe to ${targetSystem} units: ${JSON.stringify(
					{
						title: recipe.title,
						ingredients: recipe.ingredients,
						instructions: recipe.instructions,
					},
				)}`;

				try {
					const response = await ai.models.generateContent({
						model: "gemini-2.0-flash",
						contents: prompt,
						config: {
							systemInstruction: systemInstruction,
							responseMimeType: "application/json",
							responseJsonSchema: z.toJSONSchema(convertedRecipeDataSchema),
						},
					});

					if (response.text) {
						const parsedData = parseJson(response.text);
						if (parsedData) {
							const validated = convertedRecipeDataSchema.safeParse(parsedData);
							if (validated.success) {
								return Response.json(validated.data as RecipeData);
							}

							const fallback = {
								ingredients: Array.isArray(parsedData.ingredients)
									? parsedData.ingredients
									: recipe.ingredients,
								instructions: Array.isArray(parsedData.instructions)
									? parsedData.instructions.map((instruction: unknown) =>
											normalizeInstruction(
												instruction,
												Array.isArray(parsedData.ingredients)
													? parsedData.ingredients
													: recipe.ingredients,
											),
										)
									: [],
							};
							return Response.json(fallback as RecipeData);
						}
					}
					return Response.json(null);
				} catch (error: any) {
					console.error("Conversion Error:", error);
					return new Response(JSON.stringify({ error: error.message }), {
						status: 500,
					});
				}
			},
		},
	},
});
