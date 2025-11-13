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

### Downloading the Image Tagging Model

1. **Visit Hugging Face Model Page**:
   ```
   https://huggingface.co/SmilingWolf/wd-swinv2-tagger-v3
   ```

2. **Download Files**:
   - Click on "Files and versions" tab
   - Download `model.onnx` (~100MB)
   - Download `selected_tags.csv` (tag labels)

3. **Place in Models Directory**:
   ```bash
   cd src-tauri/models
   # Rename model.onnx to swin-v2-tagger-v3.onnx
   mv ~/Downloads/model.onnx ./swin-v2-tagger-v3.onnx
   cp ~/Downloads/selected_tags.csv ./selected_tags.csv
   ```

4. **Verify Files**:
   ```bash
   ls -lh src-tauri/models/
   # Should show:
   # swin-v2-tagger-v3.onnx (~100MB)
   # selected_tags.csv (~50KB)
   ```

### Alternative: Download via CLI

```bash
# Using huggingface-cli (install via: pip install huggingface-hub)
cd src-tauri/models
huggingface-cli download SmilingWolf/wd-swinv2-tagger-v3 model.onnx --local-dir .
huggingface-cli download SmilingWolf/wd-swinv2-tagger-v3 selected_tags.csv --local-dir .
mv model.onnx swin-v2-tagger-v3.onnx
```

### Important Notes

- Model files are **excluded from Git** (see `.gitignore`)
- Without the model, AI tagging will be **disabled** (app will still work for manual tagging)
- First run will be slow while ONNX Runtime initializes
- Model is loaded once at startup and cached in memory

## Performance Notes

Approximate inference times (reference hardware):

| Task | GPU (CUDA/CoreML) | CPU |
|------|------------------|-----|
| Image Tagging | 100-200ms | 500ms-1s |
| Face Detection | 50-100ms | 300-500ms |
| Face Embedding | 20-50ms per face | 100-200ms |

Actual performance varies by hardware and image resolution.
