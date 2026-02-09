import {
	AlertCircle,
	ArrowLeft,
	Link as LinkIcon,
	Loader2,
	Sparkles,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { extractRecipe } from "../services/geminiService.ts";
import type {
	Language,
	MeasureSystem,
	Recipe,
	RecipeData,
	Translation,
} from "../types.ts";

interface AddRecipeProps {
	onSave: (recipe: Recipe) => void;
	onCancel: () => void;
	t: Translation;
	language: Language;
	measureSystem: MeasureSystem;
}

const AddRecipe: React.FC<AddRecipeProps> = ({
	onSave,
	onCancel,
	t,
	language,
	measureSystem,
}) => {
	const [url, setUrl] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [statusText, setStatusText] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!url.trim()) return;

		setIsLoading(true);
		setError(null);
		setStatusText(t.analyzing);

		try {
			const extractedData = await extractRecipe({
				url,
				language,
				targetSystem: measureSystem,
			});

			if (extractedData) {
				// Image generation disabled — use extracted image if available.
				const animeImageUrl = null;

				const ingredients = extractedData.ingredients || [];
				const originalIngredients = extractedData.originalIngredients || [];
				const originalInstructionsRaw = extractedData.originalInstructions || [];
				const baseServingsCount = extractedData.baseServingsCount || 1;

				const instructions = extractedData.instructions
					? extractedData.instructions.map((inst: any) => {
							if (typeof inst === "string")
								return { text: inst, ingredients: [] };
							return inst;
						})
					: [];

				const originalInstructions = originalInstructionsRaw
					? originalInstructionsRaw.map((inst: any) => {
						if (typeof inst === "string")
							return { text: inst, ingredients: [] };
						return inst;
					})
					: [];

				const recipeData: RecipeData = { ingredients, instructions };

				const newRecipe: Recipe = {
					id: uuidv4(),
					title: extractedData.title || "Untitled Recipe",
					description: extractedData.description || "",
					ingredients: ingredients,
					originalIngredients: originalIngredients,
					baseServingsCount: baseServingsCount,
					instructions: instructions,
					originalInstructions: originalInstructions,
					prepTime: extractedData.prepTime,
					cookTime: extractedData.cookTime,
					servings: extractedData.servings,
					sourceUrl: url,
					imageUrl: extractedData.imageUrl,
					createdAt: Date.now(),
					language: language,
					measureSystem: measureSystem,
					metricData: measureSystem === "metric" ? recipeData : undefined,
					imperialData: measureSystem === "imperial" ? recipeData : undefined,
				};
				onSave(newRecipe);
			} else {
				setError(t.error);
			}
		} catch (err) {
			console.error(err);
			setError(t.error);
		} finally {
			setIsLoading(false);
			setStatusText("");
		}
	};

	return (
		<div className="max-w-2xl mx-auto">
			<button
				type="button"
				onClick={onCancel}
				className="mb-6 flex items-center text-gray-500 hover:text-cream-900 transition-colors"
			>
				<ArrowLeft size={18} className="mr-1" />
				{t.back}
			</button>

			<div className="bg-white rounded-3xl shadow-lg border border-cream-200 p-8 md:p-12">
				<h2 className="text-3xl font-serif font-bold text-cream-900 mb-6">
					{t.addRecipe}
				</h2>
				<p className="text-gray-600 mb-8">
					{t.pasteLink}
				</p>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
							<LinkIcon size={20} className="text-gray-400" />
						</div>
						<input
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder={t.exampleUrl}
							className="w-full pl-12 pr-4 py-4 rounded-xl border border-cream-300 focus:border-accent-orange focus:ring-2 focus:ring-accent-orange/20 outline-none transition-all bg-cream-50 text-cream-900 placeholder-gray-400"
							required
						/>
					</div>

					{error && (
						<div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
							<AlertCircle size={20} />
							<p>{error}</p>
						</div>
					)}

					<button
						type="submit"
						disabled={isLoading || !url}
						className={`w-full py-4 rounded-xl font-bold text-white shadow-md transition-all flex justify-center items-center gap-3
              ${
								isLoading || !url
									? "bg-gray-300 cursor-not-allowed"
									: "bg-accent-orange hover:bg-orange-600 hover:shadow-lg transform hover:-translate-y-0.5"
							}`}
					>
						{isLoading ? (
							<>
								<Loader2 size={24} className="animate-spin" />
								<span className="flex items-center gap-2">
									{statusText || t.analyzing}
									<Sparkles size={16} className="animate-pulse" />
								</span>
							</>
						) : (
							t.analyze
						)}
					</button>
				</form>
			</div>
		</div>
	);
};

export default AddRecipe;
