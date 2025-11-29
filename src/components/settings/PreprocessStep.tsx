import { ChevronRight, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DebugPreprocessResult } from "@/lib/hooks/useSettings";

interface PreprocessStepProps {
	result: DebugPreprocessResult | null;
	isLoading?: boolean;
}

export function PreprocessStep({ result, isLoading }: PreprocessStepProps) {
	if (!result && !isLoading) {
		return null;
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-base flex items-center gap-2">
					<ImageIcon className="h-5 w-5" />
					Preprocess Results
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
						{/* Image Dimensions */}
						<div className="grid grid-cols-3 gap-4 text-sm">
							<div>
								<Label className="text-xs text-muted-foreground">
									Original Size
								</Label>
								<p className="font-mono">{result.original_size.join(" × ")}</p>
							</div>
							<div>
								<Label className="text-xs text-muted-foreground">Padded Size</Label>
								<p className="font-mono">{result.padded_size.join(" × ")}</p>
							</div>
							<div>
								<Label className="text-xs text-muted-foreground">Final Size</Label>
								<p className="font-mono">{result.final_size.join(" × ")}</p>
							</div>
						</div>

						{/* Image Visualization */}
						{result.original_image_data &&
							result.padded_image_data &&
							result.preprocessed_image_data && (
								<Tabs defaultValue="original" className="w-full">
									<TabsList className="grid w-full grid-cols-3">
										<TabsTrigger value="original">Original</TabsTrigger>
										<TabsTrigger value="padded">Padded</TabsTrigger>
										<TabsTrigger value="preprocessed">Preprocessed</TabsTrigger>
									</TabsList>

									<TabsContent value="original" className="mt-4">
										<div className="space-y-2">
											<Label className="text-sm">Original Image</Label>
											<div className="border rounded-lg overflow-hidden bg-gray-50">
												<img
													src={result.original_image_data}
													alt="Original"
													className="w-full h-auto max-h-64 object-contain"
												/>
											</div>
											<p className="text-xs text-muted-foreground">
												Original image loaded from file
											</p>
										</div>
									</TabsContent>

									<TabsContent value="padded" className="mt-4">
										<div className="space-y-2">
											<Label className="text-sm">Padded to Square</Label>
											<div className="border rounded-lg overflow-hidden bg-gray-50">
												<img
													src={result.padded_image_data}
													alt="Padded to square"
													className="w-full h-auto max-h-64 object-contain"
												/>
											</div>
											<p className="text-xs text-muted-foreground">
												Image padded to square shape with white background
											</p>
										</div>
									</TabsContent>

									<TabsContent value="preprocessed" className="mt-4">
										<div className="space-y-2">
											<Label className="text-sm">
												Final Preprocessed (448×448)
											</Label>
											<div className="border rounded-lg overflow-hidden bg-gray-50">
												<img
													src={result.preprocessed_image_data}
													alt="Resized to 448x448"
													className="w-full h-auto max-h-64 object-contain"
												/>
											</div>
											<p className="text-xs text-muted-foreground">
												Resized to 448×448 and converted for model input
											</p>
										</div>
									</TabsContent>
								</Tabs>
							)}

						{/* Preprocessing Steps */}
						<div>
							<Label className="text-sm">Processing Steps</Label>
							<ul className="text-xs space-y-1 mt-2">
								{result.preprocessing_steps.map((step, index) => (
									<li key={index} className="flex items-center gap-2">
										<ChevronRight className="h-3 w-3 text-muted-foreground" />
										{step}
									</li>
								))}
							</ul>
						</div>

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
