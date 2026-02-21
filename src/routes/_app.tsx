import {
	createFileRoute,
	Link,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { ChefHat, Settings as SettingsIcon } from "lucide-react";
import { useEffect } from "react";
import { AppStateProvider, useAppState } from "../state/appState.tsx";

export const Route = createFileRoute("/_app")({
	component: AppRoute,
});

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

function AppRoute() {
	return (
		<AppStateProvider>
			<AppLayout />
		</AppStateProvider>
	);
}

function AppLayout() {
	const navigate = useNavigate();
	const location = useLocation();
	const { hydrated, preferencesConfigured, t } = useAppState();

	useEffect(() => {
		if (!hydrated) return;
		if (!preferencesConfigured && location.pathname !== "/settings") {
			navigate({ to: "/settings", replace: true });
		}
	}, [hydrated, preferencesConfigured, location.pathname, navigate]);

	return (
		<div className="min-h-screen bg-[#FAF6EF] text-[#5D4037] pb-20">
			<header className="sticky top-0 z-50 bg-[#FAF6EF]/90 backdrop-blur-md border-b border-cream-200 mb-8 transition-all">
				<div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
					<Link
						to={preferencesConfigured ? "/" : "/settings"}
						className="flex items-center gap-3 cursor-pointer group"
					>
						<div className="bg-accent-orange text-white p-2 rounded-lg transform group-hover:rotate-3 transition-transform duration-300">
							<ChefHat size={24} />
						</div>
						<div className="flex flex-col">
							<h1 className="text-2xl font-serif font-bold tracking-tight text-cream-900 group-hover:text-accent-orange transition-colors leading-none">
								{t.title}
							</h1>
							<span className="text-[10px] uppercase tracking-widest text-cream-500 font-bold mt-1 flex items-center gap-1"></span>
						</div>
					</Link>

					{hydrated && preferencesConfigured && (
						<Link
							to="/settings"
							className="flex items-center gap-2 px-4 py-2 rounded-full bg-cream-200 hover:bg-cream-300 transition-all text-sm font-medium border border-cream-300 shadow-sm"
						>
							<SettingsIcon size={16} />
							<span>{t.settings}</span>
						</Link>
					)}
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-6">
				{!hydrated ? <RecipeListSkeleton /> : <Outlet />}
			</main>

			<footer className="mt-20 py-10 border-t border-cream-200 text-center text-cream-500 text-sm">
				<p>
					© {new Date().getFullYear()} {t.title}
				</p>
			</footer>
		</div>
	);
}
