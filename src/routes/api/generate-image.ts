import { GoogleGenAI } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-image")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { dishName } = (await request.json()) as { dishName: string };

				if (!process.env.GEMINI_API_KEY) {
					console.error("API Key is missing");
					return new Response(JSON.stringify({ error: "API Key is missing" }), {
						status: 500,
					});
				}
				const apiKey = process.env.GEMINI_API_KEY;
				const ai = new GoogleGenAI({ apiKey });

				try {
					const response = await ai.models.generateContent({
						model: "gemini-2.5-flash-image",
						contents: {
							parts: [
								{
									text: `A beautiful, delicious-looking anime-style digital painting of ${dishName}. IMPORTANT: The image must NOT contain any text, words, names, or labels. NO typography. Just a pure artistic illustration of the food. Vibrant colors, soft Ghibli-esque lighting, professional food illustration, clean lines, high quality, centered composition.`,
								},
							],
						},
						config: {
							imageConfig: {
								aspectRatio: "16:9",
							},
						},
					});

					for (const part of response.candidates?.[0]?.content?.parts || []) {
						if (part.inlineData) {
							return Response.json({
								imageUrl: `data:image/png;base64,${part.inlineData.data}`,
							});
						}
					}
					return Response.json({ imageUrl: null });
				} catch (error: any) {
					console.error("Image Generation Error:", error);
					return new Response(JSON.stringify({ error: error.message }), {
						status: 500,
					});
				}
			},
		},
	},
});
