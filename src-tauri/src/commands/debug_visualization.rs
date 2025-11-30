use super::settings::{FilteredTagDetail, ThresholdAnalysis};
use crate::error::AppError;
use base64::{engine::general_purpose, Engine as _};
use image::{imageops, DynamicImage, GenericImage, GenericImageView, ImageFormat};
use std::path::Path;

/// 预处理阶段生成的图片数据
pub struct PreprocessImages {
	pub original: String,
	pub padded: String,
	pub preprocessed: String,
}

/// 生成预处理各阶段的图片数据，用于前端可视化
pub fn generate_preprocess_visualization(path: &Path) -> Result<PreprocessImages, AppError> {
	let original_img = image::open(path)?;

	// 生成原始图片的base64数据
	let original_base64 = image_to_base64(&original_img, ImageFormat::Jpeg, 90)?;

	// 获取原始图片尺寸
	let (width, height) = original_img.dimensions();
	let max_dim = std::cmp::max(width, height);

	// 生成填充后的图片（方形，白色背景）
	let mut padded_img = DynamicImage::new_rgb8(max_dim, max_dim);

	// 填充白色背景
	for y in 0..max_dim {
		for x in 0..max_dim {
			padded_img.put_pixel(x, y, image::Rgba([255, 255, 255, 255]));
		}
	}

	// 将原图居中放置在填充的背景上
	let offset_x = (max_dim - width) / 2;
	let offset_y = (max_dim - height) / 2;
	imageops::overlay(
		&mut padded_img,
		&original_img,
		offset_x as i64,
		offset_y as i64,
	);

	let padded_base64 = image_to_base64(&padded_img, ImageFormat::Jpeg, 90)?;

	// 生成预处理后的图片（448x448，RGB转BGR处理）
	let preprocessed_img = original_img.resize_exact(448, 448, imageops::FilterType::Lanczos3);

	// 模拟BGR转换（这里保持RGB，但说明转换过程）
	let preprocessed_base64 = image_to_base64(&preprocessed_img, ImageFormat::Jpeg, 85)?;

	Ok(PreprocessImages {
		original: original_base64,
		padded: padded_base64,
		preprocessed: preprocessed_base64,
	})
}

/// 将图片转换为base64字符串，用于前端显示
fn image_to_base64(
	img: &DynamicImage,
	format: ImageFormat,
	quality: u8,
) -> Result<String, AppError> {
	let mut buffer = Vec::new();

	match format {
		ImageFormat::Jpeg => {
			// 使用JPEG编码器以控制质量
			let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, quality);
			img.write_with_encoder(encoder)
				.map_err(|e| AppError::Custom(format!("Failed to encode JPEG: {e}")))?;
		}
		_ => {
			// 对于其他格式，使用默认编码
			img.write_to(&mut std::io::Cursor::new(&mut buffer), format)
				.map_err(|e| AppError::Custom(format!("Failed to encode image: {e}")))?;
		}
	}

	// 转换为base64字符串，并添加data URI前缀
	let base64_string = general_purpose::STANDARD.encode(&buffer);
	Ok(format!("data:image/jpeg;base64,{base64_string}"))
}

/// 生成置信度分布直方图数据
pub fn generate_confidence_histogram(predictions: &[(String, f32)], bins: usize) -> Vec<f32> {
	if predictions.is_empty() {
		return vec![0.0; bins];
	}

	let mut histogram = vec![0.0; bins];
	let bin_size = 1.0 / bins as f32;

	for (_, confidence) in predictions {
		let bin_index = ((confidence / bin_size) as usize).min(bins - 1);
		histogram[bin_index] += 1.0;
	}

	histogram
}

/// 分析阈值对标签过滤的影响
pub fn analyze_threshold_effects(
	all_predictions: &[(String, f32)],
	general_threshold: f32,
	character_threshold: f32,
	_mcut_enabled: bool,
	_label_map: &std::collections::HashMap<usize, (String, u32)>,
) -> ThresholdAnalysis {
	let tags_before_general = all_predictions.len();
	let tags_before_character = all_predictions.len();

	// 应用通用阈值过滤
	let mut filtered_by_general = Vec::new();
	for (tag, confidence) in all_predictions {
		if *confidence >= general_threshold {
			filtered_by_general.push((tag.clone(), *confidence));
		}
	}

	// 应用角色阈值过滤
	let mut filtered_by_character = Vec::new();
	for (tag, confidence) in &filtered_by_general {
		if *confidence >= character_threshold {
			filtered_by_character.push((tag.clone(), *confidence));
		}
	}

	let tags_after_general = filtered_by_general.len();
	let tags_after_character = filtered_by_character.len();

	ThresholdAnalysis {
		tags_before_general_threshold: tags_before_general,
		tags_after_general_threshold: tags_after_general,
		tags_before_character_threshold: tags_before_character,
		tags_after_character_threshold: tags_after_character,
		mcut_effects: None, // TODO: Implement MCut analysis if needed
	}
}

/// 生成详细的过滤标签信息
pub fn generate_filtered_tags_info(
	all_predictions: &[(String, f32)],
	final_tags: &[(String, f32)],
	general_threshold: f32,
	character_threshold: f32,
	label_map: &std::collections::HashMap<usize, (String, u32)>,
) -> Vec<FilteredTagDetail> {
	let mut filtered_info = Vec::new();

	// 为最终标签中的每个标签生成过滤详情
	for (final_index, (final_tag, final_confidence)) in final_tags.iter().enumerate() {
		// 查找原始排名
		let original_rank = all_predictions
			.iter()
			.position(|(tag, _)| tag == final_tag)
			.unwrap_or(999);

		let filter_reason = if *final_confidence < general_threshold {
			"below_general_threshold".to_string()
		} else if *final_confidence < character_threshold {
			"below_character_threshold".to_string()
		} else {
			"kept".to_string()
		};

		let category = label_map
			.iter()
			.find(|(_, (_, _cat_id))| {
				// 这里需要通过某种方式匹配标签到分类
				final_tag.contains("rating")
					|| final_tag.contains("general")
					|| final_tag.contains("character")
			})
			.map(|(_, (_, cat_id))| match cat_id {
				9 => "rating",
				0 => "general",
				4 => "character",
				_ => "other",
			})
			.unwrap_or("other");

		filtered_info.push(FilteredTagDetail {
			name: final_tag.clone(),
			confidence: *final_confidence,
			category: category.to_string(),
			filter_reason,
			original_rank,
			final_rank: final_index,
		});
	}

	filtered_info
}
