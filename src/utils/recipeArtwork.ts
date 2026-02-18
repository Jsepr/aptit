import type { Recipe } from "../types.ts";

type ArtworkInput = Pick<Recipe, "id" | "title" | "recipeType">;

type Theme = {
	bgStart: string;
	bgEnd: string;
	blobA: string;
	blobB: string;
	line: string;
	accent: string;
};

const THEMES: Theme[] = [
	{
		bgStart: "#FFD54F",
		bgEnd: "#FF7043",
		blobA: "#FF3D00",
		blobB: "#8E2400",
		line: "#5D1F00",
		accent: "#FFF6E8",
	},
	{
		bgStart: "#69F0AE",
		bgEnd: "#00BFA5",
		blobA: "#00A86B",
		blobB: "#00695C",
		line: "#004D40",
		accent: "#EEFFF7",
	},
	{
		bgStart: "#EA80FC",
		bgEnd: "#7C4DFF",
		blobA: "#651FFF",
		blobB: "#4527A0",
		line: "#311B92",
		accent: "#F7F0FF",
	},
	{
		bgStart: "#80D8FF",
		bgEnd: "#2979FF",
		blobA: "#1565C0",
		blobB: "#0D47A1",
		line: "#08306B",
		accent: "#ECF6FF",
	},
	{
		bgStart: "#FF9E80",
		bgEnd: "#FF5252",
		blobA: "#E53935",
		blobB: "#B71C1C",
		line: "#7F0000",
		accent: "#FFF1EF",
	},
	{
		bgStart: "#FFFF8D",
		bgEnd: "#FFC400",
		blobA: "#FFAB00",
		blobB: "#FF6F00",
		line: "#8D4E00",
		accent: "#FFFDE7",
	},
	{
		bgStart: "#B388FF",
		bgEnd: "#FF80AB",
		blobA: "#EC407A",
		blobB: "#AD1457",
		line: "#6A1B9A",
		accent: "#FFF0F7",
	},
	{
		bgStart: "#A7FFEB",
		bgEnd: "#64FFDA",
		blobA: "#00BCD4",
		blobB: "#00838F",
		line: "#005662",
		accent: "#F0FFFE",
	},
];

const hashString = (value: string) => {
	let hash = 2166136261;
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
};

