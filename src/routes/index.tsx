import { createFileRoute } from "@tanstack/react-router";
import { ChefHat, Globe, Save, Scale } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AddRecipe from "../components/AddRecipe.tsx";
import RecipeDetail from "../components/RecipeDetail.tsx";
import RecipeList from "../components/RecipeList.tsx";
import type { AppState, Language, MeasureSystem, Recipe } from "../types.ts";
import { translations } from "../utils/i18n.ts";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const LOCAL_STORAGE_KEY = "aptit_recipes_v1";
const LANG_STORAGE_KEY = "aptit_lang_v1";
const SYSTEM_STORAGE_KEY = "aptit_system_v1";

function getInitialState(): AppState {
	if (typeof window === "undefined") {
		return {
			recipes: [],
			view: "list",
			selectedRecipeId: null,
			language: "sv",
			measureSystem: "metric",
		};
	}

	const savedRecipes = localStorage.getItem(LOCAL_STORAGE_KEY);
	const savedLang = localStorage.getItem(LANG_STORAGE_KEY) as Language | null;
	const savedSystem = localStorage.getItem(
		SYSTEM_STORAGE_KEY,
	) as MeasureSystem | null;

	const parsedRecipes: any[] = savedRecipes ? JSON.parse(savedRecipes) : [];

	const migratedRecipes: Recipe[] = parsedRecipes.map((r) => {
		const updated = { ...r };
		if (
			updated.instructions &&
			updated.instructions.length > 0 &&
			typeof updated.instructions[0] === "string"
		) {
			updated.instructions = (
				updated.instructions as unknown as string[]
			).map((text) => ({
				text: text,
				ingredients: [],
			}));
		}
		if (!updated.measureSystem) {
			updated.measureSystem = "metric";
		}
		return updated as Recipe;
	});

	return {
		recipes: migratedRecipes,
		view: "list",
		selectedRecipeId: null,
		language: savedLang || "sv",
		measureSystem: savedSystem || "metric",
	};
}

const RecipeListSkeleton = () => (
	<div className="space-y-6">
		<div className="flex justify-between items-center">
			<div className="h-8 w-40 bg-cream-200 animate-pulse rounded" />
			<div className="h-10 w-36 bg-cream-200 animate-pulse rounded-full" />
		</div>
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden"
				>
					<div className="h-48 bg-cream-200 animate-pulse" />
					<div className="p-5 space-y-3">
						<div className="h-6 w-3/4 bg-cream-200 animate-pulse rounded" />
						<div className="h-4 w-full bg-cream-200 animate-pulse rounded" />
						<div className="h-4 w-2/3 bg-cream-200 animate-pulse rounded" />
						<div className="pt-4 border-t border-cream-100 flex gap-4">
							<div className="h-4 w-16 bg-cream-200 animate-pulse rounded" />
							<div className="h-4 w-12 bg-cream-200 animate-pulse rounded" />
						</div>
					</div>
				</div>
			))}
		</div>
	</div>
);

