import { AlertCircle, CheckCircle, FileText, Upload, XCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	useFilePicker,
	useTranslationStatus,
	useUploadTranslationDictionary,
} from "@/lib/hooks/useSettings";

export function TranslationDictionaryUploadArea() {
	const [isDragOver, setIsDragOver] = useState(false);
	const uploadMutation = useUploadTranslationDictionary();
	const { openFilePicker } = useFilePicker();
	const { refetch: refetchStatus } = useTranslationStatus();

	const handleFileSelect = async () => {
		try {
			const selected = await openFilePicker(["csv"]);
			if (selected && typeof selected === "string") {
				const result = await uploadMutation.mutateAsync(selected);
				if (result.success) {
					console.log("Translation dictionary uploaded successfully:", result);
					// Refetch status after successful upload
					await refetchStatus();
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

		if (!file.name.endsWith(".csv")) {
			alert("请选择 .csv 文件");
			return;
		}

		// For dropped files, we need to use file picker
		// since we need the file path, not the File object
		console.log("Dropped file:", file.name);
		// TODO: Implement file handling for dropped files if needed
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<FileText className="h-5 w-5" />
					翻译字典 (Translation Dictionary)
				</CardTitle>
				<CardDescription>
					上传包含标签翻译的 CSV 文件。文件格式：tag_id,translated_name,language_code
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
						<p className="text-sm font-medium">拖放 CSV 文件到此处，或点击浏览</p>
						<p className="text-xs text-muted-foreground">支持格式：.csv (逗号分隔值)</p>
					</div>
					{uploadMutation.isPending ? "上传中..." : "选择文件"}
				</button>

				{/* Upload Progress */}
				{uploadMutation.isPending && (
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm">
							<AlertCircle className="h-4 w-4 animate-spin" />
							正在上传翻译字典文件...
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
							{uploadMutation.data.success && (
								<div className="mt-2 text-xs space-y-1">
									{uploadMutation.data.valid_entries > 0 && (
										<p>有效条目：{uploadMutation.data.valid_entries}</p>
									)}
									{uploadMutation.data.invalid_entries > 0 && (
										<p>
											无效条目（已跳过）：
											{uploadMutation.data.invalid_entries}
										</p>
									)}
									{uploadMutation.data.available_languages.length > 0 && (
										<p>
											可用语言：
											{uploadMutation.data.available_languages
												.map((l) => l.toUpperCase())
												.join(", ")}
										</p>
									)}
								</div>
							)}
						</AlertDescription>
					</Alert>
				)}

				{/* Upload Error */}
				{uploadMutation.error && (
					<Alert className="border-red-200 bg-red-50">
						<XCircle className="h-4 w-4 text-red-600" />
						<AlertDescription className="text-red-800">
							上传失败：{uploadMutation.error.message}
						</AlertDescription>
					</Alert>
				)}
			</CardContent>
		</Card>
	);
}
