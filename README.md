# Whisper.cpp Build Scripts Organization

This directory contains optimized build scripts for different operating systems and hardware configurations.

## Quick Start

**Just run the universal build script:**

```bash
./build.sh
```

It will automatically detect your OS and run the appropriate build script.

## Available Build Scripts

### 🚀 Universal Build Script

- **`build.sh`** - Automatically detects OS and runs appropriate script
- Supports macOS, Linux (Arch, Ubuntu/Debian), and provides guidance for Windows

### 🍎 macOS Apple Silicon (M1/M2/M3/M4)

- **`build-macos-apple-silicon.sh`** - Optimized for Apple Silicon
- Features:
  - Core ML support for Neural Engine acceleration (3x+ speedup)
  - Metal GPU acceleration
  - Homebrew dependency management
  - Python environment setup for Core ML conversion
  - Automatic model quantization to Q5_1

### 🐧 Arch Linux

- **`build-arch-linux.sh`** - Optimized for Arch Linux
- Features:
  - AVX2/AVX512 CPU optimizations for AMD Ryzen AI 9 HX 370
  - OpenBLAS acceleration
  - Arch security hardening flags
  - FFmpeg and SDL2 support
  - Automatic model quantization to Q5_1

## Utility Scripts

### 📦 Model Quantization

- **`quantize-model.sh`** - Universal model quantization utility
- Interactive model selection
- Batch quantization support
- Cross-platform compatibility (macOS/Linux)

## Performance Optimizations by Platform

### macOS Apple Silicon

- **Core ML**: Uses Neural Engine for encoder (3x faster)
- **Metal**: GPU acceleration for matrix operations
- **Accelerate**: Optimized BLAS operations
- **Q5_1 Quantization**: 50% size reduction, minimal quality loss

### Arch Linux (AMD Ryzen AI)

- **AVX512**: Advanced vector instructions
- **OpenBLAS**: Optimized linear algebra
- **OpenMP**: Multi-threading across 24 cores
- **Native CPU flags**: Hardware-specific optimizations

## Model Recommendations

### For Quality (Large models recommended)

- **large-v3-turbo**: Best balance of speed/quality
- **large-v3**: Highest quality

### For Speed (Smaller models)

- **medium**: Good balance for most use cases
- **small**: Real-time capable
- **base**: Very fast, acceptable quality

### Quantization Options

- **Q5_1**: Recommended (50% smaller, 4% quality loss)
- **Q8_0**: Minimal quality loss (30% smaller)
- **Q4_0**: Maximum compression (65% smaller, noticeable quality loss)

## Usage Examples

### Basic Transcription

```bash
# Auto-detect best model
./build/bin/whisper-cli -f audio.wav

# Specify quantized model with all CPU threads
./build/bin/whisper-cli -m models/ggml-large-v3-turbo-q5_1.bin -t $(nproc) -f audio.wav
```

### Real-time Microphone

```bash
./build/bin/whisper-stream -m models/ggml-large-v3-turbo-q5_1.bin
```

### Batch Processing

```bash
# Process multiple files
for file in *.wav; do
    ./build/bin/whisper-cli -m models/ggml-large-v3-turbo-q5_1.bin -f "$file" -otxt
done
```

## File Organization

```
whisper.cpp/
├── build.sh                           # Universal build script (START HERE)
├── build-macos-apple-silicon.sh       # macOS M1/M2/M3/M4 optimized
├── build-arch-linux.sh               # Arch Linux optimized
├── quantize-model.sh                 # Model quantization utility
├── docs/
│   └── readme_cheatsheet.md          # Original Mac setup notes
└── README.md                         # This file
```

## Troubleshooting

### macOS Issues

- **"libomp not found"**: Run `brew install libomp`
- **Core ML compilation slow**: First run compiles model, subsequent runs are fast
- **Python issues**: Delete `.venv` folder and re-run build script

### Linux Issues

- **Missing dependencies**: Build script will prompt to install
- **Slow compilation**: Ensure using all CPU threads (`-t $(nproc)`)
- **Permission errors**: Make sure scripts are executable (`chmod +x`)

### General

- **Model not found**: Run `./models/download-ggml-model.sh <model-name>`
- **Out of memory**: Use smaller model or quantized version
- **Slow inference**: Check if using all CPU threads (`-t` flag)

## Contributing

To add support for new operating systems:

1. Create `build-<os-name>.sh` following existing patterns
2. Add detection logic to `build.sh`
3. Test on target platform
4. Update this documentation

