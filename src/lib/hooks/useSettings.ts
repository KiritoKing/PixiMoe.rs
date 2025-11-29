import { useMutation, useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

// Types for backend responses
export interface ModelUploadResult {
	success: boolean;
	message: string;
	file_path?: string;
	calculated_hash?: string;
}

export interface ModelStatus {
	models_dir: string;
	model_file_exists: boolean;
	model_file_path: string;
	csv_file_exists: boolean;
	csv_file_path: string;
	label_map_loaded: boolean;
	model_session_loaded: boolean;
	label_map_error?: string;
	model_session_error?: string;
}

export interface InferenceConfig {
	general_threshold: number;
	character_threshold: number;
	general_mcut_enabled: boolean;
	character_mcut_enabled: boolean;
	max_tags: number;
}

// Hooks for model management
export function useUploadTagModel() {
	return useMutation({
		mutationFn: async (filePath: string): Promise<ModelUploadResult> => {
			const result = await invoke<ModelUploadResult>("upload_tag_model_file", {
				filePath,
			});
			return result;
		},
	});
}

export function useUploadLabelMap() {
	return useMutation({
		mutationFn: async (filePath: string): Promise<ModelUploadResult> => {
			const result = await invoke<ModelUploadResult>("upload_label_map_file", {
				filePath,
			});
			return result;
		},
	});
}

export function useModelStatus() {
	return useQuery({
		queryKey: ["model_status"],
		queryFn: async (): Promise<ModelStatus> => {
			const result = await invoke<ModelStatus>("get_model_status");
			return result;
		},
		refetchInterval: 5000, // Refetch every 5 seconds to check status
	});
}

export function useRemoveModelFiles() {
	return useMutation({
		mutationFn: async (): Promise<void> => {
			await invoke("remove_model_files");
		},
	});
}

// Hooks for inference configuration
export function useInferenceConfig() {
	return useQuery({
		queryKey: ["inference_config"],
		queryFn: async (): Promise<InferenceConfig> => {
			const result = await invoke<InferenceConfig>("get_inference_config");
			return result;
		},
	});
}

export function useSetInferenceConfig() {
	return useMutation({
		mutationFn: async (config: InferenceConfig): Promise<void> => {
			await invoke("set_inference_config", { config });
		},
	});
}

// Hooks for debugging - Enhanced types with visualization data
export interface PredictionDetail {
	name: string;
	confidence: number;
	category: string; // rating/general/character
	tag_id: number;
	index: number; // 在输出数组中的位置
}

export interface DebugPreprocessResult {
	original_size: [number, number];
	padded_size: [number, number];
	final_size: [number, number];
	preprocessing_steps: string[];
	// 新增：Base64编码的图片数据
	original_image_data?: string; // 原始图片
	padded_image_data?: string; // 填充后的图片
	preprocessed_image_data?: string; // 预处理后的图片
	success: boolean;
	error?: string;
}

export interface DebugInferenceResult {
	input_shape: number[];
	output_shape: number[];
	execution_time_ms: number;
	top_predictions: [string, number][]; // 保留向后兼容
	// 新增：扩展的预测数据
	all_predictions: PredictionDetail[]; // 所有预测详情
	confidence_distribution: number[]; // 置信度分布直方图
	success: boolean;
	error?: string;
}

export interface ThresholdAnalysis {
	tags_before_general_threshold: number;
	tags_after_general_threshold: number;
	tags_before_character_threshold: number;
	tags_after_character_threshold: number;
	mcut_effects?: MCutEffects;
}

export interface MCutEffects {
	general_mcut_threshold?: number;
	character_mcut_threshold?: number;
	general_tags_after_mcut: number;
	character_tags_after_mcut: number;
}

export interface FilteredTagDetail {
	name: string;
	confidence: number;
	category: string;
	filter_reason: string;
	original_rank: number;
	final_rank: number;
}

export interface CategorySummary {
	total_tags: number;
	rating_count: number;
	general_count: number;
	character_count: number;
	top_confidence: number;
	avg_confidence: number;
}

export interface DebugPostprocessResult {
	rating_predictions: [string, number][];
	general_predictions: [string, number][];
	character_predictions: [string, number][];
	final_tags: [string, number][];
	config_used: InferenceConfig;
	// 新增：过滤分析详情
	threshold_analysis: ThresholdAnalysis;
	filtered_tags_info: FilteredTagDetail[];
	category_summary: CategorySummary;
	success: boolean;
	error?: string;
}

export function useDebugModelPreprocess() {
	return useMutation({
		mutationFn: async (imagePath: string): Promise<DebugPreprocessResult> => {
			const result = await invoke<DebugPreprocessResult>("debug_model_preprocess", {
				imagePath,
			});
			return result;
		},
	});
}

export function useDebugModelInference() {
	return useMutation({
		mutationFn: async (imagePath: string): Promise<DebugInferenceResult> => {
			const result = await invoke<DebugInferenceResult>("debug_model_inference", {
				imagePath,
			});
			return result;
		},
	});
}

export function useDebugModelPostprocess() {
	return useMutation({
		mutationFn: async ({
			imagePath,
			config,
		}: {
			imagePath: string;
			config?: InferenceConfig;
		}): Promise<DebugPostprocessResult> => {
			const result = await invoke<DebugPostprocessResult>("debug_model_postprocess", {
				imagePath,
				config,
			});
			return result;
		},
	});
}

// Hook for file dialog
export function useFilePicker() {
	return {
		openFilePicker: async (filters?: string[]) => {
			const selected = await open({
				multiple: false,
				filters: filters
					? [
							{
								name: "Files",
								extensions: filters,
							},
						]
					: undefined,
			});

			return selected;
		},
	};
}
