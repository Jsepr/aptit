import { GoogleGenAI } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";
import type { Language, MeasureSystem, Recipe } from "../../types";

const parseJson = (text: string) => {
	try {
		const cleaned = text
			.replace(/```json/g, "")
			.replace(/```/g, "")
			.trim();
		if (!cleaned) return null;
		return JSON.parse(cleaned);
	} catch (e) {
		console.error("JSON Parse Error", e);
		return null;
	}
};

export const Route = createFileRoute("/api/extract-recipe")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const data = (await request.json()) as {
					url: string;
					language: Language;
					targetSystem: MeasureSystem;
				};
				const { url, language, targetSystem } = data;

				if (!process.env.GEMINI_API_KEY) {
					console.error("API Key is missing");
					return new Response(JSON.stringify({ error: "API Key is missing" }), {
						status: 500,
					});
				}
				const apiKey = process.env.GEMINI_API_KEY;
				const ai = new GoogleGenAI({ apiKey });

				const metricInstructions = `
            - Weight: Use grams (g) or kilograms (kg).
            - Volume: Use deciliters (dl), milliliters (ml), or liters (l).
            - Temperature: Use Celsius (°C).
            - Spoons: Use tesked (tsp) and matsked (tbsp).
          `;

				const imperialInstructions = `
            - Weight: Use ounces (oz) or pounds (lb).
            - Volume: Use cups, fluid ounces (fl oz), or gallons.
            - Temperature: Use Fahrenheit (°F).
            - Spoons: Use teaspoons (tsp) and tablespoons (tbsp).
          `;

				const systemInstruction = `
            You are an expert professional chef and baker. 
            Your goal is to extract recipe details from the provided source.
            
            CRITICAL RULES:
            1. The target measurement system is: ${targetSystem.toUpperCase()}.
            2. Convert ALL measurements to: ${targetSystem === "metric" ? metricInstructions : imperialInstructions}
            3. Provide the "originalIngredients" exactly from the source.
            4. Translate to ${language === "sv" ? "Swedish" : "English"}.
            
            REQUIRED JSON STRUCTURE:
            {
              "title": "string",
              "description": "string",
              "ingredients": ["string"],
              "originalIngredients": ["string"],
              "baseServingsCount": number,
              "instructions": [
                {
                  "text": "string",
                  "ingredients": ["string"]
                }
              ],
              "prepTime": "string",
              "cookTime": "string",
              "servings": "string",
              "imageUrl": "string"
            }
          `;

				const prompt = `Find and extract the full recipe from this URL: ${url}. Ensure all units are accurately converted to ${targetSystem}.`;

				try {
					const response = await ai.models.generateContent({
						model: "gemini-2.0-flash", // Updated model for better performance/availability or keep original "gemini-3-flash-preview" if valid
						contents: prompt,
						config: {
							systemInstruction: systemInstruction,
							tools: [{ googleSearch: {} }],
						},
					});

					if (response.text) {
						const parsedData = parseJson(response.text);
						if (parsedData) {
							const result = {
								...parsedData,
								sourceUrl: url,
								createdAt: Date.now(),
								language: language,
								measureSystem: targetSystem,
							} as Partial<Recipe>;
							return Response.json(result);
						}
					}
					return Response.json(null);
				} catch (error: any) {
					console.error("Gemini API Error:", error);
					return new Response(JSON.stringify({ error: error.message }), {
						status: 500,
					});
				}
			},
		},
	},
});
