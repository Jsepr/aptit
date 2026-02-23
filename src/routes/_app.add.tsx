import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import AddRecipe from "../components/AddRecipe.tsx";
import { useAppState } from "../state/appState.tsx";

type AddRecipeRouteSearch = {
	url?: string;
};

export const Route = createFileRoute("/_app/add")({
	component: AddRecipeRoute,
	validateSearch: (search: Record<string, unknown>): AddRecipeRouteSearch => ({
		url: (search.url as string) || '',
	}),
});

function AddRecipeRoute() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/_app/add" });
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
			initialUrl={search.url}
		/>
	);
}
