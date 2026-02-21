import { createFileRoute, useNavigate } from "@tanstack/react-router";
import AddRecipe from "../components/AddRecipe.tsx";
import { useAppState } from "../state/appState.tsx";

export const Route = createFileRoute("/_app/add")({
	component: AddRecipeRoute,
});

function AddRecipeRoute() {
	const navigate = useNavigate();
	const { addRecipe, language, measureSystem, t } = useAppState();

	return (
		<AddRecipe
			onSave={(recipe) => {
				addRecipe(recipe);
				navigate({ to: "/recipe/$recipeId", params: { recipeId: recipe.id } });
			}}
			t={t}
			language={language}
			measureSystem={measureSystem}
		/>
	);
}
