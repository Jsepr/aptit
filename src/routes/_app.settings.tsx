import { createFileRoute, useNavigate } from "@tanstack/react-router";
import Settings from "../components/Settings.tsx";
import { useAppState } from "../state/appState.tsx";

export const Route = createFileRoute("/_app/settings")({
	component: SettingsRoute,
});

function SettingsRoute() {
	const navigate = useNavigate();
	const { language, measureSystem, preferencesConfigured, savePreferences, t } =
		useAppState();

	const navigateBackOrHome = () => {
		if (window.history.length > 1) {
			window.history.back();
			return;
		}
		navigate({ to: "/" });
	};

	return (
		<Settings
			t={t}
			initialLanguage={language}
			initialMeasureSystem={measureSystem}
			isFirstTime={!preferencesConfigured}
			onSave={(nextLanguage, nextMeasureSystem) => {
				const wasConfigured = preferencesConfigured;
				savePreferences(nextLanguage, nextMeasureSystem);
				if (wasConfigured) {
					navigateBackOrHome();
					return;
				}
				navigate({ to: "/" });
			}}
			onCancel={preferencesConfigured ? navigateBackOrHome : undefined}
		/>
	);
}
