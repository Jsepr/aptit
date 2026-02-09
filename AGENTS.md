## Repo Overview
- Aptit is a TanStack Start (React) app for extracting and managing recipes.
- Main UI lives in `src/routes/index.tsx`; API endpoints live in `src/routes/api/*.ts`.
- Shared types are in `src/types.ts`, translations in `src/utils/i18n.ts`, theme in `src/styles/app.css`.

## Key Commands
- `npm run dev` starts Vite dev server.
- `npm run build` builds and type-checks (`vite build && tsc --noEmit`).
- `npm run format` / `npm run lint` / `npm run check` use Biome.

## Environment
- Requires `GEMINI_API_KEY` for server routes that call Google Gemini.
- API routes use Playwright (Chromium) to fetch recipe pages.

## Architecture Notes
- Routing is file-based via TanStack Start. Add pages under `src/routes`, API handlers under `src/routes/api`.
- Client requests to `/api/*` are implemented in `src/services/geminiService.ts`.
- Recipes are stored in localStorage (keys: `aptit_recipes_v1`, `aptit_lang_v1`, `aptit_system_v1`).

## Conventions
- TypeScript throughout; keep data shapes aligned with `Recipe`/`RecipeData` in `src/types.ts`.
- UI uses Tailwind classes and the cream/orange palette defined in `src/styles/app.css`.
- App supports `en` and `sv` only; update `src/utils/i18n.ts` when adding user-facing strings.
- Keep recipe extraction instructions strict (verbatim extraction) in `src/routes/api/extract-recipe.ts`.
