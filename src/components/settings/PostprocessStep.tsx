import { BarChart3, Filter, Settings, Tags, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DebugPostprocessResult } from "@/lib/hooks/useSettings";

interface PostprocessStepProps {
	result: DebugPostprocessResult | null;
	isLoading?: boolean;
}

export function PostprocessStep({ result, isLoading }: PostprocessStepProps) {
	if (!result && !isLoading) {
		return null;
	}

	const renderFilteredTagsInfo = () => {
		return (
			<div className="space-y-2">
				<Label className="text-sm">Filtered Tag Details</Label>
				<ScrollArea className="h-64 border rounded-lg p-2">
					<div className="space-y-2">
						{result?.filtered_tags_info.map((tag, index) => (
							<div
								key={index}
								className={`p-2 rounded border text-sm ${
									tag.filter_reason === "kept"
										? "bg-green-50 border-green-200"
										: "bg-yellow-50 border-yellow-200"
								}`}
							>
								<div className="flex items-center justify-between mb-1">
									<div className="flex items-center gap-2">
										<span className="font-mono truncate">{tag.name}</span>
										<Badge
											variant={
												tag.category === "rating"
													? "destructive"
													: tag.category === "character"
														? "default"
														: "secondary"
											}
											className="text-xs"
										>
											{tag.category}
										</Badge>
									</div>
									<span className="font-mono text-xs text-muted-foreground">
										{tag.confidence.toFixed(4)}
									</span>
								</div>
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<span
										className={
											tag.filter_reason === "kept"
												? "text-green-600"
												: "text-yellow-600"
										}
									>
										{tag.filter_reason === "kept"
											? "✓ Kept"
											: `✗ ${tag.filter_reason.replace("_", " ")}`}
									</span>
									<span>
										Rank: {tag.original_rank} → {tag.final_rank}
									</span>
								</div>
							</div>
						))}
					</div>
				</ScrollArea>
			</div>
		);
	};

	const renderFinalTags = () => {
		return (
			<div className="space-y-2">
				<Label className="text-sm">Final Tags ({result?.final_tags.length})</Label>
				<ScrollArea className="h-64 border rounded-lg p-2">
					<div className="space-y-1">
						{result?.final_tags.map(([tag, confidence], index) => (
							<div
								key={index}
								className="flex items-center justify-between p-2 rounded border border-gray-100 hover:bg-gray-50"
							>
								<span className="font-mono text-sm">{tag}</span>
								<span className="font-mono text-xs text-muted-foreground">
									{confidence.toFixed(4)}
								</span>
							</div>
						))}
					</div>
				</ScrollArea>
			</div>
		);
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-base flex items-center gap-2">
					<Filter className="h-5 w-5" />
					Postprocess Results
					{result && (
						<Badge variant={result.success ? "default" : "destructive"}>
							{result.success ? "Success" : "Failed"}
						</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-4">
						<div className="animate-pulse">
							<div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
							<div className="h-32 bg-gray-200 rounded"></div>
						</div>
					</div>
				) : result ? (
					<div className="space-y-4">
						{/* Configuration Used */}
						<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
							<div className="flex items-center gap-2 mb-2">
								<Settings className="h-4 w-4 text-blue-600" />
								<Label className="text-sm font-medium text-blue-800">
									Configuration Used
								</Label>
							</div>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
								<div>
									<span className="text-muted-foreground">General Thresh:</span>
									<span className="ml-1 font-mono">
										{result.config_used.general_threshold.toFixed(2)}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Character Thresh:</span>
									<span className="ml-1 font-mono">
										{result.config_used.character_threshold.toFixed(2)}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">General MCut:</span>
									<span className="ml-1">
										{result.config_used.general_mcut_enabled ? "On" : "Off"}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Character MCut:</span>
									<span className="ml-1">
										{result.config_used.character_mcut_enabled ? "On" : "Off"}
									</span>
								</div>
							</div>
						</div>

						{/* Category Summary */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
							<div className="text-center p-3 bg-blue-50 rounded-lg">
								<Badge className="mx-auto mb-1">Total</Badge>
								<div className="text-lg font-mono text-blue-600">
									{result.category_summary.total_tags}
								</div>
								<div className="text-xs text-muted-foreground">Final Tags</div>
							</div>
							<div className="text-center p-3 bg-red-50 rounded-lg">
								<Badge variant="destructive" className="mx-auto mb-1">
									R
								</Badge>
								<div className="text-lg font-mono text-red-600">
									{result.category_summary.rating_count}
								</div>
								<div className="text-xs text-muted-foreground">Rating</div>
							</div>
							<div className="text-center p-3 bg-green-50 rounded-lg">
								<Badge variant="secondary" className="mx-auto mb-1">
									G
								</Badge>
								<div className="text-lg font-mono text-green-600">
									{result.category_summary.general_count}
								</div>
								<div className="text-xs text-muted-foreground">General</div>
							</div>
							<div className="text-center p-3 bg-blue-50 rounded-lg">
								<Badge variant="default" className="mx-auto mb-1">
									C
								</Badge>
								<div className="text-lg font-mono text-blue-600">
									{result.category_summary.character_count}
								</div>
								<div className="text-xs text-muted-foreground">Character</div>
							</div>
						</div>

						{/* Confidence Metrics */}
						<div className="grid grid-cols-2 gap-4">
							<div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
								<TrendingUp className="h-4 w-4 text-purple-600" />
								<div>
									<div className="text-xs text-muted-foreground">
										Top Confidence
									</div>
									<div className="font-mono text-purple-600">
										{result.category_summary.top_confidence.toFixed(4)}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
								<BarChart3 className="h-4 w-4 text-orange-600" />
								<div>
									<div className="text-xs text-muted-foreground">
										Average Confidence
									</div>
									<div className="font-mono text-orange-600">
										{result.category_summary.avg_confidence.toFixed(4)}
									</div>
								</div>
							</div>
						</div>

						{/* Detailed Analysis */}
						<Tabs defaultValue="final" className="w-full">
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="final">Final Tags</TabsTrigger>
								<TabsTrigger value="filtered">Filtering Details</TabsTrigger>
								<TabsTrigger value="threshold">Threshold Analysis</TabsTrigger>
							</TabsList>

							<TabsContent value="final" className="mt-4">
								{renderFinalTags()}
							</TabsContent>

							<TabsContent value="filtered" className="mt-4">
								{renderFilteredTagsInfo()}
							</TabsContent>

							<TabsContent value="threshold" className="mt-4">
								<div className="space-y-4">
									{/* General Threshold Analysis */}
									<div className="p-4 border rounded-lg">
										<div className="flex items-center justify-between mb-3">
											<Label className="text-sm font-medium">
												General Threshold Analysis
											</Label>
											<Badge variant="secondary">
												{result.config_used.general_threshold.toFixed(2)}
											</Badge>
										</div>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div className="flex items-center gap-2">
												<Tags className="h-4 w-4 text-muted-foreground" />
												<span className="text-muted-foreground">
													Before:
												</span>
												<span className="font-mono">
													{
														result.threshold_analysis
															.tags_before_general_threshold
													}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<Filter className="h-4 w-4 text-muted-foreground" />
												<span className="text-muted-foreground">
													After:
												</span>
												<span className="font-mono">
													{
														result.threshold_analysis
															.tags_after_general_threshold
													}
												</span>
											</div>
										</div>
										<div className="mt-2 text-xs text-muted-foreground">
											{result.threshold_analysis
												.tags_after_general_threshold <
												result.threshold_analysis
													.tags_before_general_threshold && (
												<span className="text-yellow-600">
													↓{" "}
													{result.threshold_analysis
														.tags_before_general_threshold -
														result.threshold_analysis
															.tags_after_general_threshold}{" "}
													tags filtered
												</span>
											)}
										</div>
									</div>

									{/* Character Threshold Analysis */}
									<div className="p-4 border rounded-lg">
										<div className="flex items-center justify-between mb-3">
											<Label className="text-sm font-medium">
												Character Threshold Analysis
											</Label>
											<Badge variant="default">
												{result.config_used.character_threshold.toFixed(2)}
											</Badge>
										</div>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div className="flex items-center gap-2">
												<Tags className="h-4 w-4 text-muted-foreground" />
												<span className="text-muted-foreground">
													Before:
												</span>
												<span className="font-mono">
													{
														result.threshold_analysis
															.tags_before_character_threshold
													}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<Filter className="h-4 w-4 text-muted-foreground" />
												<span className="text-muted-foreground">
													After:
												</span>
												<span className="font-mono">
													{
														result.threshold_analysis
															.tags_after_character_threshold
													}
												</span>
											</div>
										</div>
										<div className="mt-2 text-xs text-muted-foreground">
											{result.threshold_analysis
												.tags_after_character_threshold <
												result.threshold_analysis
													.tags_before_character_threshold && (
												<span className="text-yellow-600">
													↓{" "}
													{result.threshold_analysis
														.tags_before_character_threshold -
														result.threshold_analysis
															.tags_after_character_threshold}{" "}
													tags filtered
												</span>
											)}
										</div>
									</div>

									{/* MCut Effects */}
									{result.threshold_analysis.mcut_effects && (
										<div className="p-4 border rounded-lg">
											<Label className="text-sm font-medium mb-3 block">
												MCut Effects
											</Label>
											<div className="grid grid-cols-2 gap-4 text-sm">
												<div>
													<span className="text-muted-foreground">
														General Result:
													</span>
													<span className="ml-2 font-mono">
														{
															result.threshold_analysis.mcut_effects
																.general_tags_after_mcut
														}{" "}
														tags
													</span>
													{result.threshold_analysis.mcut_effects
														.general_mcut_threshold && (
														<span className="block text-xs text-muted-foreground">
															Threshold:{" "}
															{result.threshold_analysis.mcut_effects.general_mcut_threshold.toFixed(
																3
															)}
														</span>
													)}
												</div>
												<div>
													<span className="text-muted-foreground">
														Character Result:
													</span>
													<span className="ml-2 font-mono">
														{
															result.threshold_analysis.mcut_effects
																.character_tags_after_mcut
														}{" "}
														tags
													</span>
													{result.threshold_analysis.mcut_effects
														.character_mcut_threshold && (
														<span className="block text-xs text-muted-foreground">
															Threshold:{" "}
															{result.threshold_analysis.mcut_effects.character_mcut_threshold.toFixed(
																3
															)}
														</span>
													)}
												</div>
											</div>
										</div>
									)}
								</div>
							</TabsContent>
						</Tabs>

						{/* Error Display */}
						{!result.success && result.error && (
							<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
								<p className="text-sm text-red-800">{result.error}</p>
							</div>
						)}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
