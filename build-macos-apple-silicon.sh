#!/bin/bash
set -e

# Optimized build script for whisper.cpp on macOS with Apple Silicon (M1/M2/M3/M4)
# Includes Core ML support for Neural Engine acceleration

echo "=== Whisper.cpp Optimized Build for macOS Apple Silicon ==="
echo "Supports: M1, M2, M3, M4 chips with Core ML acceleration"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check brew package
check_brew_package() {
    if brew list "$1" &>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        return 1
    fi
}

echo "=== Checking Dependencies ==="

# Check for Homebrew
if ! command_exists brew; then
    echo -e "${RED}Homebrew is not installed!${NC}"
    echo "Install it from: https://brew.sh"
    exit 1
fi

# Check required packages
MISSING_DEPS=false
REQUIRED_PACKAGES="ffmpeg cmake ccache libomp"
PYTHON_VERSION="python@3.11"  # Updated to 3.11 as recommended

for pkg in $REQUIRED_PACKAGES $PYTHON_VERSION; do
    if ! check_brew_package "$pkg"; then
        MISSING_DEPS=true
    fi
done

if [ "$MISSING_DEPS" = true ]; then
    echo -e "\n${YELLOW}Installing missing dependencies...${NC}"
    brew install $REQUIRED_PACKAGES $PYTHON_VERSION
fi

echo -e "\n=== Setting up Python Environment ==="

# Check if venv exists
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3.11 -m venv .venv
fi

# Activate venv
source .venv/bin/activate

# Check Python dependencies
echo -e "\n${YELLOW}Installing Python dependencies for Core ML...${NC}"
.venv/bin/pip install --upgrade pip

# Install dependencies in correct order
.venv/bin/pip install "numpy<2"
.venv/bin/pip install ane_transformers
.venv/bin/pip install openai-whisper
.venv/bin/pip install coremltools

# Upgrade torch after ane_transformers (which installs torch 1.13.1)
echo -e "${YELLOW}Upgrading PyTorch...${NC}"
.venv/bin/pip install torch==2.1.0 torchvision==0.16.0 torchaudio==2.1.0

echo -e "\n=== Configuring Build ==="

# Clean previous builds
if [ -d "build" ]; then
    echo "Removing previous build directory..."
    rm -rf build
fi

# Get number of CPU threads
THREADS=$(sysctl -n hw.ncpu)
echo "Using $THREADS threads for compilation"

# Set OpenMP flags to avoid issues
export CMAKE_C_FLAGS="-Xpreprocessor -fopenmp -I$(brew --prefix libomp)/include"
export CMAKE_CXX_FLAGS="-Xpreprocessor -fopenmp -I$(brew --prefix libomp)/include"
export CMAKE_LDFLAGS="-L$(brew --prefix libomp)/lib -lomp"

# Configure with Core ML support
echo -e "\n${YELLOW}Configuring CMake with Core ML support...${NC}"
cmake -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DWHISPER_COREML=1 \
    -DWHISPER_METAL=1 \
    -DGGML_METAL=ON \
    -DGGML_ACCELERATE=ON \
    -DOpenMP_C_FLAGS="-Xclang -fopenmp" \
    -DOpenMP_CXX_FLAGS="-Xclang -fopenmp" \
    -DOpenMP_C_LIB_NAMES="omp" \
    -DOpenMP_CXX_LIB_NAMES="omp" \
    -DOpenMP_omp_LIBRARY="$(brew --prefix libomp)/lib/libomp.dylib"

echo -e "\n=== Building whisper.cpp ==="
cmake --build build -j${THREADS} --config Release

echo -e "\n=== Build Complete! ==="

# Model download and Core ML conversion
echo -e "\n${YELLOW}Would you like to download and prepare the large-v3-turbo model?${NC}"
echo "This includes:"
echo "  • Downloading the model"
echo "  • Converting to Core ML format for Neural Engine"
echo "  • Quantizing to Q5_1 format"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Download model
    echo -e "\n${YELLOW}Downloading large-v3-turbo model...${NC}"
    ./models/download-ggml-model.sh large-v3-turbo
    
    # Generate Core ML model
    if [ -f "models/ggml-large-v3-turbo.bin" ]; then
        echo -e "\n${YELLOW}Generating Core ML model for Neural Engine acceleration...${NC}"
        ./models/generate-coreml-model.sh large-v3-turbo
        
        # Quantize to Q5_1
        echo -e "\n${YELLOW}Quantizing model to Q5_1 format...${NC}"
        ./build/bin/quantize models/ggml-large-v3-turbo.bin models/ggml-large-v3-turbo-q5_1.bin q5_1
        
        if [ -f "models/ggml-large-v3-turbo-q5_1.bin" ]; then
            echo -e "${GREEN}✓${NC} Quantization complete!"
            echo -e "${GREEN}✓${NC} Original size: $(du -h models/ggml-large-v3-turbo.bin | cut -f1)"
            echo -e "${GREEN}✓${NC} Quantized size: $(du -h models/ggml-large-v3-turbo-q5_1.bin | cut -f1)"
            
            # Check if Core ML model was created
            if [ -d "models/ggml-large-v3-turbo-encoder.mlmodelc" ]; then
                echo -e "${GREEN}✓${NC} Core ML model created successfully"
                echo -e "${BLUE}Note: First run will be slower as Core ML compiles the model${NC}"
            fi
        fi
    fi
fi

# Deactivate Python environment
deactivate

echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo "Binaries are located in: ./build/bin/"
echo ""
echo "Example usage:"
echo "  # With Core ML acceleration (uses Neural Engine):"
echo "  ./build/bin/whisper-cli -m models/ggml-large-v3-turbo-q5_1.bin -f samples/jfk.wav"
echo ""
echo "  # Real-time transcription from microphone:"
echo "  ./build/bin/whisper-stream -m models/ggml-large-v3-turbo-q5_1.bin"
echo ""
echo "Performance tips:"
echo "  • Core ML models use the Neural Engine for 3x+ speedup"
echo "  • First run will be slower due to model compilation"
echo "  • Use Activity Monitor to see Neural Engine usage"
echo ""
echo "Additional models: ./models/download-ggml-model.sh <model-name>"