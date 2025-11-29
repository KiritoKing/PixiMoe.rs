import { AlertCircle, CheckCircle2, FileText, Play, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
	type DebugInferenceResult,
	type DebugPostprocessResult,
	type DebugPreprocessResult,
	type InferenceConfig,
	useDebugModelInference,
	useDebugModelPostprocess,
	useDebugModelPreprocess,
	useFilePicker,
} from "@/lib/hooks/useSettings";
import { InferenceStep } from "./InferenceStep";
import { PostprocessStep } from "./PostprocessStep";
import { PreprocessStep } from "./PreprocessStep";
import { ResultsStep } from "./ResultsStep";

export function ModelDebugPanel() {
	const [selectedImagePath, setSelectedImagePath] = useState<string>("");
	const [currentStep, setCurrentStep] = useState<
		"setup" | "preprocess" | "inference" | "postprocess" | "complete"
	>("setup");
	const [debugConfig, setDebugConfig] = useState<InferenceConfig>({
		general_threshold: 0.35,
		character_threshold: 0.85,
		general_mcut_enabled: false,
		character_mcut_enabled: false,
		max_tags: 50,
	});

	// Results storage
	const [preprocessResult, setPreprocessResult] = useState<DebugPreprocessResult | null>(null);
	const [inferenceResult, setInferenceResult] = useState<DebugInferenceResult | null>(null);
	const [postprocessResult, setPostprocessResult] = useState<DebugPostprocessResult | null>(null);

	const { openFilePicker } = useFilePicker();
	const preprocessMutation = useDebugModelPreprocess();
	const inferenceMutation = useDebugModelInference();
	const postprocessMutation = useDebugModelPostprocess();

	const handleSelectImage = async () => {
		try {
			const selected = await openFilePicker(["jpg", "jpeg", "png", "bmp", "tiff", "webp"]);
			if (selected && typeof selected === "string") {
				setSelectedImagePath(selected);
				// Reset debugging state when new image is selected
				setCurrentStep("preprocess");
				// Clear previous results
				setPreprocessResult(null);
				setInferenceResult(null);
				setPostprocessResult(null);
				preprocessMutation.reset();
				inferenceMutation.reset();
				postprocessMutation.reset();
			}
		} catch (error) {
			console.error("Failed to select image:", error);
		}
	};

	const handleRunPreprocess = useCallback(async () => {
		if (!selectedImagePath) return;
		try {
			const result = await preprocessMutation.mutateAsync(selectedImagePath);
			setPreprocessResult(result);
		} catch (error) {
			console.error("Preprocess failed:", error);
		}
	}, [selectedImagePath, preprocessMutation]);

	const handleRunInference = useCallback(async () => {
		if (!selectedImagePath) return;
		try {
			const result = await inferenceMutation.mutateAsync(selectedImagePath);
			setInferenceResult(result);
		} catch (error) {
			console.error("Inference failed:", error);
		}
	}, [selectedImagePath, inferenceMutation]);

	const handleRunPostprocess = useCallback(async () => {
		if (!selectedImagePath) return;
		try {
			const result = await postprocessMutation.mutateAsync({
				imagePath: selectedImagePath,
				config: debugConfig,
			});
			setPostprocessResult(result);
		} catch (error) {
			console.error("Postprocess failed:", error);
		}
	}, [selectedImagePath, postprocessMutation, debugConfig]);

	// Auto-run steps when entering them or when dependencies complete
	useEffect(() => {
		if (
			currentStep === "preprocess" &&
			selectedImagePath &&
			!preprocessResult &&
			!preprocessMutation.isPending
		) {
			handleRunPreprocess();
		}
	}, [
		currentStep,
		selectedImagePath,
		preprocessResult,
		preprocessMutation.isPending,
		handleRunPreprocess,
	]);

	useEffect(() => {
		if (
			currentStep === "inference" &&
			selectedImagePath &&
			preprocessResult?.success &&
			!inferenceResult &&
			!inferenceMutation.isPending
		) {
			handleRunInference();
		}
	}, [
		currentStep,
		selectedImagePath,
		preprocessResult,
		inferenceResult,
		inferenceMutation.isPending,
		handleRunInference,
	]);

	useEffect(() => {
		if (
			currentStep === "postprocess" &&
			selectedImagePath &&
			inferenceResult?.success &&
			!postprocessResult &&
			!postprocessMutation.isPending
		) {
			handleRunPostprocess();
		}
	}, [
		currentStep,
		selectedImagePath,
		inferenceResult,
		postprocessResult,
		postprocessMutation.isPending,
		handleRunPostprocess,
	]);

	// Auto-advance to next step when current step completes successfully
	useEffect(() => {
		if (currentStep === "preprocess" && preprocessResult?.success && !inferenceResult) {
			setCurrentStep("inference");
		}
	}, [currentStep, preprocessResult, inferenceResult]);

	useEffect(() => {
		if (currentStep === "inference" && inferenceResult?.success && !postprocessResult) {
			setCurrentStep("postprocess");
		}
	}, [currentStep, inferenceResult, postprocessResult]);

	useEffect(() => {
		if (currentStep === "postprocess" && postprocessResult?.success) {
			setCurrentStep("complete");
		}
	}, [currentStep, postprocessResult]);

	const handleReset = () => {
		setSelectedImagePath("");
		setCurrentStep("setup");
		setPreprocessResult(null);
		setInferenceResult(null);
		setPostprocessResult(null);
		preprocessMutation.reset();
		inferenceMutation.reset();
		postprocessMutation.reset();
	};

	// New function to check if a step can be viewed (completed steps are always viewable)
	const canViewStep = (step: typeof currentStep) => {
		switch (step) {
			case "setup":
				return true;
			case "preprocess":
				return !!selectedImagePath; // Can view preprocess as soon as image is selected
			case "inference":
				return preprocessResult?.success || false; // Can view inference if preprocess completed
			case "postprocess":
				return inferenceResult?.success || false; // Can view postprocess if inference completed
			case "complete":
				return postprocessResult?.success || false; // Can view results if postprocess completed
			default:
				return false;
		}
	};

	const getStepTitle = (step: typeof currentStep) => {
		switch (step) {
			case "setup":
				return "Setup";
			case "preprocess":
				return "1. Preprocess";
			case "inference":
				return "2. Inference";
			case "postprocess":
				return "3. Postprocess";
			case "complete":
				return "Results";
			default:
				return "";
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">AI Model Debugging</h3>
					<p className="text-sm text-muted-foreground">
						Visual and detailed debugging of AI model inference pipeline
					</p>
				</div>
			</div>

			{currentStep === "setup" && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Setup Debugging</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Button
								onClick={handleSelectImage}
								variant="outline"
								className="flex items-center gap-2"
							>
								<Upload className="h-4 w-4" />
								Select Test Image
							</Button>
						</div>

						{selectedImagePath && (
							<div className="space-y-4">
								<Alert>
									<FileText className="h-4 w-4" />
									<AlertDescription>
										Selected image:{" "}
										<span className="font-mono text-xs">
											{selectedImagePath}
										</span>
									</AlertDescription>
								</Alert>

								{/* Debug Parameters */}
								<div className="space-y-4">
									<h4 className="font-medium text-sm">Debug Parameters</h4>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<Label className="text-sm">
												General Threshold:{" "}
												{debugConfig.general_threshold.toFixed(2)}
											</Label>
											<Slider
												min={0}
												max={1}
												step={0.05}
												value={[debugConfig.general_threshold]}
												onValueChange={([value]) =>
													setDebugConfig((prev) => ({
														...prev,
														general_threshold: value,
													}))
												}
											/>
										</div>
										<div>
											<Label className="text-sm">
												Character Threshold:{" "}
												{debugConfig.character_threshold.toFixed(2)}
											</Label>
											<Slider
												min={0}
												max={1}
												step={0.05}
												value={[debugConfig.character_threshold]}
												onValueChange={([value]) =>
													setDebugConfig((prev) => ({
														...prev,
														character_threshold: value,
													}))
												}
											/>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="flex items-center gap-2">
											<Switch
												checked={debugConfig.general_mcut_enabled}
												onCheckedChange={(checked) =>
													setDebugConfig((prev) => ({
														...prev,
														general_mcut_enabled: checked,
													}))
												}
											/>
											<Label className="text-sm">MCut (General)</Label>
										</div>
										<div className="flex items-center gap-2">
											<Switch
												checked={debugConfig.character_mcut_enabled}
												onCheckedChange={(checked) =>
													setDebugConfig((prev) => ({
														...prev,
														character_mcut_enabled: checked,
													}))
												}
											/>
											<Label className="text-sm">MCut (Character)</Label>
										</div>
									</div>
								</div>

								<div className="flex gap-3">
									<Button
										onClick={() => setCurrentStep("preprocess")}
										className="flex items-center gap-2"
									>
										<Play className="h-4 w-4" />
										Start Debugging
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{currentStep !== "setup" && (
				<>
					{/* Progress Indicator */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Debug Pipeline Progress</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between">
								{["preprocess", "inference", "postprocess", "complete"].map(
									(step, index) => {
										const canView = canViewStep(step as typeof currentStep);
										const isCompleted =
											step !== "complete" &&
											(step === "preprocess"
												? preprocessResult?.success
												: step === "inference"
													? inferenceResult?.success
													: step === "postprocess"
														? postprocessResult?.success
														: false);

										return (
											<div key={step} className="flex items-center">
												<div className="flex flex-col items-center">
													<Badge
														variant={
															currentStep === step
																? "default"
																: canView
																	? "secondary"
																	: "outline"
														}
														className={`mb-2 cursor-pointer hover:opacity-80 transition-opacity ${canView ? "" : "opacity-50"}`}
														onClick={() =>
															canView &&
															setCurrentStep(
																step as typeof currentStep
															)
														}
													>
														{isCompleted && (
															<CheckCircle2 className="h-3 w-3 mr-1" />
														)}
														{getStepTitle(step as typeof currentStep)}
													</Badge>
													{!canView && (
														<div className="text-xs text-muted-foreground mt-1">
															{(step === "inference" &&
																"Waiting for preprocess") ||
																(step === "postprocess" &&
																	"Waiting for inference") ||
																(step === "complete" &&
																	"Waiting for postprocess")}
														</div>
													)}
												</div>
												{index < 3 && (
													<div
														className={`h-px w-8 mx-2 ${
															canView ? "bg-primary" : "bg-muted"
														}`}
													/>
												)}
											</div>
										);
									}
								)}
							</div>
							<p className="text-xs text-muted-foreground mt-3 text-center">
								Click on completed steps to review results
							</p>
						</CardContent>
					</Card>

					{/* Step Content */}
					<div className="space-y-4">
						{currentStep === "preprocess" && (
							<PreprocessStep
								result={preprocessResult}
								isLoading={preprocessMutation.isPending}
							/>
						)}

						{currentStep === "inference" && (
							<InferenceStep
								result={inferenceResult}
								isLoading={inferenceMutation.isPending}
							/>
						)}

						{currentStep === "postprocess" && (
							<PostprocessStep
								result={postprocessResult}
								isLoading={postprocessMutation.isPending}
							/>
						)}

						{currentStep === "complete" && (
							<ResultsStep
								preprocessResult={preprocessResult}
								inferenceResult={inferenceResult}
								postprocessResult={postprocessResult}
								onReset={handleReset}
							/>
						)}
					</div>
				</>
			)}

			{/* Error Display */}
			{(preprocessMutation.error || inferenceMutation.error || postprocessMutation.error) && (
				<Alert className="border-red-200 bg-red-50">
					<AlertCircle className="h-4 w-4 text-red-600" />
					<AlertDescription className="text-red-800">
						Debug error:{" "}
						{
							(
								preprocessMutation.error ||
								inferenceMutation.error ||
								postprocessMutation.error
							)?.message
						}
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
