import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Language, MeasureSystem, Recipe } from "../types.ts";
import { type Translation, translations } from "../utils/i18n.ts";

const LOCAL_STORAGE_KEY = "aptit_recipes_v4";
const LANG_STORAGE_KEY = "aptit_lang_v4";
const SYSTEM_STORAGE_KEY = "aptit_system_v4";

const OLD_STORAGE_KEYS = [
	"aptit_recipes_v1",
	"aptit_recipes_v2",
	"aptit_recipes_v3",
	"aptit_lang_v1",
	"aptit_lang_v2",
	"aptit_lang_v3",
	"aptit_system_v1",
	"aptit_system_v2",
	"aptit_system_v3",
];

interface AppStateContextValue {
	recipes: Recipe[];
	language: Language;
	measureSystem: MeasureSystem;
	preferencesConfigured: boolean;
	hydrated: boolean;
	t: Translation;
	addRecipe: (recipe: Recipe) => void;
	deleteRecipe: (id: string) => void;
	savePreferences: (language: Language, measureSystem: MeasureSystem) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
	const [recipes, setRecipes] = useState<Recipe[]>([]);
	const [language, setLanguage] = useState<Language>("en");
	const [measureSystem, setMeasureSystem] = useState<MeasureSystem>("metric");
	const [preferencesConfigured, setPreferencesConfigured] = useState(false);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		for (const key of OLD_STORAGE_KEYS) {
			localStorage.removeItem(key);
		}

		const savedRecipes = localStorage.getItem(LOCAL_STORAGE_KEY);
		const savedLang = localStorage.getItem(LANG_STORAGE_KEY) as Language | null;
		const savedSystem = localStorage.getItem(
			SYSTEM_STORAGE_KEY,
		) as MeasureSystem | null;

		let parsedRecipes: Recipe[] = [];
		if (savedRecipes) {
			try {
				const parsed = JSON.parse(savedRecipes);
				parsedRecipes = Array.isArray(parsed) ? (parsed as Recipe[]) : [];
			} catch {
				localStorage.removeItem(LOCAL_STORAGE_KEY);
			}
		}

		setRecipes(parsedRecipes);
		setLanguage(savedLang || "en");
		setMeasureSystem(savedSystem || "metric");
		setPreferencesConfigured(Boolean(savedLang && savedSystem));
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recipes));
	}, [recipes, hydrated]);

	useEffect(() => {
		if (!hydrated || !preferencesConfigured) return;
		localStorage.setItem(LANG_STORAGE_KEY, language);
	}, [language, preferencesConfigured, hydrated]);

	useEffect(() => {
		if (!hydrated || !preferencesConfigured) return;
		localStorage.setItem(SYSTEM_STORAGE_KEY, measureSystem);
	}, [measureSystem, preferencesConfigured, hydrated]);

	const value = useMemo<AppStateContextValue>(
		() => ({
			recipes,
			language,
			measureSystem,
			preferencesConfigured,
			hydrated,
			t: translations[language],
			addRecipe: (recipe) => {
				setRecipes((prev) => [recipe, ...prev]);
			},
			deleteRecipe: (id) => {
				setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
			},
			savePreferences: (nextLanguage, nextMeasureSystem) => {
				setLanguage(nextLanguage);
				setMeasureSystem(nextMeasureSystem);
				setPreferencesConfigured(true);
			},
		}),
		[recipes, language, measureSystem, preferencesConfigured, hydrated],
	);

	return (
		<AppStateContext.Provider value={value}>
			{children}
		</AppStateContext.Provider>
	);
}

export function useAppState() {
	const context = useContext(AppStateContext);
	if (!context) {
		throw new Error("useAppState must be used within an AppStateProvider");
	}
	return context;
}
