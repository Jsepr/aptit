import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-image")({
	server: {
		handlers: {
			POST: async () => {
				return new Response(
					JSON.stringify({ error: "Image generation disabled" }),
					{
						status: 410,
					},
				);
			},
		},
	},
});
