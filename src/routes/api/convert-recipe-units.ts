import { GoogleGenAI } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";
import type { MeasureSystem, Recipe, RecipeData } from "../../types";

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
						},
					});

					if (response.text) {
						const parsedData = parseJson(response.text);
						if (parsedData) {
							return Response.json(parsedData as RecipeData);
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
