import { GoogleGenAI } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
	type Language,
	type MeasureSystem,
	type Recipe,
	recipeExtractSchema,
	ingredientSchema,
} from "../../types";

const parseJson = (text: string) => {
	const tryParseObject = (candidate: string) => {
		try {
			const parsed = JSON.parse(candidate);
			return parsed && typeof parsed === "object" && !Array.isArray(parsed)
				? (parsed as Record<string, unknown>)
				: null;
		} catch {
			return null;
		}
	};

	const extractObjectSlice = (value: string) => {
		const firstBrace = value.indexOf("{");
		const lastBrace = value.lastIndexOf("}");
		if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
			return null;
		}
		return value.substring(firstBrace, lastBrace + 1);
	};

	const cleaned = text
		.replace(/```json/g, "")
		.replace(/```/g, "")
		.trim();
	if (!cleaned) return null;

	const direct = tryParseObject(cleaned);
	if (direct) return direct;

	const objectSlice = extractObjectSlice(cleaned);
	if (objectSlice) {
		const parsedObject = tryParseObject(objectSlice);
		if (parsedObject) return parsedObject;
	}

	return null;
};

const recipeExtractJsonSchema = z.toJSONSchema(recipeExtractSchema);
const EXTRACTION_MODEL = "gemini-3-flash-preview";

const METRIC_MEASUREMENT_RULES = [
	"Weight: Use grams (g) or kilograms (kg).",
	"Volume: Use deciliters (dl), milliliters (ml), or liters (l), teaspoons (tsp/tsk) or tablespoons (tbsp/msk) where it makes sense.",
	"Temperature: Use Celsius (°C).",
];

const IMPERIAL_MEASUREMENT_RULES = [
	"Weight: Use ounces (oz) or pounds (lb).",
	"Volume: Use cups, fluid ounces (fl oz), or gallons, tsp or tbsp where it makes sense.",
	"Temperature: Use Fahrenheit (°F).",
];

const STEP_INGREDIENT_SCHEMA_TEXT = JSON.stringify(
	z.toJSONSchema(ingredientSchema),
	null,
	2,
);

const STEP_INGREDIENT_RULES = [
	"Use this JSON schema for each step ingredient object:",
	STEP_INGREDIENT_SCHEMA_TEXT,
	"name: The ingredient name only (no quantity/unit) in singular form. It should match the ingredient name in the top-level ingredients array.",
	"amount: The numeric quantity only (e.g. 2, 1.5, 1/2). Empty string if no specific amount in that step.",
	"unit: The unit of measurement. Empty string if no unit.",
	'Use the same converted unit system as the top-level "ingredients".',
];

const RECIPE_TYPE_RULES = [
	'Use "baking" for recipes that primarily involve baking (bread, cakes, cookies, pastries, pies, etc.)',
	'Use "food" for all other recipes (main dishes, side dishes, salads, soups, etc.)',
];

const TIME_RULES = [
	"Extract the TOTAL time required for the recipe.",
	"If separate prepTime and cookTime are provided, SUM them up to get the total time.",
	'If totalTime is explicitly provided (e.g. "PT45M" or "Under 45 min"), use it.',
	'You MUST return the time in ISO 8601 duration format (e.g. "PT1H30M", "PT45M").',
	'Do not use human readable format like "1 hour 30 mins".',
	'Handle Swedish time prefixes like "Under" (Under 45 min -> PT45M).',
];

const asBullets = (items: string[]) =>
	items.map((item) => `  - ${item.replace(/\n/g, "\n    ")}`).join("\n");

const buildSystemInstruction = ({
	targetSystem,
	language,
}: {
	targetSystem: MeasureSystem;
	language: Language;
}) => {
	const measurementRules =
		targetSystem === "metric"
			? METRIC_MEASUREMENT_RULES
			: IMPERIAL_MEASUREMENT_RULES;
	const responseLanguage = language === "sv" ? "Swedish" : "English";

	return [
		"You are an expert professional chef and baker.",
		"Your goal is to extract recipe details from the provided source.",
		"",
		"CRITICAL RULES:",
		`1. The target measurement system is: ${targetSystem.toUpperCase()}.`,
		`2. Convert ALL measurements to:\n${asBullets(measurementRules)}`,
		'3. Provide the "originalIngredients" exactly from the source.',
		`4. Translate to ${responseLanguage}.`,
		"5. For the ingredients list: Extract the main ingredients with their total amounts for the entire recipe.",
		"6. For instruction steps: Include the exact same steps as in the source, but translated to the target language.",
		`7. For each instruction step's "ingredients":\n${asBullets(STEP_INGREDIENT_RULES)}`,
		`8. ALWAYS include the "recipeType" field in the response.\n${asBullets(RECIPE_TYPE_RULES)}`,
		`9. Time extraction:\n${asBullets(TIME_RULES)}`,
		"",
		"REQUIRED JSON SCHEMA FOR RESPONSE:",
		JSON.stringify(recipeExtractJsonSchema, null, 2),
	].join("\n");
};

