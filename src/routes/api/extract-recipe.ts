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
	6. For each instruction step's "ingredients":
	  - Return every ingredient used in that step as an object with { "name", "amount" }.
	  - "name" must be the ingredient name only (no quantity/unit).
	  - "amount" must include the numeric amount and unit used in that step.
	  - Use the same converted unit system as the top-level "ingredients".
	7. ALWAYS include the "recipeType" field in the response.
	  - Use "baking" for recipes that primarily involve baking (bread, cakes, cookies, pastries, pies, etc.)
		- Use "food" for all other recipes (main dishes, side dishes, salads, soups, etc.)
	
	REQUIRED JSON SCHEMA FOR RESPONSE:
${JSON.stringify(jsonSchema, null, 2)}
`;

				try {
					// Fetch the website content using Playwright to handle client-side rendering
					console.log("[Recipe Extract] Starting Playwright browser for URL:", url);
					let browser;
					let recipeData = "";
					
					try {
						browser = await chromium.launch({
							headless: true,
							args: [
								'--no-sandbox',
								'--disable-setuid-sandbox',
								'--disable-dev-shm-usage',
								'--disable-gpu',
							],
						});
						console.log("[Recipe Extract] Browser launched successfully");
						
						const page = await browser.newPage();
						console.log("[Recipe Extract] Navigating to URL...");
						
						// Navigate to the page
						await page.goto(url, { 
							waitUntil: "domcontentloaded",
							timeout: 30000,
						});
						console.log("[Recipe Extract] Initial page load complete");
						
						// Wait for recipe content to be present (more reliable than networkidle)
						// Try multiple selectors to be more robust
						try {
							await page.waitForSelector('script[type="application/ld+json"]', { timeout: 10000 });
							console.log("[Recipe Extract] Found JSON-LD data");
						} catch (e) {
							console.log("[Recipe Extract] No JSON-LD found, waiting for content to render...");
							// Fallback: wait for common recipe elements
							await page.waitForFunction(
								() => document.body.innerText.length > 1000,
								{ timeout: 10000 }
							);
						}
						
						// Additional wait to ensure JavaScript has executed
						await page.waitForTimeout(2000);
						
						const fullContent = await page.content();
						console.log("[Recipe Extract] Full content length:", fullContent.length);
						
						// Extract structured data (JSON-LD) if available - this is much smaller!
						const structuredData = await page.evaluate(() => {
							const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
							return scripts.map(script => {
								try {
									return JSON.parse(script.textContent || '');
								} catch {
									return null;
								}
							}).filter(Boolean);
						});
						
						// Extract relevant text content only (not the entire HTML)
						const extractedContent = await page.evaluate(() => {
							// Try to find recipe-specific content
							const getTextContent = (selector: string) => {
								const el = document.querySelector(selector);
								return el ? el.textContent?.trim() : '';
							};
							
							// Get all text from common recipe containers
							const recipeContainers = [
								'[itemtype*="Recipe"]',
								'article',
								'main',
								'.recipe',
								'#recipe'
							];
							
							let recipeText = '';
							for (const selector of recipeContainers) {
								const el = document.querySelector(selector);
								if (el && el.textContent && el.textContent.length > 500) {
									recipeText = el.textContent;
									break;
								}
							}
							
							// Fallback to body if no recipe container found
							if (!recipeText) {
								recipeText = document.body.innerText;
							}
							
							// Extract image URLs
							const images = Array.from(document.querySelectorAll('img'))
								.map(img => img.src)
								.filter(src => src && !src.includes('icon') && !src.includes('logo'));
							
							return {
								text: recipeText,
								images: images.slice(0, 5), // Only first 5 images
							};
						});
						
						console.log("[Recipe Extract] Extracted content length:", extractedContent.text.length);
						console.log("[Recipe Extract] Found", extractedContent.images.length, "images");
						console.log("[Recipe Extract] Found", structuredData.length, "structured data blocks");
						
						// Combine structured data and text content for Gemini
						recipeData = JSON.stringify({
							structuredData,
							content: extractedContent.text,
							images: extractedContent.images,
							url: url,
						}, null, 2);
						
						console.log("[Recipe Extract] Final payload size:", recipeData.length, "bytes");
						
						await browser.close();
						console.log("[Recipe Extract] Browser closed");
					} catch (playwrightError: any) {
						console.error("[Recipe Extract] Playwright Error:", {
							message: playwrightError.message,
							stack: playwrightError.stack,
							name: playwrightError.name,
						});
						
						if (browser) {
							try {
								await browser.close();
							} catch (closeError) {
								console.error("[Recipe Extract] Error closing browser:", closeError);
							}
						}
						
						throw new Error(`Failed to fetch website content: ${playwrightError.message}`);
					}

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

					console.log("[Recipe Extract] Calling Gemini API...");
					const response = await ai.models.generateContent({
						model: "gemini-2.0-flash",
						contents: contentPrompt,
						config: {
							systemInstruction: systemInstruction,
							responseMimeType: "application/json",
							responseJsonSchema: z.toJSONSchema(recipeExtractSchema),
						},
					});
					console.log("[Recipe Extract] Gemini API response received");

					if (response.text) {
						const parsedData = parseJson(response.text);
						if (parsedData) {
							console.log("[Recipe Extract] Recipe parsed successfully:", parsedData.title);
							const result = {
								...parsedData,
								sourceUrl: url,
								createdAt: Date.now(),
								language: language,
								measureSystem: targetSystem,
							} as Partial<Recipe>;
							return Response.json(result);
						}
						console.error("[Recipe Extract] Failed to parse JSON from Gemini response");
					} else {
						console.error("[Recipe Extract] No text in Gemini response");
					}
					return Response.json(null);
				} catch (error: any) {
					console.error("[Recipe Extract] Top-level error:", {
						message: error.message,
						stack: error.stack,
						name: error.name,
					});
					return new Response(JSON.stringify({ 
						error: error.message,
						details: error.stack,
					}), {
						status: 500,
					});
				}
			},
		},
	},
});
