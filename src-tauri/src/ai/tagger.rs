use crate::error::AppError;
use std::path::Path;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone)]
pub struct TagPrediction {
    pub name: String,
    pub confidence: f32,
}

// ============================================================================
// Image Classification - STUB IMPLEMENTATION
// ============================================================================

/// Classify an image and return predicted tags
/// 
/// NOTE: This is currently a stub implementation.
/// The full ONNX model integration requires:
/// 1. Downloading the model file (see models/README.md)
/// 2. Loading tag labels from CSV/JSON
/// 3. Properly configuring ONNX Runtime with the model
/// 
/// For v1.0, this returns empty results. AI tagging can be completed later.
pub async fn classify_image(_image_path: &Path) -> Result<Vec<TagPrediction>, AppError> {
    // Stub: Return empty predictions until model is properly integrated
    // TODO: Implement full ONNX inference pipeline as per design.md
    Ok(vec![])
}

/// Check if AI tagging is available
pub fn is_model_available() -> bool {
    // Stub: Always return false until model is integrated
    false
}