const buildGroundedPrompt = ({
	url,
	language,
	targetSystem,
}: {
	url: string;
	language: Language;
	targetSystem: MeasureSystem;
}) =>
	[
		"Fetch and extract recipe details from this exact URL using URL context retrieval:",
		url,
		"",
		`Target language: ${language}`,
		`Target measurement system: ${targetSystem}`,
		"",
		"Use only information from this URL retrieval. Do not use related or similar pages.",
		"Return a concise extraction containing title, ingredients, steps, servings/yield, and time from the source.",
	].join("\n");

const pageNotSupportedResponse = () =>
	new Response(
		JSON.stringify({
			errorCode: "PAGE_NOT_SUPPORTED",
			error: "Could not extract a valid recipe from this page.",
		}),
		{ status: 422 },
	);

const extractionFailedResponse = (message: string) =>
	new Response(
		JSON.stringify({
			errorCode: "EXTRACTION_FAILED",
			error: message,
		}),
		{ status: 500 },
	);

const normalizeHost = (url: string) => {
	try {
		return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
	} catch {
		return "";
	}
};

const isSameDomain = (targetUrl: string, retrievedUrl: string) => {
	const targetHost = normalizeHost(targetUrl);
	const retrievedHost = normalizeHost(retrievedUrl);
	if (!targetHost || !retrievedHost) return false;
	return (
		targetHost === retrievedHost ||
		targetHost.endsWith(`.${retrievedHost}`) ||
		retrievedHost.endsWith(`.${targetHost}`)
	);
};

const getUrlContextSummary = (response: unknown, targetUrl: string) => {
	const payload = response as {
		candidates?: Array<{
			urlContextMetadata?: {
				urlMetadata?: Array<{
					retrievedUrl?: string;
					urlRetrievalStatus?: string;
				}>;
			};
		}>;
	};

	const allMetadata = (payload.candidates || []).flatMap(
		(candidate) => candidate.urlContextMetadata?.urlMetadata || [],
	);

	const hasSuccessForTarget = allMetadata.some(
		(entry) =>
			entry.urlRetrievalStatus === "URL_RETRIEVAL_STATUS_SUCCESS" &&
			typeof entry.retrievedUrl === "string" &&
			isSameDomain(targetUrl, entry.retrievedUrl),
	);

	return {
		allMetadata,
		hasSuccessForTarget,
	};
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
					return extractionFailedResponse("API Key is missing");
				}

				const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
				const systemInstruction = buildSystemInstruction({
					targetSystem,
					language,
				});

				try {
					const groundedPrompt = buildGroundedPrompt({
						url,
						language,
						targetSystem,
					});

					const groundedResponse = await ai.models.generateContent({
						model: EXTRACTION_MODEL,
						contents: groundedPrompt,
						config: {
							systemInstruction,
							responseMimeType: "application/json",
							responseJsonSchema: recipeExtractJsonSchema,
							tools: [{ urlContext: {} }],
						},
					});

					const urlContextSummary = getUrlContextSummary(groundedResponse, url);
					if (!urlContextSummary.hasSuccessForTarget) {
						return pageNotSupportedResponse();
					}

					const groundedText = groundedResponse.text?.trim() || "";
					if (!groundedText) {
						return pageNotSupportedResponse();
					}

					const parsedGrounded = parseJson(groundedText);
					if (parsedGrounded) {
						const validatedGrounded =
							recipeExtractSchema.safeParse(parsedGrounded);
						if (validatedGrounded.success) {
							return Response.json({
								...validatedGrounded.data,
								sourceUrl: url,
								createdAt: Date.now(),
								language,
								measureSystem: targetSystem,
							} as Partial<Recipe>);
						}
					}
					return pageNotSupportedResponse();
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return extractionFailedResponse(message);
				}
			},
		},
	},
});
