import { Brain, FileText, Info, Settings as SettingsIcon, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AIFeatureToggle } from "./AIFeatureToggle";
import { InferenceConfigPanel } from "./InferenceConfigPanel";
import { LabelMapUploadArea } from "./LabelMapUploadArea";
import { ModelDebugPanel } from "./ModelDebugPanel";
import { ModelStatusDisplay } from "./ModelStatusDisplay";
import { ModelUploadArea } from "./ModelUploadArea";

export function AISettingsPage() {
	const [activeTab, setActiveTab] = useState<"upload" | "config" | "debug">("upload");

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Brain className="h-6 w-6" />
					<h2 className="text-2xl font-bold">AI Settings</h2>
				</div>
				<p className="text-muted-foreground">
					Configure AI models, inference parameters, and debugging options
				</p>
			</div>

			{/* Tab Navigation */}
			<div className="flex gap-2 border-b">
				<Button
					variant={activeTab === "upload" ? "default" : "ghost"}
					onClick={() => setActiveTab("upload")}
					className="gap-2"
				>
					<Upload className="h-4 w-4" />
					Models
				</Button>
				<Button
					variant={activeTab === "config" ? "default" : "ghost"}
					onClick={() => setActiveTab("config")}
					className="gap-2"
				>
					<SettingsIcon className="h-4 w-4" />
					Inference
				</Button>
				<Button
					variant={activeTab === "debug" ? "default" : "ghost"}
					onClick={() => setActiveTab("debug")}
					className="gap-2"
				>
					<FileText className="h-4 w-4" />
					Debug
				</Button>
			</div>

			{/* Content based on active tab */}
			{activeTab === "upload" && (
				<div className="space-y-6">
					{/* AI Feature Toggle */}
					<AIFeatureToggle />

					{/* Model Status */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Info className="h-5 w-5" />
								Model Status
							</CardTitle>
							<CardDescription>
								Check the current status of your AI models
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ModelStatusDisplay />
						</CardContent>
					</Card>

					{/* Model Upload */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* ONNX AI Features Section */}
						<div className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold">ONNX AI Features</h3>
								<p className="text-sm text-muted-foreground">
									Upload your custom AI models for image tagging
								</p>
							</div>

							{/* Tag Model Upload */}
							<ModelUploadArea />

							{/* Label Map Upload */}
							<LabelMapUploadArea />
						</div>

						{/* LLM Interface Section (Placeholder) */}
						<div className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold">
									LLM Interface By Network API
								</h3>
								<p className="text-sm text-muted-foreground">
									Configure external LLM services (Coming Soon)
								</p>
							</div>

							<Card className="border-dashed">
								<CardContent className="flex flex-col items-center justify-center py-12 text-center">
									<Brain className="h-12 w-12 text-muted-foreground mb-4" />
									<h4 className="font-medium mb-2">
										LLM Integration Coming Soon
									</h4>
									<p className="text-sm text-muted-foreground">
										Connect to external language model APIs for advanced
										features
									</p>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			)}

			{activeTab === "config" && (
				<div className="space-y-6">
					<InferenceConfigPanel />
				</div>
			)}

			{activeTab === "debug" && (
				<div className="space-y-6">
					<ModelDebugPanel />
				</div>
			)}
		</div>
	);
}
