import { ChevronRight, Clock, Palette, Users, Utensils } from "lucide-react";
import type React from "react";
import type { Recipe, Translation } from "../types.ts";
import { formatDuration } from "../utils/formatDuration.ts";

interface RecipeListProps {
	recipes: Recipe[];
	onSelect: (id: string) => void;
	onAdd: () => void;
	t: Translation;
}

const RecipeList: React.FC<RecipeListProps> = ({
	recipes,
	onSelect,
	onAdd,
	t,
}) => {
	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-serif font-bold text-cream-900">
					{t.myRecipes}
				</h2>
				<button
					type="button"
					onClick={onAdd}
					className="bg-accent-orange hover:bg-orange-600 text-white px-5 py-2.5 rounded-full font-medium shadow-md transition-all flex items-center gap-2 transform hover:scale-105"
				>
					<span>+</span> {t.addRecipe}
				</button>
			</div>

			{recipes.length === 0 ? (
				<div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-cream-200">
					<div className="flex justify-center mb-4">
						<div className="bg-cream-100 p-6 rounded-full text-4xl text-accent-orange">
							<Utensils size={48} />
						</div>
					</div>
					<p className="text-lg text-cream-900 mb-6 font-medium">
						{t.noRecipes}
					</p>
					<button
						type="button"
						onClick={onAdd}
						className="text-accent-orange font-semibold hover:underline bg-accent-orange/10 px-6 py-2 rounded-full hover:bg-accent-orange/20 transition-colors"
					>
						{t.addRecipe}
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{recipes.map((recipe) => (
						<button
							type="button"
							key={recipe.id}
							onClick={() => onSelect(recipe.id)}
							className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-cream-200 overflow-hidden cursor-pointer transition-all duration-300 group flex flex-col h-full"
						>
							<div className="h-48 overflow-hidden bg-cream-100 relative">
								{recipe.imageUrl ? (
									<img
										src={recipe.imageUrl}
										alt={recipe.title}
										className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
									/>
								) : (
									<div className="w-full h-full flex flex-col items-center justify-center bg-cream-50 text-cream-200">
										<Palette size={48} />
										<span className="text-[10px] uppercase tracking-widest mt-2 font-bold">
											{t.animeFoodArt}
										</span>
									</div>
								)}

								<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
							</div>

							<div className="p-5 flex flex-col flex-grow">
								<h3 className="text-xl font-serif font-bold text-cream-900 mb-2 line-clamp-2 leading-tight">
									{recipe.title}
								</h3>
								{recipe.description && (
									<p className="text-sm text-gray-500 line-clamp-2 mb-4">
										{recipe.description}
									</p>
								)}

								<div className="mt-auto flex items-center justify-between text-xs font-medium text-gray-500 pt-4 border-t border-cream-100">
									<div className="flex gap-4">
										{(recipe.prepTime || recipe.cookTime) && (
											<div className="flex items-center gap-1">
												<Clock size={14} className="text-accent-soft" />
												<span>{formatDuration(recipe.prepTime || recipe.cookTime)}</span>
											</div>
										)}
										{recipe.servings && (
											<div className="flex items-center gap-1">
												<Users size={14} className="text-accent-soft" />
												<span>{recipe.servings}</span>
											</div>
										)}
									</div>
									<ChevronRight
										size={16}
										className="text-cream-300 group-hover:text-accent-orange transition-colors"
									/>
								</div>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default RecipeList;
