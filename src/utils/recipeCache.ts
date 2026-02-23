import type { Language, MeasureSystem, Recipe } from "../types";

// Cache configuration
const CACHE_MAX_SIZE = 100; // Maximum number of cached recipes
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

interface CacheEntry {
	data: Partial<Recipe>;
	timestamp: number;
	lastAccessed: number;
}

const recipeCache = new Map<string, CacheEntry>();

export const getCacheKey = (
	url: string,
	language: Language,
	targetSystem: MeasureSystem,
) => `${url}|${language}|${targetSystem}`;

const cleanupExpiredEntries = () => {
	const now = Date.now();
	let cleaned = 0;
	for (const [key, entry] of recipeCache.entries()) {
		if (now - entry.timestamp > CACHE_TTL_MS) {
			recipeCache.delete(key);
			cleaned++;
		}
	}
	if (cleaned > 0) {
		console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
	}
};

const evictLRU = () => {
	// Find and remove the least recently used entry
	let lruKey = "";
	let lruTime = Date.now();

	for (const [key, entry] of recipeCache.entries()) {
		if (entry.lastAccessed < lruTime) {
			lruTime = entry.lastAccessed;
			lruKey = key;
		}
	}

	if (lruKey) {
		recipeCache.delete(lruKey);
		console.log(`[Cache] Evicted LRU entry (size: ${recipeCache.size})`);
	}
};

export const getCachedRecipe = (
	url: string,
	language: Language,
	targetSystem: MeasureSystem,
) => {
	// Cleanup expired entries periodically
	if (Math.random() < 0.1) {
		cleanupExpiredEntries();
	}

	const key = getCacheKey(url, language, targetSystem);
	const entry = recipeCache.get(key);

	if (!entry) return null;

	// Check if expired
	if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
		recipeCache.delete(key);
		return null;
	}

	// Update last accessed time for LRU tracking
	entry.lastAccessed = Date.now();
	return entry;
};

export const setCachedRecipe = (
	url: string,
	language: Language,
	targetSystem: MeasureSystem,
	data: Partial<Recipe>,
) => {
	const key = getCacheKey(url, language, targetSystem);

	// If cache is full, evict LRU entry
	if (recipeCache.size >= CACHE_MAX_SIZE && !recipeCache.has(key)) {
		evictLRU();
	}

	recipeCache.set(key, {
		data,
		timestamp: Date.now(),
		lastAccessed: Date.now(),
	});

	console.log(`[Cache] Stored recipe (size: ${recipeCache.size}/${CACHE_MAX_SIZE})`);
};
