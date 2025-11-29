import {
	CheckCircle,
	Copy,
	Download,
	FileText,
	RotateCcw,
	Timer,
	TrendingUp,
	Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type {
	DebugInferenceResult,
	DebugPostprocessResult,
	DebugPreprocessResult,
} from "@/lib/hooks/useSettings";

interface ResultsStepProps {
	preprocessResult: DebugPreprocessResult | null;
	inferenceResult: DebugInferenceResult | null;
	postprocessResult: DebugPostprocessResult | null;
	onReset?: () => void;
	onSaveReport?: () => void;
}

export function ResultsStep({
	preprocessResult,
	inferenceResult,
	postprocessResult,
	onReset,
	onSaveReport,
}: ResultsStepProps) {
	const allSuccessful =
		preprocessResult?.success && inferenceResult?.success && postprocessResult?.success;

	// Copy tags functionality
	const handleCopyTags = () => {
		if (!postprocessResult?.final_tags || postprocessResult.final_tags.length === 0) return;

		const tagNames = postprocessResult.final_tags.map(([tag]) => tag);
		const commaSeparatedTags = tagNames.join(", ");

		navigator.clipboard
			.writeText(commaSeparatedTags)
			.then(() => {
				// Create a simple success notification without external dependencies
				const notification = document.createElement("div");
				notification.style.cssText = `
					position: fixed;
					top: 20px;
					right: 20px;
					background: #22c55e;
					color: white;
					padding: 12px 16px;
					border-radius: 6px;
					z-index: 9999;
					font-size: 14px;
					font-family: system-ui;
					box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
				`;
				notification.textContent = `Copied ${postprocessResult.final_tags.length} tag(s) to clipboard!`;
				document.body.appendChild(notification);

				// Remove after 3 seconds
				setTimeout(() => {
					if (document.body.contains(notification)) {
						document.body.removeChild(notification);
					}
				}, 3000);
			})
			.catch((error) => {
				console.error("Failed to copy tags:", error);
				// Show error notification
				const notification = document.createElement("div");
				notification.style.cssText = `
					position: fixed;
					top: 20px;
					right: 20px;
					background: #ef4444;
					color: white;
					padding: 12px 16px;
					border-radius: 6px;
					z-index: 9999;
					font-size: 14px;
					font-family: system-ui;
					box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
				`;
				notification.textContent = "Failed to copy tags to clipboard";
				document.body.appendChild(notification);

				setTimeout(() => {
					if (document.body.contains(notification)) {
						document.body.removeChild(notification);
					}
				}, 3000);
			});
	};

	const generateSummary = () => {
		if (!allSuccessful) return null;

		return {
			totalExecutionTime: inferenceResult?.execution_time_ms || 0,
			finalTagCount: postprocessResult?.final_tags.length || 0,
			topConfidence: postprocessResult?.category_summary.top_confidence || 0,
			averageConfidence: postprocessResult?.category_summary.avg_confidence || 0,
			imageDimensions: preprocessResult?.final_size || [0, 0],
		};
	};

	const summary = generateSummary();

	const exportDebugReport = () => {
		if (!summary) return;

		const report = {
			timestamp: new Date().toISOString(),
			imageInfo: {
				originalSize: preprocessResult?.original_size,
				finalSize: preprocessResult?.final_size,
				preprocessingSteps: preprocessResult?.preprocessing_steps,
			},
			inferenceInfo: {
				executionTime: inferenceResult?.execution_time_ms,
				inputShape: inferenceResult?.input_shape,
				outputShape: inferenceResult?.output_shape,
				totalPredictions: inferenceResult?.all_predictions?.length,
			},
			postprocessingInfo: {
				finalTagCount: summary.finalTagCount,
				thresholdAnalysis: postprocessResult?.threshold_analysis,
				categorySummary: postprocessResult?.category_summary,
				finalTags: postprocessResult?.final_tags,
			},
			configuration: postprocessResult?.config_used,
		};

		const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `ai-debug-report-${new Date().toISOString().split("T")[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-6">
			{/* Success Summary */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base flex items-center gap-2">
						<CheckCircle className="h-5 w-5" />
						Debugging Complete
						<Badge variant={allSuccessful ? "default" : "destructive"}>
							{allSuccessful ? "Success" : "Completed with Errors"}
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{summary ? (
						<div className="space-y-4">
							{/* Key Metrics */}
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								<div className="text-center p-4 bg-blue-50 rounded-lg">
									<Timer className="h-5 w-5 mx-auto mb-2 text-blue-600" />
									<div className="text-2xl font-bold text-blue-600">
										{summary.totalExecutionTime}ms
									</div>
									<div className="text-xs text-muted-foreground">Total Time</div>
								</div>
								<div className="text-center p-4 bg-green-50 rounded-lg">
									<Zap className="h-5 w-5 mx-auto mb-2 text-green-600" />
									<div className="text-2xl font-bold text-green-600">
										{summary.finalTagCount}
									</div>
									<div className="text-xs text-muted-foreground">Final Tags</div>
								</div>
								<div className="text-center p-4 bg-purple-50 rounded-lg">
									<TrendingUp className="h-5 w-5 mx-auto mb-2 text-purple-600" />
									<div className="text-2xl font-bold text-purple-600">
										{summary.topConfidence.toFixed(3)}
									</div>
									<div className="text-xs text-muted-foreground">
										Top Confidence
									</div>
								</div>
								<div className="text-center p-4 bg-orange-50 rounded-lg">
									<Badge className="mx-auto mb-2">Ø</Badge>
									<div className="text-2xl font-bold text-orange-600">
										{summary.averageConfidence.toFixed(3)}
									</div>
									<div className="text-xs text-muted-foreground">
										Avg Confidence
									</div>
								</div>
							</div>

							{/* Processing Summary */}
							<div className="space-y-3">
								<h4 className="font-medium text-sm">Processing Summary</h4>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
									<div className="flex items-center gap-2 p-3 border rounded-lg">
										<Badge variant="outline">Preprocess</Badge>
										<span className="text-muted-foreground">
											{preprocessResult?.original_size.join("×")} →{" "}
											{preprocessResult?.final_size.join("×")}
										</span>
									</div>
									<div className="flex items-center gap-2 p-3 border rounded-lg">
										<Badge variant="outline">Inference</Badge>
										<span className="text-muted-foreground">
											{inferenceResult?.all_predictions?.length} predictions
										</span>
									</div>
									<div className="flex items-center gap-2 p-3 border rounded-lg">
										<Badge variant="outline">Postprocess</Badge>
										<span className="text-muted-foreground">
											{postprocessResult?.final_tags.length} final tags
										</span>
									</div>
								</div>
							</div>

							{/* Top Final Tags Preview */}
							{postprocessResult?.final_tags &&
								postprocessResult.final_tags.length > 0 && (
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<Label className="text-sm font-medium">
												Top Final Tags
											</Label>
											<Button
												variant="outline"
												size="sm"
												onClick={handleCopyTags}
												className="flex items-center gap-1 text-xs"
												title={`Copy all ${postprocessResult.final_tags.length} tags`}
											>
												<Copy className="w-3 h-3" />
												Copy All
											</Button>
										</div>
										<div className="flex flex-wrap gap-1">
											{postprocessResult.final_tags
												.slice(0, 15)
												.map(([tag, confidence], index) => (
													<Badge
														key={index}
														variant="secondary"
														className="text-xs"
													>
														{tag} ({confidence.toFixed(3)})
													</Badge>
												))}
											{postprocessResult.final_tags.length > 15 && (
												<Badge variant="outline" className="text-xs">
													+{postprocessResult.final_tags.length - 15} more
												</Badge>
											)}
										</div>
									</div>
								)}
						</div>
					) : (
						<div className="text-center py-8 text-muted-foreground">
							<CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>Debugging completed with some errors.</p>
							<p className="text-sm">Check individual step results for details.</p>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex gap-3 mt-6 pt-4 border-t">
						{onReset && (
							<Button
								variant="outline"
								onClick={onReset}
								className="flex items-center gap-2"
							>
								<RotateCcw className="h-4 w-4" />
								Debug New Image
							</Button>
						)}
						<Button
							onClick={exportDebugReport}
							className="flex items-center gap-2"
							disabled={!summary}
						>
							<Download className="h-4 w-4" />
							Export Report
						</Button>
						{onSaveReport && (
							<Button
								variant="outline"
								onClick={onSaveReport}
								className="flex items-center gap-2"
							>
								<FileText className="h-4 w-4" />
								Save to Project
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Error Summary */}
			{!allSuccessful && (
				<Card className="border-red-200">
					<CardHeader className="pb-3">
						<CardTitle className="text-base text-red-800">Errors Encountered</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2 text-sm">
							{!preprocessResult?.success && (
								<div className="p-3 bg-red-50 border border-red-200 rounded">
									<Label className="text-sm font-medium text-red-800">
										Preprocess Error
									</Label>
									<p className="text-xs text-red-700 mt-1">
										{preprocessResult?.error}
									</p>
								</div>
							)}
							{!inferenceResult?.success && (
								<div className="p-3 bg-red-50 border border-red-200 rounded">
									<Label className="text-sm font-medium text-red-800">
										Inference Error
									</Label>
									<p className="text-xs text-red-700 mt-1">
										{inferenceResult?.error}
									</p>
								</div>
							)}
							{!postprocessResult?.success && (
								<div className="p-3 bg-red-50 border border-red-200 rounded">
									<Label className="text-sm font-medium text-red-800">
										Postprocess Error
									</Label>
									<p className="text-xs text-red-700 mt-1">
										{postprocessResult?.error}
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