const mulberry32 = (seed: number) => {
	let t = seed || 1;
	return () => {
		t += 0x6d2b79f5;
		let n = Math.imul(t ^ (t >>> 15), t | 1);
		n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
		return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
	};
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const toInt = (value: number) => Math.round(value);

const motifFromTitle = (title: string, recipeType?: Recipe["recipeType"]) => {
	const text = title.toLowerCase();
	if (
		/bread|loaf|bun|roll|sourdough|brioche|brod|br[o|ö]d|fralla/.test(text)
	)
		return "bread";
	if (/cake|cookie|muffin|pie|tart|brownie|kaka|kakor|t[a|å]rta/.test(text))
		return "cake";
	if (/soup|stew|broth|gryta|soppa/.test(text)) return "soup";
	if (/salad|slaw|sallad/.test(text)) return "salad";
	if (/fish|salmon|tuna|cod|lax|r[a|ä]ka|shrimp/.test(text)) return "fish";
	if (/pasta|noodle|spaghetti|ramen|nudel/.test(text)) return "pasta";
	if (/meat|beef|pork|chicken|lamb|kyckling|k[o|ö]tt/.test(text)) return "pan";
	if (recipeType === "baking") return "cake";
	return "plate";
};

const shapeMarkup = (rand: () => number, theme: Theme, index: number) => {
	const type = toInt(rand() * 3);
	const x = toInt(40 + rand() * 720);
	const y = toInt(40 + rand() * 320);
	const size = toInt(24 + rand() * 110);
	const opacity = clamp(0.1 + rand() * 0.28, 0.1, 0.35);
	const color = index % 2 === 0 ? theme.blobA : theme.blobB;

	if (type === 0) {
		return `<circle cx="${x}" cy="${y}" r="${size}" fill="${color}" fill-opacity="${opacity.toFixed(2)}"/>`;
	}
	if (type === 1) {
		const angle = toInt(-35 + rand() * 70);
		const w = toInt(size * 1.8);
		const h = toInt(size * 0.9);
		return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${toInt(
			h * 0.35,
		)}" fill="${color}" fill-opacity="${opacity.toFixed(
			2,
		)}" transform="rotate(${angle} ${x} ${y})"/>`;
	}

	const x2 = toInt(x + size * (0.6 + rand()));
	const y2 = toInt(y + size * (0.2 + rand()));
	const cx = toInt((x + x2) / 2);
	const cy = toInt(y - size * (0.6 + rand() * 0.5));
	return `<path d="M ${x} ${y} Q ${cx} ${cy} ${x2} ${y2} Q ${toInt(
		x2 - size * 0.4,
	)} ${toInt(y2 + size * 0.5)} ${x} ${y} Z" fill="${color}" fill-opacity="${opacity.toFixed(
		2,
	)}"/>`;
};

const motifMarkup = (motif: string, theme: Theme) => {
	const shared = `fill="none" stroke="${theme.line}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"`;

	if (motif === "bread") {
		return `<path d="M 300 235 Q 300 165 360 165 Q 385 135 430 145 Q 470 125 510 155 Q 560 160 570 215 Q 575 250 550 270 Q 520 285 450 285 L 365 285 Q 310 280 300 235 Z" ${shared}/><path d="M 380 185 Q 365 215 380 245" ${shared}/><path d="M 440 178 Q 425 213 438 248" ${shared}/><path d="M 500 185 Q 485 220 500 250" ${shared}/>`;
	}
	if (motif === "cake") {
		return `<path d="M 300 280 L 560 280 L 530 210 L 330 210 Z" ${shared}/><path d="M 325 210 Q 350 175 375 210 Q 400 175 425 210 Q 450 175 475 210 Q 500 175 525 210" ${shared}/><path d="M 430 210 L 430 165" ${shared}/><path d="M 420 155 Q 430 140 440 155 Q 430 170 420 155 Z" ${shared}/>`;
	}
	if (motif === "soup") {
		return `<path d="M 295 220 L 565 220 Q 555 290 430 290 Q 305 290 295 220 Z" ${shared}/><path d="M 565 235 Q 610 235 610 255 Q 610 275 565 275" ${shared}/><path d="M 365 190 Q 350 170 365 150" ${shared}/><path d="M 430 185 Q 415 165 430 145" ${shared}/><path d="M 495 190 Q 480 170 495 150" ${shared}/>`;
	}
	if (motif === "salad") {
		return `<path d="M 300 250 Q 430 320 560 250" ${shared}/><path d="M 340 230 Q 375 170 430 220" ${shared}/><path d="M 430 220 Q 485 165 520 235" ${shared}/><path d="M 375 250 Q 420 210 470 250" ${shared}/><path d="M 410 275 L 450 235" ${shared}/>`;
	}
	if (motif === "fish") {
		return `<ellipse cx="430" cy="225" rx="125" ry="70" ${shared}/><path d="M 545 225 L 620 175 L 620 275 Z" ${shared}/><circle cx="380" cy="215" r="8" fill="${theme.line}"/><path d="M 335 245 Q 360 260 390 245" ${shared}/>`;
	}
	if (motif === "pasta") {
		return `<path d="M 315 245 Q 350 215 385 245 Q 420 275 455 245 Q 490 215 525 245 Q 560 275 595 245" ${shared}/><path d="M 315 205 Q 350 175 385 205 Q 420 235 455 205 Q 490 175 525 205 Q 560 235 595 205" ${shared}/><path d="M 350 280 L 560 280" ${shared}/>`;
	}
	if (motif === "pan") {
		return `<circle cx="420" cy="225" r="90" ${shared}/><path d="M 505 225 L 610 225" ${shared}/><path d="M 360 200 Q 390 170 420 200" ${shared}/><path d="M 420 200 Q 450 170 480 200" ${shared}/>`;
	}
	return `<ellipse cx="430" cy="225" rx="170" ry="95" ${shared}/><path d="M 335 225 L 525 225" ${shared}/><path d="M 430 150 L 430 300" ${shared}/>`;
};

export const getRecipeArtworkDataUri = ({
	id,
	title,
	recipeType,
}: ArtworkInput) => {
	const seed = hashString(`${id}|${title}|${recipeType || ""}`);
	const rand = mulberry32(seed);
	const motif = motifFromTitle(title, recipeType);
	const theme = THEMES[(seed >>> 3) % THEMES.length];

	const gradientAngle = toInt(rand() * 360);
	const shapes = Array.from({ length: 9 }, (_, index) =>
		shapeMarkup(rand, theme, index),
	).join("");

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><defs><linearGradient id="g" gradientTransform="rotate(${gradientAngle} .5 .5)"><stop offset="0%" stop-color="${theme.bgStart}"/><stop offset="100%" stop-color="${theme.bgEnd}"/></linearGradient></defs><rect width="800" height="400" fill="url(#g)"/>${shapes}<circle cx="430" cy="225" r="118" fill="${theme.accent}" fill-opacity="0.78"/>${motifMarkup(
		motif,
		theme,
	)}<rect x="30" y="30" width="740" height="340" rx="26" fill="none" stroke="rgba(255,255,255,0.34)" stroke-width="2"/></svg>`;

	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
