import { createFileRoute } from "@tanstack/react-router";
import RecipeList from "../components/RecipeList.tsx";
import { useAppState } from "../state/appState.tsx";

export const Route = createFileRoute("/_app/")({
	component: RecipesIndexRoute,
});

function RecipesIndexRoute() {
	const { recipes, t } = useAppState();

	return <RecipeList recipes={recipes} t={t} />;
}
