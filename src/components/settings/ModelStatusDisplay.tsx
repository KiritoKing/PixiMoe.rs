import { AlertCircle, CheckCircle, RefreshCw, Trash2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useModelStatus, useRemoveModelFiles } from "@/lib/hooks/useSettings";

export function ModelStatusDisplay() {
	const { data: modelStatus, isLoading, error, refetch } = useModelStatus();
	const removeMutation = useRemoveModelFiles();

	const handleRemoveModels = async () => {
		if (
			confirm(
				"Are you sure you want to remove all model files? This action cannot be undone."
			)
		) {
			try {
				await removeMutation.mutateAsync();
				await refetch();
			} catch (error) {
				console.error("Failed to remove model files:", error);
			}
		}
	};

	const handleRefresh = () => {
		refetch();
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex items-center gap-2">
					<RefreshCw className="h-4 w-4 animate-spin" />
					<span>Loading model status...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<Alert className="border-red-200 bg-red-50">
				<XCircle className="h-4 w-4 text-red-600" />
				<AlertDescription className="text-red-800">
					Failed to load model status: {error.message}
				</AlertDescription>
			</Alert>
		);
	}

	if (!modelStatus) {
		return (
			<Alert>
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>No model status information available.</AlertDescription>
			</Alert>
		);
	}

	const isModelReady =
		modelStatus.model_file_exists &&
		modelStatus.csv_file_exists &&
		modelStatus.model_session_loaded;

	return (
		<div className="space-y-4">
			{/* Status Overview */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Badge variant={isModelReady ? "default" : "secondary"}>
						{isModelReady ? "Ready" : "Not Ready"}
					</Badge>
					<span className="text-sm text-muted-foreground">
						{isModelReady
							? "All model files are loaded and ready"
							: "Some model files are missing or not loaded"}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleRefresh}
						disabled={isLoading}
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</Button>
					{modelStatus.model_file_exists && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleRemoveModels}
							disabled={removeMutation.isPending}
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Remove
						</Button>
					)}
				</div>
			</div>

			{/* Model File Status */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base flex items-center gap-2">
							{modelStatus.model_file_exists ? (
								<CheckCircle className="h-5 w-5 text-green-600" />
							) : (
								<XCircle className="h-5 w-5 text-red-600" />
							)}
							ONNX Model File
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span>Status:</span>
								<Badge
									variant={
										modelStatus.model_file_exists ? "default" : "destructive"
									}
								>
									{modelStatus.model_file_exists ? "Found" : "Missing"}
								</Badge>
							</div>
							{modelStatus.model_file_path && (
								<div className="text-xs text-muted-foreground break-all">
									<p className="font-medium">Path:</p>
									<p>{modelStatus.model_file_path}</p>
								</div>
							)}
							{modelStatus.label_map_error && (
								<Alert className="mt-2">
									<AlertCircle className="h-4 w-4" />
									<AlertDescription className="text-xs">
										{modelStatus.label_map_error}
									</AlertDescription>
								</Alert>
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base flex items-center gap-2">
							{modelStatus.csv_file_exists ? (
								<CheckCircle className="h-5 w-5 text-green-600" />
							) : (
								<XCircle className="h-5 w-5 text-red-600" />
							)}
							Label Map File
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span>Status:</span>
								<Badge
									variant={
										modelStatus.csv_file_exists ? "default" : "destructive"
									}
								>
									{modelStatus.csv_file_exists ? "Found" : "Missing"}
								</Badge>
							</div>
							{modelStatus.csv_file_path && (
								<div className="text-xs text-muted-foreground break-all">
									<p className="font-medium">Path:</p>
									<p>{modelStatus.csv_file_path}</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Model Session Status */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base flex items-center gap-2">
						{modelStatus.model_session_loaded ? (
							<CheckCircle className="h-5 w-5 text-green-600" />
						) : (
							<XCircle className="h-5 w-5 text-red-600" />
						)}
						Model Session
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span>Session Status:</span>
							<Badge
								variant={
									modelStatus.model_session_loaded ? "default" : "destructive"
								}
							>
								{modelStatus.model_session_loaded ? "Loaded" : "Not Loaded"}
							</Badge>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span>Label Map:</span>
							<Badge
								variant={modelStatus.label_map_loaded ? "default" : "destructive"}
							>
								{modelStatus.label_map_loaded ? "Loaded" : "Not Loaded"}
							</Badge>
						</div>
						{modelStatus.model_session_error && (
							<Alert>
								<AlertCircle className="h-4 w-4" />
								<AlertDescription className="text-xs">
									Session Error: {modelStatus.model_session_error}
								</AlertDescription>
							</Alert>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Models Directory Info */}
			{modelStatus.models_dir && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Storage Information</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-xs text-muted-foreground break-all">
							<p className="font-medium">Models Directory:</p>
							<p>{modelStatus.models_dir}</p>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
