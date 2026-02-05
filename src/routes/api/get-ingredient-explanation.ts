import { GoogleGenAI, Type } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";
import type { Language } from "../../types";

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

export const Route = createFileRoute("/api/get-ingredient-explanation")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { ingredient, language } = (await request.json()) as {
					ingredient: string;
					language: Language;
				};

				if (!process.env.GEMINI_API_KEY)
					return Response.json(null);

				const apiKey = process.env.GEMINI_API_KEY;
				const ai = new GoogleGenAI({ apiKey });

				const systemInstruction = `Culinary expert. Explain ingredient in ${language === "sv" ? "Swedish" : "English"}. Return JSON.`;
				const prompt = `Explain what "${ingredient}" is and list 2-3 common substitutes.`;

				try {
					const response = await ai.models.generateContent({
						model: "gemini-2.0-flash",
						contents: prompt,
						config: {
							systemInstruction: systemInstruction,
							responseMimeType: "application/json",
							responseSchema: {
								type: Type.OBJECT,
								properties: {
									description: { type: Type.STRING },
									substitutes: {
										type: Type.ARRAY,
										items: { type: Type.STRING },
									},
								},
								required: ["description", "substitutes"],
							},
						},
					});

					if (response.text) {
						const data = parseJson(response.text) as {
							description: string;
							substitutes: string[];
						};
						return Response.json(data);
					}
					return Response.json(null);
				} catch (error: any) {
					console.error("Ingredient Explanation Error:", error);
					return new Response(JSON.stringify({ error: error.message }), {
						status: 500,
					});
				}
			},
		},
	},
});
