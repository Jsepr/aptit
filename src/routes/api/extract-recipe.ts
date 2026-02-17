import { GoogleGenAI } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";
import { chromium, type Page } from "playwright";
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
	ingredients: z.array(
		z.object({
			name: z.string(),
			amount: z.string(),
		}),
	),
});

const recipeExtractSchema = z.object({
	title: z.string(),
	description: z.string(),
	ingredients: z.array(z.string()),
	originalIngredients: z.array(z.string()),
	originalInstructions: z.array(instructionSchema),
	baseServingsCount: z.number(),
	instructions: z.array(instructionSchema),
	time: z.string().optional(),
	servings: z.string(),
	imageUrl: z.string(),
	recipeType: z.enum(["food", "baking"]),
});

const PLAYWRIGHT_NAVIGATION_TIMEOUT_MS = 30_000;
const PLAYWRIGHT_CONTENT_WAIT_TIMEOUT_MS = 10_000;
const MAX_IMAGE_COUNT = 5;

const waitForRecipeSignals = async (page: Page) => {
	await Promise.allSettled([
		page.waitForSelector('script[type="application/ld+json"]', {
			timeout: PLAYWRIGHT_CONTENT_WAIT_TIMEOUT_MS,
		}),
		page.waitForFunction(() => document.body.innerText.length > 500, {
			timeout: PLAYWRIGHT_CONTENT_WAIT_TIMEOUT_MS,
		}),
	]);
};

const extractRecipePageData = async (url: string): Promise<string> => {
	const browser = await chromium.launch({
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-gpu",
		],
	});

	try {
		const page = await browser.newPage();
		await page.goto(url, {
			waitUntil: "domcontentloaded",
			timeout: PLAYWRIGHT_NAVIGATION_TIMEOUT_MS,
		});
		await waitForRecipeSignals(page);

		const extracted = await page.evaluate(
			({ maxImageCount }) => {
				const recipeContainers = [
					'[itemtype*="Recipe"]',
					"article",
					"main",
					".recipe",
					"#recipe",
				];

				const recipeText =
					recipeContainers
						.map((selector) => document.querySelector(selector)?.textContent?.trim())
						.find((text) => !!text && text.length > 500) ||
					document.body.innerText;

				const structuredData = Array.from(
					document.querySelectorAll('script[type="application/ld+json"]'),
				).flatMap((script) => {
					try {
						const parsed = JSON.parse(script.textContent || "null");
						return parsed ? [parsed] : [];
					} catch {
						return [];
					}
				});

				const images = Array.from(document.querySelectorAll("img"))
					.map((img) => img.src)
					.filter(
						(src) =>
							Boolean(src) && !src.includes("icon") && !src.includes("logo"),
					)
					.slice(0, maxImageCount);

				return {
					structuredData,
					content: recipeText,
					images,
				};
			},
			{ maxImageCount: MAX_IMAGE_COUNT },
		);

		return JSON.stringify(
			{
				...extracted,
				url,
			},
			null,
			2,
		);
	} catch (error: any) {
		throw new Error(`Failed to fetch website content: ${error.message}`);
	} finally {
		await browser.close();
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
	6. For each instruction step's "ingredients":
	  - Return every ingredient used in that step as an object with { "name", "amount" }.
	  - "name" must be the ingredient name only (no quantity/unit).
	  - "amount" must include the numeric amount and unit used in that step.
	  - Use the same converted unit system as the top-level "ingredients".
	7. ALWAYS include the "recipeType" field in the response.
	  - Use "baking" for recipes that primarily involve baking (bread, cakes, cookies, pastries, pies, etc.)
		- Use "food" for all other recipes (main dishes, side dishes, salads, soups, etc.)
	8. Time extraction:
	  - Extract the TOTAL time required for the recipe.
	  - If separate prepTime and cookTime are provided, SUM them up to get the total time.
	  - If totalTime is explicitly provided (e.g. "PT45M" or "Under 45 min"), use it.
	  - You MUST return the time in ISO 8601 duration format (e.g. "PT1H30M", "PT45M").
	  - Do not use human readable format like "1 hour 30 mins".
	  - Handle Swedish time prefixes like "Under" (Under 45 min → PT45M).
	
	REQUIRED JSON SCHEMA FOR RESPONSE:
${JSON.stringify(jsonSchema, null, 2)}
`;

				try {
					const recipeData = await extractRecipePageData(url);

					// Create prompt with the extracted recipe data
					const contentPrompt = `Extract the complete recipe from this data:

${recipeData}

The data includes:
- structuredData: JSON-LD structured data from the page (if available)
- content: The text content from the recipe
- images: Available image URLs
- url: The source URL

Use the structured data if available, otherwise extract from the content text.
Ensure all measurement units are accurately converted to ${targetSystem}.`;

					const response = await ai.models.generateContent({
						model: "gemini-2.0-flash",
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
					console.error("[Recipe Extract] Top-level error:", {
						message: error.message,
						stack: error.stack,
						name: error.name,
					});
					return new Response(
						JSON.stringify({
							error: error.message,
							details: error.stack,
						}),
						{
							status: 500,
						},
					);
				}
			},
		},
	},
});