function HomeComponent() {
	const [state, setState] = useState<AppState>(getInitialState);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		setHydrated(true);
	}, []);

	const isFirstRender = useRef(true);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.recipes));
	}, [state.recipes]);

	useEffect(() => {
		localStorage.setItem(LANG_STORAGE_KEY, state.language);
	}, [state.language]);

	useEffect(() => {
		localStorage.setItem(SYSTEM_STORAGE_KEY, state.measureSystem);
	}, [state.measureSystem]);

	const handleAddRecipe = (recipe: Recipe) => {
		setState((prev) => ({
			...prev,
			recipes: [recipe, ...prev.recipes],
			view: "detail",
			selectedRecipeId: recipe.id,
		}));
	};

	const handleDeleteRecipe = (id: string) => {
		setState((prev) => ({
			...prev,
			recipes: prev.recipes.filter((r) => r.id !== id),
			view: "list",
			selectedRecipeId: null,
		}));
	};

	const handleUpdateRecipe = (updatedRecipe: Recipe) => {
		setState((prev) => ({
			...prev,
			recipes: prev.recipes.map((r) =>
				r.id === updatedRecipe.id ? updatedRecipe : r,
			),
		}));
	};

	const t = translations[state.language];

	const toggleLanguage = () => {
		setState((prev) => ({
			...prev,
			language: prev.language === "en" ? "sv" : "en",
		}));
	};

	const toggleMeasureSystem = () => {
		setState((prev) => ({
			...prev,
			measureSystem: prev.measureSystem === "metric" ? "imperial" : "metric",
		}));
	};

	return (
		<div className="min-h-screen bg-[#FAF6EF] text-[#5D4037] pb-20">
			<header className="sticky top-0 z-50 bg-[#FAF6EF]/90 backdrop-blur-md border-b border-cream-200 mb-8 transition-all">
				<div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
					<div
						className="flex items-center gap-3 cursor-pointer group"
						onClick={() =>
							setState((prev) => ({
								...prev,
								view: "list",
								selectedRecipeId: null,
							}))
						}
					>
						<div className="bg-accent-orange text-white p-2 rounded-lg transform group-hover:rotate-3 transition-transform duration-300">
							<ChefHat size={24} />
						</div>
						<div className="flex flex-col">
							<h1 className="text-2xl font-serif font-bold tracking-tight text-cream-900 group-hover:text-accent-orange transition-colors leading-none">
								{t.title}
							</h1>
							<span className="text-[10px] uppercase tracking-widest text-cream-500 font-bold mt-1 flex items-center gap-1">
								<Save size={10} /> Auto-saved
							</span>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={toggleMeasureSystem}
							title={t.measureSystem}
							className="flex items-center gap-2 px-4 py-2 rounded-full bg-cream-200 hover:bg-cream-300 transition-all text-sm font-medium border border-cream-300 shadow-sm"
						>
							<Scale size={16} className="text-accent-orange" />
							<span>
								{state.measureSystem === "metric" ? t.metric : t.imperial}
							</span>
						</button>
						<button
							type="button"
							onClick={toggleLanguage}
							className="flex items-center gap-2 px-4 py-2 rounded-full bg-cream-200 hover:bg-cream-300 transition-all text-sm font-medium border border-cream-300 shadow-sm"
						>
							<Globe size={16} />
							<span>{state.language.toUpperCase()}</span>
						</button>
					</div>
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-6">
				{!hydrated && <RecipeListSkeleton />}
				{hydrated && state.view === "list" && (
					<RecipeList
						recipes={state.recipes}
						onSelect={(id) =>
							setState((prev) => ({
								...prev,
								view: "detail",
								selectedRecipeId: id,
							}))
						}
						onAdd={() => setState((prev) => ({ ...prev, view: "add" }))}
						t={t}
					/>
				)}

				{state.view === "add" && (
					<AddRecipe
						onSave={handleAddRecipe}
						onCancel={() => setState((prev) => ({ ...prev, view: "list" }))}
						t={t}
						language={state.language}
						measureSystem={state.measureSystem}
					/>
				)}

				{state.view === "detail" && state.selectedRecipeId && (
					<RecipeDetail
						recipe={state.recipes.find((r) => r.id === state.selectedRecipeId)!}
						globalMeasureSystem={state.measureSystem}
						onBack={() =>
							setState((prev) => ({
								...prev,
								view: "list",
								selectedRecipeId: null,
							}))
						}
						onDelete={handleDeleteRecipe}
						onUpdate={handleUpdateRecipe}
						t={t}
					/>
				)}
			</main>

			<footer className="mt-20 py-10 border-t border-cream-200 text-center text-cream-500 text-sm">
				<p>
					© {new Date().getFullYear()} Aptit Recipe Book. Your library is
					locally preserved.
				</p>
			</footer>
		</div>
	);
}
