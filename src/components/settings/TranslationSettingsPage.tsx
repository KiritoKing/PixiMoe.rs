import { Check, Globe, Languages, RefreshCw, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	useRefreshTranslations,
	useRemoveTranslationDictionary,
	useSetTranslationLanguage,
	useTranslationStatus,
} from "@/lib/hooks/useSettings";
import { cn } from "@/lib/utils";
import { TranslationDictionaryUploadArea } from "./TranslationDictionaryUploadArea";

const LANGUAGE_NAMES: Record<string, string> = {
	zh: "中文 (Chinese)",
	ja: "日本語 (Japanese)",
	ko: "한국어 (Korean)",
	es: "Español (Spanish)",
	fr: "Français (French)",
	de: "Deutsch (German)",
	ru: "Русский (Russian)",
	pt: "Português (Portuguese)",
	it: "Italiano (Italian)",
	ar: "العربية (Arabic)",
	vi: "Tiếng Việt (Vietnamese)",
	th: "ไทย (Thai)",
};

export function TranslationSettingsPage() {
	const { data: status } = useTranslationStatus();
	const setLanguageMutation = useSetTranslationLanguage();
	const removeMutation = useRemoveTranslationDictionary();
	const refreshMutation = useRefreshTranslations();

	const handleLanguageSelect = async (langCode: string) => {
		try {
			await setLanguageMutation.mutateAsync(langCode);
		} catch (error) {
			console.error("Failed to set language:", error);
		}
	};

	const handleRemoveDictionary = async () => {
		if (
			!confirm("确定要删除翻译字典吗？这将清除所有标签的翻译别名，但不会影响原始标签名称。")
		) {
			return;
		}

		try {
			await removeMutation.mutateAsync();
		} catch (error) {
			console.error("Failed to remove dictionary:", error);
		}
	};

	const handleRefresh = async () => {
		try {
			await refreshMutation.mutateAsync();
		} catch (error) {
			console.error("Failed to refresh translations:", error);
		}
	};

	const getLanguageName = (code: string) => {
		return LANGUAGE_NAMES[code] || code.toUpperCase();
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Languages className="h-6 w-6" />
					<h2 className="text-2xl font-bold">翻译设置 (Translation Settings)</h2>
				</div>
				<p className="text-muted-foreground">
					上传翻译字典文件以将标签显示为其他语言。翻译仅影响显示，不会改变数据库中的原始标签名称。
				</p>
			</div>

			{/* Current Status */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Globe className="h-5 w-5" />
						当前状态 (Current Status)
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium">字典状态</p>
							{status?.dictionary_loaded ? (
								<Badge variant="default" className="bg-green-600">
									已加载
								</Badge>
							) : (
								<Badge variant="secondary">未加载</Badge>
							)}
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium">当前语言</p>
							{status?.current_language ? (
								<Badge variant="outline">
									{getLanguageName(status.current_language)}
								</Badge>
							) : (
								<span className="text-sm text-muted-foreground">未选择</span>
							)}
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium">已翻译标签</p>
							<span className="text-sm font-semibold">
								{status?.total_translations || 0}
							</span>
						</div>
					</div>

					{status?.dictionary_path && (
						<div className="space-y-1">
							<p className="text-sm font-medium">字典文件路径</p>
							<p className="text-xs text-muted-foreground font-mono break-all">
								{status.dictionary_path}
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Language Selection */}
			{status?.dictionary_loaded && status.available_languages.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>选择显示语言 (Select Language)</CardTitle>
						<CardDescription>
							选择要显示的翻译语言。字典中包含 {status.available_languages.length}{" "}
							种语言。
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{status.available_languages.map((lang) => {
								const isSelected = status.current_language === lang;
								const isPending =
									setLanguageMutation.isPending &&
									setLanguageMutation.variables === lang;
								return (
									<Button
										key={lang}
										variant={isSelected ? "default" : "outline"}
										onClick={() => handleLanguageSelect(lang)}
										disabled={setLanguageMutation.isPending}
										className={cn(
											"justify-between gap-2",
											isSelected && "bg-primary text-primary-foreground"
										)}
									>
										<span className="truncate">{getLanguageName(lang)}</span>
										{isPending ? (
											<RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
										) : isSelected ? (
											<Check className="h-4 w-4 shrink-0" />
										) : null}
									</Button>
								);
							})}
						</div>

						{/* Refresh button */}
						{status.current_language && (
							<div className="pt-2 border-t">
								<Button
									variant="outline"
									size="sm"
									onClick={handleRefresh}
									disabled={refreshMutation.isPending}
								>
									{refreshMutation.isPending ? (
										<>
											<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
											刷新中...
										</>
									) : (
										<>
											<RefreshCw className="h-4 w-4 mr-2" />
											刷新翻译 (Refresh)
										</>
									)}
								</Button>
								<p className="text-xs text-muted-foreground mt-2">
									导入新图片后，可以点击刷新来为新标签应用翻译。
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Upload Dictionary */}
			<TranslationDictionaryUploadArea />

			{/* Remove Dictionary */}
			{status?.dictionary_loaded && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Trash2 className="h-5 w-5" />
							删除翻译字典 (Remove Dictionary)
						</CardTitle>
						<CardDescription>
							删除已上传的翻译字典并清除所有标签的翻译别名。此操作不会影响原始标签名称。
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							variant="destructive"
							onClick={handleRemoveDictionary}
							disabled={removeMutation.isPending}
						>
							{removeMutation.isPending ? (
								<>
									<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
									删除中...
								</>
							) : (
								<>
									<Trash2 className="h-4 w-4 mr-2" />
									删除翻译字典
								</>
							)}
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Information */}
			<Alert>
				<Globe className="h-4 w-4" />
				<AlertDescription>
					<p className="font-semibold mb-2">翻译字典格式说明：</p>
					<p className="text-sm mb-1">
						CSV 文件格式：
						<code className="bg-muted px-1 rounded">
							name,translated_name,language_code
						</code>
					</p>
					<p className="text-sm mb-1">
						• <code className="bg-muted px-1 rounded">name</code>: 原始标签名称（英文）
					</p>
					<p className="text-sm mb-1">
						• <code className="bg-muted px-1 rounded">translated_name</code>:
						翻译后的标签名称
					</p>
					<p className="text-sm">
						• <code className="bg-muted px-1 rounded">language_code</code>:
						语言代码（ISO 639-1，如 "zh", "ja"）
					</p>
					<p className="text-sm mt-2 text-muted-foreground">
						一个 CSV 文件可以包含多种语言的翻译。上传后选择要显示的语言即可应用翻译。
					</p>
				</AlertDescription>
			</Alert>
		</div>
	);
}
