import { AlertTriangle, Power, PowerOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useIsAIEnabled, useToggleAIEnabled } from "@/lib/hooks/useAISettingsState";

export function AIFeatureToggle() {
	const { isEnabled, isLoading } = useIsAIEnabled();
	const toggleMutation = useToggleAIEnabled();

	const handleToggle = async (checked: boolean) => {
		await toggleMutation.mutateAsync(checked);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{isEnabled ? (
						<Power className="h-5 w-5 text-green-600" />
					) : (
						<PowerOff className="h-5 w-5 text-red-600" />
					)}
					AI Features
				</CardTitle>
				<CardDescription>
					Enable or disable AI-powered image tagging features
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Main Toggle */}
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<Label htmlFor="ai-enabled-toggle" className="text-base font-medium">
							Enable AI Tagging
						</Label>
						<p className="text-sm text-muted-foreground">
							{isEnabled
								? "AI features are currently enabled and will process images"
								: "AI features are disabled. No AI processing will occur."}
						</p>
					</div>
					<Switch
						id="ai-enabled-toggle"
						checked={isEnabled}
						onCheckedChange={handleToggle}
						disabled={isLoading || toggleMutation.isPending}
					/>
				</div>

				{/* Status Alert */}
				{isEnabled ? (
					<Alert className="border-green-200 bg-green-50">
						<Power className="h-4 w-4 text-green-600" />
						<AlertDescription className="text-green-800">
							AI features are active. Images will be processed using the configured
							models and settings.
						</AlertDescription>
					</Alert>
				) : (
					<Alert className="border-orange-200 bg-orange-50">
						<AlertTriangle className="h-4 w-4 text-orange-600" />
						<AlertDescription className="text-orange-800">
							AI features are disabled. You can still view and manage existing tags,
							but no new AI processing will occur.
						</AlertDescription>
					</Alert>
				)}

				{/* Additional Information */}
				<div className="space-y-2 text-sm text-muted-foreground">
					<p>
						<strong>When enabled:</strong> AI models will automatically process new
						images to generate tags based on your inference configuration.
					</p>
					<p>
						<strong>When disabled:</strong> The application will not load AI models,
						saving system resources. Existing AI-generated tags remain visible.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
