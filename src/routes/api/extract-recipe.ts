import { GoogleGenAI } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";
import { chromium } from "playwright";
import { z } from "zod";
import type { Language, MeasureSystem, Recipe } from "../../types";

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

const instructionSchema = z.object({
	text: z.string(),
	ingredients: z.array(z.string()),
});

const recipeExtractSchema = z.object({
	title: z.string(),
	description: z.string(),
	ingredients: z.array(z.string()),
	originalIngredients: z.array(z.string()),
	originalInstructions: z.array(instructionSchema),
	baseServingsCount: z.number(),
	instructions: z.array(instructionSchema),
	prepTime: z.string(),
	cookTime: z.string(),
	servings: z.string(),
	imageUrl: z.string(),
	recipeType: z.enum(["food", "baking"]),
});

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
            - Spoons: Use teaspoons (tsp) and tablespoons (tbsp).
          `;

				const imperialInstructions = `
            - Weight: Use ounces (oz) or pounds (lb).
            - Volume: Use cups, fluid ounces (fl oz), or gallons.
            - Temperature: Use Fahrenheit (°F).
            - Spoons: Use teaspoons (tsp) and tablespoons (tbsp).
          `;

				const jsonSchema = z.toJSONSchema(recipeExtractSchema);

				const systemInstruction = `
	You are an expert professional chef and baker. 
	Your goal is to extract recipe details from the provided source.
	
	CRITICAL RULES:
	1. The target measurement system is: ${targetSystem.toUpperCase()}.
	2. Convert ALL measurements to: ${targetSystem === "metric" ? metricInstructions : imperialInstructions}
	3. Provide the "originalIngredients" exactly from the source.
	4. Translate to ${language === "sv" ? "Swedish" : "English"}.
	5. For instruction steps: Extract VERBATIM from the source without any paraphrasing, rewriting, reordering, or omitting steps. Preserve the exact wording, order, and structure as they appear in the source.
	6. ALWAYS include the "recipeType" field in the response.
	  - Use "baking" for recipes that primarily involve baking (bread, cakes, cookies, pastries, pies, etc.)
		- Use "food" for all other recipes (main dishes, side dishes, salads, soups, etc.)
	
	REQUIRED JSON SCHEMA FOR RESPONSE:
${JSON.stringify(jsonSchema, null, 2)}
`;

				try {
					// Fetch the website content using Playwright to handle client-side rendering
					const browser = await chromium.launch();
					const page = await browser.newPage();
					await page.goto(url, { waitUntil: "networkidle" });
					const websiteContent = await page.content();
					await browser.close();

					// Create prompt with the actual website content
					const contentPrompt = `Extract the complete recipe from this website content:

${websiteContent}

Ensure all measurement units are accurately converted to ${targetSystem}.`;

					const response = await ai.models.generateContent({
						model: "gemini-2.0-flash", // Updated model for better performance/availability or keep original "gemini-3-flash-preview" if valid
						contents: contentPrompt,
						config: {
							systemInstruction: systemInstruction,
							responseMimeType: "application/json",
							responseJsonSchema: z.toJSONSchema(recipeExtractSchema),
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
