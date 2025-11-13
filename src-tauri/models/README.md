# AI Models Directory

This directory contains ONNX models for AI-powered features.

## Required Models

### 1. Image Tagging
- **Model**: SmilingWolf/swin-v2-tagger-v3
- **File**: `swin-v2-tagger-v3.onnx`
- **Source**: [Hugging Face](https://huggingface.co/SmilingWolf/wd-swinv2-tagger-v3)
- **Purpose**: Generate Danbooru-style tags for images
- **Input**: 448x448 RGB image
- **Output**: Tag probabilities

### 2. Face Detection (Future)
- **Model**: SCRFD_10G_KPS
- **File**: `SCRFD_10G_KPS.onnx`
- **Source**: [InsightFace GitHub](https://github.com/deepinsight/insightface)
- **Purpose**: Detect faces and facial keypoints
- **Input**: Variable size RGB image
- **Output**: Bounding boxes + 5-point landmarks

### 3. Face Recognition (Future)
- **Model**: ArcFace (iResNet100)
- **File**: `iresnet100.onnx`
- **Source**: [InsightFace GitHub](https://github.com/deepinsight/insightface)
- **Purpose**: Extract 512-dimensional face embeddings
- **Input**: 112x112 RGB aligned face crop
- **Output**: 512-d embedding vector

## Setup Instructions

1. Download required models from sources above
2. Place `.onnx` files in this directory
3. Ensure files are named exactly as specified above
4. Model files are excluded from Git (see `.gitignore`)

## Performance Notes

Approximate inference times (reference hardware):

| Task | GPU (CUDA/CoreML) | CPU |
|------|------------------|-----|
| Image Tagging | 100-200ms | 500ms-1s |
| Face Detection | 50-100ms | 300-500ms |
| Face Embedding | 20-50ms per face | 100-200ms |

Actual performance varies by hardware and image resolution.
