import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	Check,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Circle,
	Clock,
	ExternalLink,
	Eye,
	FileText,
	Minus,
	Plus,
	Scale,
	Sparkles,
	Trash2,
	Users,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { Ingredient, Recipe } from "../types.ts";
import { formatDuration } from "../utils/formatDuration.ts";
import type { Translation } from "../utils/i18n.ts";
import { getRecipeArtworkDataUri } from "../utils/recipeArtwork.ts";
import {
	findMatchingTopIngredient,
	resolveStepIngredient,
} from "../utils/stepIngredients.ts";

interface RecipeDetailProps {
	recipe: Recipe;
	onDelete: (id: string) => void;
	t: Translation;
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onDelete, t }) => {
	const baseMultiplier =
		recipe.recipeType === "baking" ? 1 : recipe.baseServingsCount;
	const [multiplier, setMultiplier] = useState(baseMultiplier);
	const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
		new Set(),
	);
	const [stepCheckedIngredients, setStepCheckedIngredients] = useState<
		Record<number, Set<number>>
	>({});
	const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
	const [expandedIngredients, setExpandedIngredients] = useState<Set<number>>(
		new Set([0]),
	);
	const [showOriginal, setShowOriginal] = useState(false);

	const scaleMultiplier = multiplier / baseMultiplier;

	/** Scale only numeric amounts (skip temps/times). Used for ingredient amount + unit display. */
	const scaleAmountString = (amountStr: string) => {
		if (scaleMultiplier === 1) return amountStr;
		return amountStr.replace(
			/(\d+\s+\d+[/]\d+)|(\d+[/]\d+)|(\d+([.,]\d+)?)/g,
			(match, mixed, fraction, _decimal, _p4, offset, fullString) => {
				const strToSearch = typeof fullString === "string" ? fullString : "";
				const lookahead = strToSearch
					.substring(offset + match.length, offset + match.length + 12)
					.toLowerCase();

				if (lookahead.match(/[°º]|\b(deg|min|hour|hr|stund|sek|minut)/))
					return match;

				let value: number;
				if (mixed) {
					const parts = mixed.split(/\s+/);
					const whole = parseInt(parts[0], 10);
					const fracParts = parts[1].split("/");
					value =
						whole + parseInt(fracParts[0], 10) / parseInt(fracParts[1], 10);
				} else if (fraction) {
					const parts = fraction.split("/");
					value = parseInt(parts[0], 10) / parseInt(parts[1], 10);
				} else {
					value = parseFloat(match.replace(",", "."));
				}

				const scaled = value * scaleMultiplier;
				return scaled % 1 === 0
					? scaled.toString()
					: scaled.toFixed(2).replace(/\.?0+$/, "");
			},
		);
	};

	/** Format ingredient for display: amount (scaled) + unit + name. */
	const formatIngredientLine = (ing: Ingredient, scale = true) => {
		const amount = scale ? scaleAmountString(ing.amount) : ing.amount;
		return [amount, ing.unit, ing.name].filter(Boolean).join(" ").trim();
	};

	const currentData = useMemo(() => {
		return {
			ingredients: recipe.ingredients,
			instructions: recipe.instructions,
		};
	}, [recipe.ingredients, recipe.instructions]);

	const findIngredientIndex = (ingredientName: string): number => {
		const match = findMatchingTopIngredient(
			ingredientName,
			currentData.ingredients,
		);
		return match ? currentData.ingredients.indexOf(match) : -1;
	};

	const formatStepIngredient = (ingredient: Ingredient): string => {
		const resolved = resolveStepIngredient(ingredient, currentData.ingredients);
		return formatIngredientLine(resolved, true);
	};

	const toggleMasterIngredient = (index: number) => {
		const next = new Set(checkedIngredients);
		const isNowChecked = !next.has(index);
		if (isNowChecked) next.add(index);
		else next.delete(index);
		setCheckedIngredients(next);

		const masterIng = currentData.ingredients[index];
		const masterName = masterIng.name.toLowerCase();
		const nextStepChecked = { ...stepCheckedIngredients };
		const nextCompletedSteps = new Set(completedSteps);

		currentData.instructions.forEach((step, sIdx) => {
			const stepSet = new Set(nextStepChecked[sIdx] || []);
			step.ingredients.forEach((si, iIdx) => {
				const stepIngredientName = resolveStepIngredient(
					si,
					currentData.ingredients,
				).name.toLowerCase();
				if (
					stepIngredientName.includes(masterName) ||
					masterName.includes(stepIngredientName)
				) {
					if (isNowChecked) stepSet.add(iIdx);
					else stepSet.delete(iIdx);
				}
			});
			nextStepChecked[sIdx] = stepSet;
			if (
				stepSet.size === step.ingredients.length &&
				step.ingredients.length > 0
			)
				nextCompletedSteps.add(sIdx);
			else nextCompletedSteps.delete(sIdx);
		});
		setStepCheckedIngredients(nextStepChecked);
		setCompletedSteps(nextCompletedSteps);
	};

	const toggleStepIngredient = (
		stepIdx: number,
		subIngIdx: number,
		ingredientName: string,
		e: React.MouseEvent,
	) => {
		e.stopPropagation();
		const stepSet = new Set(stepCheckedIngredients[stepIdx] || []);
		const isNowChecked = !stepSet.has(subIngIdx);
		if (isNowChecked) stepSet.add(subIngIdx);
		else stepSet.delete(subIngIdx);
		setStepCheckedIngredients({
			...stepCheckedIngredients,
			[stepIdx]: stepSet,
		});

		const nextCompletedSteps = new Set(completedSteps);
		if (
			isNowChecked &&
			stepSet.size === currentData.instructions[stepIdx].ingredients.length
		)
			nextCompletedSteps.add(stepIdx);
		else nextCompletedSteps.delete(stepIdx);
		setCompletedSteps(nextCompletedSteps);

		const mIdx = findIngredientIndex(ingredientName);
		if (mIdx !== -1) {
			const nextMaster = new Set(checkedIngredients);
			if (isNowChecked) nextMaster.add(mIdx);
			else nextMaster.delete(mIdx);
			setCheckedIngredients(nextMaster);
		}
	};

	const toggleStep = (stepIdx: number) => {
		const nextCompletedSteps = new Set(completedSteps);
		const isCompleting = !nextCompletedSteps.has(stepIdx);
		const step = currentData.instructions[stepIdx];
		const nextStepChecked = { ...stepCheckedIngredients };
		const nextMaster = new Set(checkedIngredients);

		if (isCompleting) {
			nextCompletedSteps.add(stepIdx);
			const stepSet = new Set<number>();
			step.ingredients.forEach((ing, iIdx) => {
				stepSet.add(iIdx);
				const mIdx = findIngredientIndex(
					resolveStepIngredient(ing, currentData.ingredients).name,
				);
				if (mIdx !== -1) nextMaster.add(mIdx);
			});
			nextStepChecked[stepIdx] = stepSet;
		} else {
			nextCompletedSteps.delete(stepIdx);
			const stepSet = new Set<number>();
			nextStepChecked[stepIdx] = stepSet;
			step.ingredients.forEach((ing) => {
				const mIdx = findIngredientIndex(
					resolveStepIngredient(ing, currentData.ingredients).name,
				);
				if (mIdx !== -1) nextMaster.delete(mIdx);
			});
		}
		setCompletedSteps(nextCompletedSteps);
		setStepCheckedIngredients(nextStepChecked);
		setCheckedIngredients(nextMaster);
	};

	const toggleExpandIngredients = (stepIdx: number) => {
		const next = new Set(expandedIngredients);
		if (next.has(stepIdx)) next.delete(stepIdx);
		else next.add(stepIdx);
		setExpandedIngredients(next);
	};

	const adjustMultiplier = (delta: number) => {
		setMultiplier((prev) => {
			const newVal = prev + delta;
			return newVal >= 0.5 ? newVal : prev;
		});
	};

	const displayedIngredients =
		showOriginal && recipe.originalIngredients
			? recipe.originalIngredients
			: currentData.ingredients;

	return (
		<div className="max-w-4xl mx-auto animate-in fade-in duration-500 relative pb-20">
			<div className="flex justify-between items-center mb-6">
				<Link
					to="/"
					className="inline-flex items-center text-gray-600 hover:text-cream-900 font-medium transition-colors"
				>
					<ArrowLeft size={20} className="mr-2" /> {t.back}
				</Link>
				<button
					type="button"
					onClick={() => window.confirm(t.deleteConfirm) && onDelete(recipe.id)}
					className="text-red-400 p-2 rounded-full hover:bg-red-50 transition-colors"
				>
					<Trash2 size={20} />
				</button>
			</div>

			<div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-cream-200">
				<div className="relative h-64 md:h-80">
					<img
						src={getRecipeArtworkDataUri({
							id: recipe.id,
							title: recipe.title,
							recipeType: recipe.recipeType,
						})}
						alt={recipe.title}
						className="w-full h-full object-cover"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
					<div className="absolute bottom-0 left-0 p-8 text-white w-full">
						<div className="flex gap-2 mb-2">
							<span className="bg-accent-orange px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 shadow-sm">
								<Scale size={12} />{" "}
								{showOriginal
									? t.original
									: recipe.measureSystem === "metric"
										? t.metric
										: t.imperial}
							</span>
							<button
								type="button"
								onClick={() => setShowOriginal(!showOriginal)}
								className="bg-white/20 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 hover:bg-white/40 transition-colors"
							>
								{showOriginal ? <Eye size={12} /> : <FileText size={12} />}{" "}
								{showOriginal ? t.showConverted : t.showOriginal}
							</button>
						</div>
						<h2 className="text-3xl font-serif font-bold leading-tight">
							{recipe.title}
						</h2>
					</div>
				</div>

				<div className="p-8 md:p-12">
					<div className="flex flex-wrap gap-6 mb-10 py-6 border-y border-cream-100 items-center">
						<div className="flex items-center gap-3">
							<div className="bg-cream-100 p-2 rounded-lg text-accent-orange">
								<Clock size={20} />
							</div>
							<div>
								<p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest leading-none mb-1">
									{t.time}
								</p>
								<p className="font-semibold">
									{formatDuration(recipe.time) || t.notAvailable}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="bg-cream-100 p-2 rounded-lg text-accent-orange">
								<Users size={20} />
							</div>
							<div>
								<p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest leading-none mb-1">
									{recipe.recipeType === "baking" ? t.servings : t.portions}
								</p>
								<div className="flex items-center gap-3 bg-cream-50 rounded-full px-2 py-1 border border-cream-200 mt-1">
									<button
										type="button"
										onClick={() => adjustMultiplier(-1)}
										className="p-1 hover:bg-cream-200 rounded-full text-accent-orange transition-colors"
									>
										<Minus size={14} />
									</button>
									<span className="font-bold text-sm min-w-[30px] text-center">
										{multiplier}
									</span>
									<button
										type="button"
										onClick={() => adjustMultiplier(1)}
										className="p-1 hover:bg-cream-200 rounded-full text-accent-orange transition-colors"
									>
										<Plus size={14} />
									</button>
								</div>
							</div>
						</div>
						{recipe.servings && (
							<div className="flex items-center gap-3">
								<div className="bg-cream-100 p-2 rounded-lg text-accent-orange">
									<Sparkles size={20} />
								</div>
								<div>
									<p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest leading-none mb-1">
										{t.originalYield}
									</p>
									<p className="font-semibold">{recipe.servings}</p>
								</div>
							</div>
						)}
						<a
							href={recipe.sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="ml-auto flex items-center gap-2 px-4 py-2 rounded-full bg-cream-50 hover:bg-cream-100 text-accent-soft transition-colors border border-cream-200 text-sm font-medium"
						>
							<ExternalLink size={16} /> {t.source}
						</a>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
						<div className="lg:col-span-5">
							<h3 className="text-xl font-serif font-bold mb-6 flex items-center gap-2">
								<span className="w-1.5 h-6 bg-accent-orange rounded-full" />{" "}
								{t.ingredients}
							</h3>
							<ul className="space-y-3">
								{displayedIngredients.map((ing, idx) => (
									<li
										key={idx}
										onClick={() => toggleMasterIngredient(idx)}
										className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border border-transparent group transition-all ${checkedIngredients.has(idx) ? "bg-cream-50 text-gray-400 line-through" : "hover:bg-cream-50 hover:border-cream-100"}`}
									>
										<div className="mt-0.5">
											{checkedIngredients.has(idx) ? (
												<CheckCircle size={20} className="text-green-500" />
											) : (
												<Circle size={20} className="text-cream-300" />
											)}
										</div>
										<span className="text-sm font-medium flex-grow">
											{formatIngredientLine(ing, !showOriginal)}
										</span>
									</li>
								))}
							</ul>
						</div>

						<div className="lg:col-span-7">
							<h3 className="text-xl font-serif font-bold mb-6 flex items-center gap-2">
								<span className="w-1.5 h-6 bg-accent-orange rounded-full" />{" "}
								{t.instructions}
							</h3>
							<div className="space-y-6">
								{currentData.instructions.map((step, idx) => (
									<div
										key={idx}
										className={`rounded-2xl border transition-all overflow-hidden ${completedSteps.has(idx) ? "border-green-200 bg-green-50/10" : "border-cream-200 hover:border-cream-300"}`}
									>
										<div className="flex gap-4 p-5 items-start">
											<button
												type="button"
												onClick={() => toggleStep(idx)}
												className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-transform hover:scale-110 ${completedSteps.has(idx) ? "bg-green-500 text-white" : "bg-accent-orange text-white"}`}
											>
												{completedSteps.has(idx) ? (
													<Check size={16} />
												) : (
													idx + 1
												)}
											</button>
											<div className="flex-grow">
												<p
													className={`font-medium leading-relaxed transition-all ${completedSteps.has(idx) ? "text-gray-400" : "text-cream-900"}`}
												>
													{step.text}
												</p>
												{showOriginal &&
													recipe.originalInstructions &&
													recipe.originalInstructions[idx] && (
														<p className="text-sm text-gray-500 italic mt-2">
															{recipe.originalInstructions[idx].text}
														</p>
													)}
												{step.ingredients.length > 0 && (
													<button
														type="button"
														onClick={() => toggleExpandIngredients(idx)}
														className="mt-4 flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-accent-orange hover:text-orange-600 transition-colors"
													>
														{expandedIngredients.has(idx)
															? t.hideIngredients
															: `${t.checkIngredients} (${step.ingredients.length})`}
														{expandedIngredients.has(idx) ? (
															<ChevronUp size={14} />
														) : (
															<ChevronDown size={14} />
														)}
													</button>
												)}
											</div>
										</div>
										{expandedIngredients.has(idx) &&
											step.ingredients.length > 0 && (
												<div className="px-5 pb-6 pt-0 border-t border-cream-50 bg-cream-50/30 animate-in slide-in-from-top-2">
													<div className="pl-12 mt-4 flex flex-wrap gap-2">
														{step.ingredients.map((ing, iIdx) => (
															<div
																key={iIdx}
																className="flex items-center gap-1"
															>
																<button
																	type="button"
																	onClick={(e) =>
																		toggleStepIngredient(
																			idx,
																			iIdx,
																			resolveStepIngredient(
																				ing,
																				currentData.ingredients,
																			).name,
																			e,
																		)
																	}
																	className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${stepCheckedIngredients[idx]?.has(iIdx) ? "bg-green-100 border-green-200 text-green-700 line-through" : "bg-white border-cream-200 shadow-sm hover:border-accent-orange"}`}
																>
																	{stepCheckedIngredients[idx]?.has(iIdx) ? (
																		<CheckCircle size={12} />
																	) : (
																		<Circle size={12} />
																	)}
																	{formatStepIngredient(ing)}
																</button>
															</div>
														))}
													</div>
												</div>
											)}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default RecipeDetail;
