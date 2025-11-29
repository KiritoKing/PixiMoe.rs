import { CheckCircle, RotateCcw, Save, Sliders } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
	type InferenceConfig,
	useInferenceConfig,
	useSetInferenceConfig,
} from "@/lib/hooks/useSettings";

export function InferenceConfigPanel() {
	const { data: config, isLoading } = useInferenceConfig();
	const setConfigMutation = useSetInferenceConfig();
	const [localConfig, setLocalConfig] = useState<InferenceConfig | null>(config || null);

	// Update local config when config data changes
	if (config && JSON.stringify(config) !== JSON.stringify(localConfig)) {
		setLocalConfig(config);
	}

	const handleSaveConfig = async () => {
		if (!localConfig) return;

		try {
			await setConfigMutation.mutateAsync(localConfig);
		} catch (error) {
			console.error("Failed to save config:", error);
		}
	};

	const handleResetConfig = () => {
		const defaultConfig = {
			general_threshold: 0.35,
			character_threshold: 0.85,
			general_mcut_enabled: false,
			character_mcut_enabled: false,
			max_tags: 50,
		};
		setLocalConfig(defaultConfig);
	};

	const updateConfig = (
		key: keyof InferenceConfig,
		value: InferenceConfig[keyof InferenceConfig]
	) => {
		if (!localConfig) return;
		setLocalConfig({
			...localConfig,
			[key]: value,
		});
	};

	const hasChanges = config && JSON.stringify(config) !== JSON.stringify(localConfig);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Sliders className="h-5 w-5" />
						Inference Configuration
					</CardTitle>
					<CardDescription>Loading configuration...</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2">
						<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
						<span>Loading...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!localConfig) {
		return <Alert>Unable to load inference configuration</Alert>;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Sliders className="h-5 w-5" />
							Inference Configuration
						</CardTitle>
						<CardDescription>
							Adjust AI model parameters for optimal tagging results
						</CardDescription>
					</div>
					{hasChanges && <Badge variant="secondary">Unsaved changes</Badge>}
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* General Tags Configuration */}
				<div className="space-y-4">
					<div>
						<Label className="text-base font-medium">General Tags Configuration</Label>
						<p className="text-sm text-muted-foreground">
							Configure thresholds for general category tags (e.g., "blue", "outdoor",
							"sunset")
						</p>
					</div>

					<div className="space-y-4">
						<div>
							<div className="flex items-center justify-between">
								<Label htmlFor="general-threshold">General Threshold</Label>
								<span className="text-sm text-muted-foreground">
									{localConfig.general_threshold.toFixed(2)}
								</span>
							</div>
							<Slider
								id="general-threshold"
								min={0}
								max={1}
								step={0.05}
								value={[localConfig.general_threshold]}
								onValueChange={([value]) =>
									updateConfig("general_threshold", value)
								}
								className="w-full"
							/>
							<div className="flex justify-between text-xs text-muted-foreground mt-1">
								<span>More strict</span>
								<span>More permissive</span>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<Label htmlFor="general-mcut">Use MCut for General Tags</Label>
								<p className="text-xs text-muted-foreground">
									Enable Maximum Cut Thresholding for intelligent threshold
									selection
								</p>
							</div>
							<Switch
								id="general-mcut"
								checked={localConfig.general_mcut_enabled}
								onCheckedChange={(checked) =>
									updateConfig("general_mcut_enabled", checked)
								}
							/>
						</div>
					</div>
				</div>

				{/* Character Tags Configuration */}
				<div className="space-y-4">
					<div>
						<Label className="text-base font-medium">
							Character Tags Configuration
						</Label>
						<p className="text-sm text-muted-foreground">
							Configure thresholds for character category tags (e.g.,
							"character_name", "series_name")
						</p>
					</div>

					<div className="space-y-4">
						<div>
							<div className="flex items-center justify-between">
								<Label htmlFor="character-threshold">Character Threshold</Label>
								<span className="text-sm text-muted-foreground">
									{localConfig.character_threshold.toFixed(2)}
								</span>
							</div>
							<Slider
								id="character-threshold"
								min={0}
								max={1}
								step={0.05}
								value={[localConfig.character_threshold]}
								onValueChange={([value]) =>
									updateConfig("character_threshold", value)
								}
								className="w-full"
							/>
							<div className="flex justify-between text-xs text-muted-foreground mt-1">
								<span>More strict</span>
								<span>More permissive</span>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<Label htmlFor="character-mcut">Use MCut for Character Tags</Label>
								<p className="text-xs text-muted-foreground">
									Enable Maximum Cut Thresholding (minimum 0.15 threshold)
								</p>
							</div>
							<Switch
								id="character-mcut"
								checked={localConfig.character_mcut_enabled}
								onCheckedChange={(checked) =>
									updateConfig("character_mcut_enabled", checked)
								}
							/>
						</div>
					</div>
				</div>

				{/* Maximum Tags Configuration */}
				<div className="space-y-4">
					<div>
						<Label htmlFor="max-tags">Maximum Tags</Label>
						<p className="text-sm text-muted-foreground">
							Limit the maximum number of tags returned by the model
						</p>
					</div>
					<Input
						id="max-tags"
						type="number"
						min="1"
						max="100"
						value={localConfig.max_tags}
						onChange={(e) =>
							updateConfig("max_tags", parseInt(e.target.value, 10) || 50)
						}
						className="w-full"
					/>
				</div>

				{/* Configuration Info */}
				<Alert>
					<div className="flex items-start gap-2">
						<CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
						<div className="space-y-1">
							<p className="text-sm font-medium">Recommended Settings</p>
							<div className="text-xs text-muted-foreground space-y-1">
								<p>• General Threshold: 0.35-0.40 (balanced for general tags)</p>
								<p>
									• Character Threshold: 0.80-0.90 (strict for character accuracy)
								</p>
								<p>• MCut: Enable for better automatic threshold selection</p>
								<p>• Max Tags: 30-50 for most images</p>
							</div>
						</div>
					</div>
				</Alert>

				{/* Action Buttons */}
				<div className="flex items-center gap-2 pt-4 border-t">
					<Button
						onClick={handleSaveConfig}
						disabled={!hasChanges || setConfigMutation.isPending}
						className="flex items-center gap-2"
					>
						<Save className="h-4 w-4" />
						{setConfigMutation.isPending ? "Saving..." : "Save Configuration"}
					</Button>
					<Button
						variant="outline"
						onClick={handleResetConfig}
						disabled={setConfigMutation.isPending}
						className="flex items-center gap-2"
					>
						<RotateCcw className="h-4 w-4" />
						Reset to Defaults
					</Button>
				</div>

				{/* Success Message */}
				{setConfigMutation.isSuccess && (
					<Alert className="border-green-200 bg-green-50">
						<CheckCircle className="h-4 w-4 text-green-600" />
						<AlertDescription className="text-green-800">
							Configuration saved successfully!
						</AlertDescription>
					</Alert>
				)}

				{/* Error Message */}
				{setConfigMutation.error && (
					<Alert className="border-red-200 bg-red-50">
						<AlertDescription className="text-red-800">
							Failed to save configuration: {setConfigMutation.error.message}
						</AlertDescription>
					</Alert>
				)}
			</CardContent>
		</Card>
	);
}
