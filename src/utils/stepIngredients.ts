import type { Instruction, StepIngredient } from "../types.ts";

const AMOUNT_PREFIX_REGEX =
	/^((?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s*-\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?))?(?:\s+[a-zA-Z\u00C0-\u017F%]+(?:\.[a-zA-Z\u00C0-\u017F%]+)*){0,3})\s+(.+)$/;

const normalizeText = (value: string) =>
	value
		.toLowerCase()
		.replace(/\([^)]*\)/g, " ")
		.replace(/[^a-z0-9\u00C0-\u017F\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();

export const splitIngredientAmountAndName = (value: string): StepIngredient => {
	const trimmed = value.trim();
	if (!trimmed) return { name: "", amount: "" };

	const amountMatch = trimmed.match(AMOUNT_PREFIX_REGEX);
	if (!amountMatch) return { name: trimmed, amount: "" };

	return {
		amount: amountMatch[1].trim(),
		name: amountMatch[2].trim(),
	};
};

const findMatchingIngredientLine = (
	name: string,
	ingredientLines: string[],
): string | null => {
	const normalizedName = normalizeText(name);
	if (!normalizedName) return null;

	for (const line of ingredientLines) {
		const parsedLine = splitIngredientAmountAndName(line);
		const normalizedLineName = normalizeText(parsedLine.name || line);

		if (
			normalizedLineName.includes(normalizedName) ||
			normalizedName.includes(normalizedLineName)
		) {
			return line;
		}
	}

	return null;
};

export const resolveStepIngredient = (
	ingredient: StepIngredient,
	ingredientLines: string[],
): StepIngredient => {
	const name = ingredient.name.trim();
	if (!name) return { name: "", amount: "" };
	if (ingredient.amount.trim())
		return { name, amount: ingredient.amount.trim() };

	const matchingLine = findMatchingIngredientLine(name, ingredientLines);
	if (!matchingLine) return { name, amount: "" };

	const parsed = splitIngredientAmountAndName(matchingLine);
	return {
		name,
		amount: parsed.amount,
	};
};

export const normalizeStepIngredient = (
	rawIngredient: unknown,
	ingredientLines: string[],
): StepIngredient | null => {
	if (typeof rawIngredient === "string") {
		const parsed = splitIngredientAmountAndName(rawIngredient);
		const resolved = resolveStepIngredient(parsed, ingredientLines);
		return resolved.name ? resolved : null;
	}

	if (!rawIngredient || typeof rawIngredient !== "object") return null;

	const value = rawIngredient as {
		name?: unknown;
		item?: unknown;
		ingredient?: unknown;
		amount?: unknown;
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

	if (!name) return null;
	if (!amount) {
		const matchingLine = findMatchingIngredientLine(name, ingredientLines);
		if (matchingLine) {
			amount = splitIngredientAmountAndName(matchingLine).amount;
		}
	}

	return { name, amount };
};

export const normalizeInstruction = (
	rawInstruction: unknown,
	ingredientLines: string[],
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
		.map((ing) => normalizeStepIngredient(ing, ingredientLines))
		.filter((ing): ing is StepIngredient => !!ing);

	return {
		text: typeof value.text === "string" ? value.text : "",
		ingredients,
	};
};
