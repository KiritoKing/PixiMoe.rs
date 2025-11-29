import { AlertCircle, CheckCircle, File, Upload, XCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFilePicker, useUploadTagModel } from "@/lib/hooks/useSettings";

export function ModelUploadArea() {
	const [isDragOver, setIsDragOver] = useState(false);
	const uploadMutation = useUploadTagModel();
	const { openFilePicker } = useFilePicker();

	const handleFileSelect = async () => {
		try {
			// Use file picker to get the file path
			const selected = await openFilePicker(["onnx"]);
			if (selected && typeof selected === "string") {
				const result = await uploadMutation.mutateAsync(selected);
				if (result.success) {
					console.log("Model uploaded successfully:", result);
				} else {
					console.error("Upload failed:", result.message);
				}
			}
		} catch (error) {
			console.error("Upload error:", error);
		}
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragOver(false);
	};

	const handleDrop = async (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragOver(false);

		const file = event.dataTransfer.files[0];
		if (!file) return;

		// Check file extension
		if (!file.name.endsWith(".onnx")) {
			alert("Please select a .onnx file");
			return;
		}

		try {
			// For dropped files, we need to handle them differently
			// This would require implementing a file path access mechanism
			console.log("Dropped file:", file.name);
			// TODO: Implement file handling for dropped files
		} catch (error) {
			console.error("Drop error:", error);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<File className="h-5 w-5" />
					标签模型 (Tag Model)
				</CardTitle>
				<CardDescription>
					Upload your ONNX model file for AI-powered image tagging
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Upload Area */}
				<button
					type="button"
					onClick={handleFileSelect}
					className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors w-full ${
						isDragOver
							? "border-primary bg-primary/5"
							: "border-muted-foreground/25 hover:border-primary/50"
					}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					disabled={uploadMutation.isPending}
				>
					<Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<div className="space-y-2">
						<p className="text-sm font-medium">
							Drag and drop your .onnx file here, or click to browse
						</p>
						<p className="text-xs text-muted-foreground">
							Supported format: .onnx (ONNX model)
						</p>
					</div>
					{uploadMutation.isPending ? "Uploading..." : "Choose File"}
				</button>

				{/* Upload Progress */}
				{uploadMutation.isPending && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm">
							<AlertCircle className="h-4 w-4 animate-spin" />
							Uploading model file...
						</div>
						<Progress value={50} className="w-full" />
					</div>
				)}

				{/* Upload Results */}
				{uploadMutation.data && (
					<Alert
						className={
							uploadMutation.data.success
								? "border-green-200 bg-green-50"
								: "border-red-200 bg-red-50"
						}
					>
						{uploadMutation.data.success ? (
							<CheckCircle className="h-4 w-4 text-green-600" />
						) : (
							<XCircle className="h-4 w-4 text-red-600" />
						)}
						<AlertDescription
							className={
								uploadMutation.data.success ? "text-green-800" : "text-red-800"
							}
						>
							{uploadMutation.data.message}
						</AlertDescription>
					</Alert>
				)}

				{/* Upload Error */}
				{uploadMutation.error && (
					<Alert className="border-red-200 bg-red-50">
						<XCircle className="h-4 w-4 text-red-600" />
						<AlertDescription className="text-red-800">
							Upload failed: {uploadMutation.error.message}
						</AlertDescription>
					</Alert>
				)}

				{/* Hash Information */}
				{uploadMutation.data?.success && uploadMutation.data.calculated_hash && (
					<div className="text-xs text-muted-foreground">
						<p>SHA256: {uploadMutation.data.calculated_hash}</p>
					</div>
				)}

				{/* Information Note */}
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						SHA256 hash values are built into the application for security verification.
						If no hash is configured, any file will be accepted. Please ensure you trust
						the source of your model files.
					</AlertDescription>
				</Alert>
			</CardContent>
		</Card>
	);
}
