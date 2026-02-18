import { ArrowLeft, Check } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { Language, MeasureSystem } from "../types.ts";
import type { Translation } from "../utils/i18n.ts";

interface SettingsProps {
	t: Translation;
	initialLanguage: Language;
	initialMeasureSystem: MeasureSystem;
	isFirstTime: boolean;
	onSave: (language: Language, measureSystem: MeasureSystem) => void;
	onCancel?: () => void;
}

const Settings: React.FC<SettingsProps> = ({
	t,
	initialLanguage,
	initialMeasureSystem,
	isFirstTime,
	onSave,
	onCancel,
}) => {
	const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(
		isFirstTime ? null : initialLanguage,
	);
	const [selectedMeasureSystem, setSelectedMeasureSystem] =
		useState<MeasureSystem | null>(isFirstTime ? null : initialMeasureSystem);

	const canSave = selectedLanguage !== null && selectedMeasureSystem !== null;

	return (
		<div className="max-w-2xl mx-auto">
			{!isFirstTime && onCancel && (
				<button
					type="button"
					onClick={onCancel}
					className="mb-6 flex items-center text-gray-500 hover:text-cream-900 transition-colors"
				>
					<ArrowLeft size={18} className="mr-1" />
					{t.back}
				</button>
			)}

			<div className="bg-white rounded-3xl shadow-lg border border-cream-200 p-8 md:p-12">
				<h2 className="text-3xl font-serif font-bold text-cream-900 mb-4">
					{isFirstTime ? t.firstTimeSetupTitle : t.settingsTitle}
				</h2>
				<p className="text-gray-600 mb-8">
					{isFirstTime ? t.firstTimeSetupDescription : t.settingsDescription}
				</p>

				<div className="space-y-8">
					<div>
						<p className="text-sm uppercase tracking-widest font-bold text-cream-500 mb-3">
							{t.language}
						</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{(["en", "sv"] as const).map((language) => {
								const isSelected = selectedLanguage === language;
								return (
									<button
										type="button"
										key={language}
										onClick={() => setSelectedLanguage(language)}
										className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
											isSelected
												? "border-accent-orange bg-orange-50 text-cream-900"
												: "border-cream-200 hover:border-cream-300 bg-cream-50"
										}`}
									>
										<span className="font-medium">
											{language === "en" ? "English" : "Svenska"}
										</span>
										{isSelected && (
											<Check size={16} className="text-accent-orange" />
										)}
									</button>
								);
							})}
						</div>
					</div>

					<div>
						<p className="text-sm uppercase tracking-widest font-bold text-cream-500 mb-3">
							{t.measureSystem}
						</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{(["metric", "imperial"] as const).map((system) => {
								const isSelected = selectedMeasureSystem === system;
								return (
									<button
										type="button"
										key={system}
										onClick={() => setSelectedMeasureSystem(system)}
										className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
											isSelected
												? "border-accent-orange bg-orange-50 text-cream-900"
												: "border-cream-200 hover:border-cream-300 bg-cream-50"
										}`}
									>
										<span className="font-medium">
											{system === "metric" ? t.metric : t.imperial}
										</span>
										{isSelected && (
											<Check size={16} className="text-accent-orange" />
										)}
									</button>
								);
							})}
						</div>
					</div>

					<button
						type="button"
						disabled={!canSave}
						onClick={() => {
							if (!selectedLanguage || !selectedMeasureSystem) return;
							onSave(selectedLanguage, selectedMeasureSystem);
						}}
						className={`w-full py-4 rounded-xl font-bold text-white shadow-md transition-all ${
							canSave
								? "bg-accent-orange hover:bg-orange-600 hover:shadow-lg"
								: "bg-gray-300 cursor-not-allowed"
						}`}
					>
						{isFirstTime ? t.continueLabel : t.saveSettings}
					</button>
				</div>
			</div>
		</div>
	);
};

export default Settings;
