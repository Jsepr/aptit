import type { Ingredient, Instruction } from "../types.ts";

const AMOUNT_PREFIX_REGEX =
	/^((?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s*-\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?))?(?:\s+[a-zA-Z\u00C0-\u017F%]+(?:\.[a-zA-Z\u00C0-\u017F%]+)*){0,3})\s+(.+)$/;

const normalizeName = (value: string) =>
	value
		.toLowerCase()
		.replace(/\([^)]*\)/g, " ")
		.replace(/[^a-z0-9\u00C0-\u017F\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();

/** Find a top-level ingredient that matches the given name (for resolving amount or linking). */
export const findMatchingTopIngredient = (
	name: string,
	topIngredients: Ingredient[],
): Ingredient | null => {
	const normalizedName = normalizeName(name);
	if (!normalizedName) return null;

	for (const ing of topIngredients) {
		const topName = normalizeName(ing.name);
		if (
			topName.includes(normalizedName) ||
			normalizedName.includes(topName)
		) {
			return ing;
		}
	}
	return null;
};

export const splitIngredientAmountAndName = (value: string): Ingredient => {
	const trimmed = value.trim();
	if (!trimmed) return { name: "", amount: "", unit: "" };

	const amountMatch = trimmed.match(AMOUNT_PREFIX_REGEX);
	if (!amountMatch) return { name: trimmed, amount: "", unit: "" };

	return {
		amount: amountMatch[1].trim(),
		name: amountMatch[2].trim(),
		unit: "",
	};
};

/** Resolve a step ingredient against the top-level list: fill in amount and unit from the matching top ingredient when missing. */
export const resolveStepIngredient = (
	ingredient: Ingredient,
	topIngredients: Ingredient[],
): Ingredient => {
	const name = ingredient.name.trim();
	if (!name)
		return { name: "", amount: "", unit: "" };
	if (ingredient.amount.trim())
		return {
			name,
			amount: ingredient.amount.trim(),
			unit: ingredient.unit?.trim() ?? "",
		};

	const match = findMatchingTopIngredient(name, topIngredients);
	return {
		name,
		amount: match?.amount ?? "",
		unit: match?.unit ?? ingredient.unit?.trim() ?? "",
	};
};

export const normalizeStepIngredient = (
	rawIngredient: unknown,
	topIngredients: Ingredient[],
): Ingredient | null => {
	if (typeof rawIngredient === "string") {
		const parsed = splitIngredientAmountAndName(rawIngredient);
		const resolved = resolveStepIngredient(parsed, topIngredients);
		return resolved.name ? resolved : null;
	}

	if (!rawIngredient || typeof rawIngredient !== "object") return null;

	const value = rawIngredient as {
		name?: unknown;
		item?: unknown;
		ingredient?: unknown;
		amount?: unknown;
		unit?: unknown;
	};

	const rawName =
		typeof value.name === "string"
			? value.name
			: typeof value.item === "string"
				? value.item
				: typeof value.ingredient === "string"
					? value.ingredient
					: "";
	const name = rawName.trim();

	let amount = typeof value.amount === "string" ? value.amount.trim() : "";
	let unit = typeof value.unit === "string" ? value.unit.trim() : "";

	if (!name) return null;
	if (!amount || !unit) {
		const match = findMatchingTopIngredient(name, topIngredients);
		if (match) {
			if (!amount) amount = match.amount;
			if (!unit) unit = match.unit ?? "";
		}
	}

	return { name, amount, unit };
};

export const normalizeInstruction = (
	rawInstruction: unknown,
	topIngredients: Ingredient[],
): Instruction => {
	if (typeof rawInstruction === "string") {
		return {
			text: rawInstruction,
			ingredients: [],
		};
	}

	if (!rawInstruction || typeof rawInstruction !== "object") {
		return {
			text: "",
			ingredients: [],
		};
	}

	const value = rawInstruction as {
		text?: unknown;
		ingredients?: unknown;
	};

	const rawIngredients = Array.isArray(value.ingredients)
		? value.ingredients
		: [];
	const ingredients = rawIngredients
		.map((ing) => normalizeStepIngredient(ing, topIngredients))
		.filter((ing): ing is Ingredient => !!ing);

	return {
		text: typeof value.text === "string" ? value.text : "",
		ingredients,
	};
};
