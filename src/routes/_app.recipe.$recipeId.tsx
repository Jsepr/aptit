import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import RecipeDetail from "../components/RecipeDetail.tsx";
import { useAppState } from "../state/appState.tsx";

export const Route = createFileRoute("/_app/recipe/$recipeId")({
	component: RecipeDetailRoute,
});

function RecipeDetailRoute() {
	const navigate = useNavigate();
	const { recipeId } = Route.useParams();
	const { recipes, deleteRecipe, t } = useAppState();
	const recipe = recipes.find((item) => item.id === recipeId);

	useEffect(() => {
		if (!recipe) {
			navigate({ to: "/", replace: true });
		}
	}, [recipe, navigate]);

	if (!recipe) return null;

	return (
		<RecipeDetail
			recipe={recipe}
			onDelete={(id) => {
				deleteRecipe(id);
				navigate({ to: "/" });
			}}
			t={t}
		/>
	);
}
