import { BarChart3, Clock, Cpu, Grid3X3, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DebugInferenceResult, PredictionDetail } from "@/lib/hooks/useSettings";

interface InferenceStepProps {
	result: DebugInferenceResult | null;
	isLoading?: boolean;
}

export function InferenceStep({ result, isLoading }: InferenceStepProps) {
	if (!result && !isLoading) {
		return null;
	}

	const renderPredictionList = (predictions: PredictionDetail[], limit?: number) => {
		const displayPredictions = limit ? predictions.slice(0, limit) : predictions;

		return (
			<div className="space-y-1">
				{displayPredictions.map((prediction, index) => (
					<div
						key={`${prediction.tag_id}-${index}`}
						className="flex items-center justify-between p-2 rounded border border-gray-100 hover:bg-gray-50"
					>
						<div className="flex items-center gap-3 flex-1 min-w-0">
							<Badge
								variant={
									prediction.category === "rating"
										? "destructive"
										: prediction.category === "character"
											? "default"
											: prediction.category === "general"
												? "secondary"
												: "outline"
								}
								className="text-xs"
							>
								{prediction.category}
							</Badge>
							<span className="font-mono text-sm truncate">{prediction.name}</span>
						</div>
						<div className="flex items-center gap-4 text-xs text-muted-foreground">
							<span>#{prediction.index}</span>
							<span className="font-mono min-w-[3rem] text-right">
								{prediction.confidence.toFixed(4)}
							</span>
						</div>
					</div>
				))}
				{limit && predictions.length > limit && (
					<div className="text-center text-xs text-muted-foreground mt-2">
						... and {predictions.length - limit} more predictions
					</div>
				)}
			</div>
		);
	};

	const renderConfidenceHistogram = (distribution: number[]) => {
		if (!distribution.length) return null;

		const maxValue = Math.max(...distribution, 1);
		const binWidth = 100 / distribution.length;

		return (
			<div className="space-y-2">
				<div className="flex items-end gap-1 h-32">
					{distribution.map((count, index) => {
						const height = (count / maxValue) * 100;
						const leftRange = index * binWidth;
						const rightRange = (index + 1) * binWidth;

						return (
							<div
								key={index}
								className="flex-1 bg-blue-500 hover:bg-blue-600 transition-colors relative group"
								style={{ height: `${height}%` }}
								title={`${count} tags in ${leftRange.toFixed(0)}-${rightRange.toFixed(0)}% range`}
							>
								<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
									{count}
								</div>
							</div>
						);
					})}
				</div>
				<div className="flex justify-between text-xs text-muted-foreground">
					<span>0%</span>
					<span>50%</span>
					<span>100%</span>
				</div>
				<p className="text-xs text-muted-foreground">
					Confidence distribution across all predictions
				</p>
			</div>
		);
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-base flex items-center gap-2">
					<Cpu className="h-5 w-5" />
					Inference Results
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
						{/* Performance Metrics */}
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-muted-foreground" />
								<Label className="text-xs text-muted-foreground">
									Execution Time
								</Label>
								<span className="font-mono ml-auto">
									{result.execution_time_ms}ms
								</span>
							</div>
							<div className="flex items-center gap-2">
								<Grid3X3 className="h-4 w-4 text-muted-foreground" />
								<Label className="text-xs text-muted-foreground">
									Output Shape
								</Label>
								<span className="font-mono ml-auto text-xs">
									[{result.output_shape.join(", ")}]
								</span>
							</div>
						</div>

						{/* Detailed Results */}
						<Tabs defaultValue="overview" className="w-full">
							<TabsList className="grid w-full grid-cols-4">
								<TabsTrigger value="overview">Overview</TabsTrigger>
								<TabsTrigger value="predictions">All Tags</TabsTrigger>
								<TabsTrigger value="categories">Categories</TabsTrigger>
								<TabsTrigger value="distribution">Distribution</TabsTrigger>
							</TabsList>

							<TabsContent value="overview" className="mt-4">
								<div className="space-y-4">
									<div>
										<Label className="text-sm">
											Top Predictions (First 10)
										</Label>
										<div className="mt-2">
											{renderPredictionList(
												result.all_predictions.slice(0, 10)
											)}
										</div>
									</div>

									<div className="grid grid-cols-3 gap-4 text-sm">
										<div className="text-center p-3 bg-blue-50 rounded-lg">
											<TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-600" />
											<div className="text-lg font-mono text-blue-600">
												{result.all_predictions.length}
											</div>
											<div className="text-xs text-muted-foreground">
												Total Tags
											</div>
										</div>
										<div className="text-center p-3 bg-green-50 rounded-lg">
											<BarChart3 className="h-4 w-4 mx-auto mb-1 text-green-600" />
											<div className="text-lg font-mono text-green-600">
												{
													result.all_predictions.filter(
														(p) => p.confidence > 0.5
													).length
												}
											</div>
											<div className="text-xs text-muted-foreground">
												High Confidence
											</div>
										</div>
										<div className="text-center p-3 bg-purple-50 rounded-lg">
											<Badge className="mx-auto mb-1">Ø</Badge>
											<div className="text-lg font-mono text-purple-600">
												{(
													result.all_predictions.reduce(
														(sum, p) => sum + p.confidence,
														0
													) / result.all_predictions.length
												).toFixed(3)}
											</div>
											<div className="text-xs text-muted-foreground">
												Avg Confidence
											</div>
										</div>
									</div>
								</div>
							</TabsContent>

							<TabsContent value="predictions" className="mt-4">
								<div className="space-y-2">
									<div className="flex justify-between items-center">
										<Label className="text-sm">
											All Predictions ({result.all_predictions.length})
										</Label>
									</div>
									<ScrollArea className="h-96 border rounded-lg p-2">
										{renderPredictionList(result.all_predictions)}
									</ScrollArea>
								</div>
							</TabsContent>

							<TabsContent value="categories" className="mt-4">
								<div className="space-y-4">
									{["rating", "general", "character"].map((category) => {
										const categoryPredictions = result.all_predictions.filter(
											(p) => p.category === category
										);
										if (categoryPredictions.length === 0) return null;

										return (
											<div key={category} className="space-y-2">
												<div className="flex items-center gap-2">
													<Badge
														variant={
															category === "rating"
																? "destructive"
																: category === "character"
																	? "default"
																	: "secondary"
														}
													>
														{category.charAt(0).toUpperCase() +
															category.slice(1)}
													</Badge>
													<Label className="text-sm text-muted-foreground">
														{categoryPredictions.length} tags
													</Label>
													{categoryPredictions.length > 0 && (
														<span className="text-xs text-muted-foreground ml-auto">
															avg:{" "}
															{(
																categoryPredictions.reduce(
																	(sum, p) => sum + p.confidence,
																	0
																) / categoryPredictions.length
															).toFixed(3)}
														</span>
													)}
												</div>
												{renderPredictionList(
													categoryPredictions.slice(0, 5),
													5
												)}
											</div>
										);
									})}
								</div>
							</TabsContent>

							<TabsContent value="distribution" className="mt-4">
								<div className="space-y-2">
									<Label className="text-sm">Confidence Distribution</Label>
									{renderConfidenceHistogram(result.confidence_distribution)}
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
