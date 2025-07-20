# whisper.cpp M1/M2 Mac Setup Guide

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
```

2. Install dependencies:

```bash
brew install ffmpeg cmake ccache libomp python@3.9
```

3. Set up Python environment:

```bash
python3.9 -m venv .venv
source .venv/bin/activate
```

4. Install Python dependencies:

```bash
.venv/bin/pip install "numpy<2"
.venv/bin/pip install ane_transformers
.venv/bin/pip install openai-whisper
.venv/bin/pip install coremltools
```

Then install upgraded torch after isntall ane_transformers, which installs torch 1.13.1

```
.venv/bin/pip install torch==2.1.0 torchvision==0.16.0 torchaudio==2.1.0
```

6. Download and prepare models:

```bash
# Download base English model
sh ./models/download-ggml-model.sh base.en

# Build large-v3-turbo
make -j large-v3-turbo
```

7. Build the project:

```bash
cmake --build build --config Release
```

## Model Quantization (Optional)

To reduce model size and potentially improve performance:

```bash
# Quantize model with Q5_0 method
cmake -B build
cmake --build build --config Release
./build/bin/quantize models/ggml-base.en.bin models/ggml-base.en-q5_0.bin q5_0
# run the examples as usual, specifying the quantized model file
./build/bin/whisper-cli -m models/ggml-base.en-q5_0.bin ./samples/gb0.wav
```

## Generate CoreML model

```bash
# using CMake
./models/generate-coreml-model.sh base.en
./models/generate-coreml-model.sh large-v3-turbo
```

## Build whisper.cpp with Core ML support:

might help with libomp issues

```
export CMAKE_C_FLAGS="-Xpreprocessor -fopenmp -I$(brew --prefix libomp)/include"
export CMAKE_CXX_FLAGS="-Xpreprocessor -fopenmp -I$(brew --prefix libomp)/include"
export CMAKE_LDFLAGS="-L$(brew --prefix libomp)/lib -lomp"
```

```
# using CMake
cmake -B build -DWHISPER_COREML=1 \
  -DOpenMP_C_FLAGS="-Xclang -fopenmp" \
  -DOpenMP_CXX_FLAGS="-Xclang -fopenmp" \
  -DOpenMP_C_LIB_NAMES="omp" \
  -DOpenMP_CXX_LIB_NAMES="omp" \
  -DOpenMP_omp_LIBRARY="$(brew --prefix libomp)/lib/libomp.dylib"
cmake --build build -j --config Release
```

## Usage

Run transcription:

```bash
# Using standard model
./build/bin/whisper-cli -m models/ggml-base.en.bin ./samples/audio.wav

# Using quantized model
./build/bin/whisper-cli -m models/ggml-base.en-q5_0.bin ./samples/audio.wav
```

Note: First run with CoreML may be slower due to model compilation. Subsequent runs will be faster.
