#!/bin/bash
set -e

# Optimized build script for whisper.cpp on Arch Linux
# For AMD Ryzen AI 9 HX 370 with AVX512 support

echo "=== Whisper.cpp Optimized Build for Arch Linux ==="
echo "CPU: AMD Ryzen AI 9 HX 370"
echo "Features: AVX2, AVX512, FMA, F16C"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a package is installed
check_package() {
    if pacman -Qi "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        return 1
    fi
}

# Function to install packages
install_deps() {
    echo -e "\n${YELLOW}Installing dependencies...${NC}"
    sudo pacman -S --needed --noconfirm \
        base-devel \
        cmake \
        openblas \
        lapack \
        ffmpeg \
        sdl2 \
        pkgconf
}

echo "=== Checking Dependencies ==="

# Check for required packages
MISSING_DEPS=false
for pkg in cmake make gcc openblas lapack; do
    if ! check_package "$pkg"; then
        MISSING_DEPS=true
    fi
done

# Optional but recommended
echo -e "\n${YELLOW}Optional dependencies:${NC}"
check_package "ffmpeg" || echo "  (Required for FFmpeg audio format support)"
check_package "sdl2" || echo "  (Required for real-time streaming examples)"

if [ "$MISSING_DEPS" = true ]; then
    echo -e "\n${YELLOW}Some dependencies are missing.${NC}"
    read -p "Would you like to install them? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_deps
    else
        echo -e "${RED}Build may fail without required dependencies!${NC}"
    fi
fi

echo -e "\n=== Configuring Build ==="

# Clean previous builds
if [ -d "build" ]; then
    echo "Removing previous build directory..."
    rm -rf build
fi

# Get number of CPU threads
THREADS=$(nproc)
echo "Using $THREADS threads for compilation"

# Configure with optimal flags for your CPU
echo -e "\n${YELLOW}Running CMake with optimizations...${NC}"
cmake -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_C_COMPILER=gcc \
    -DCMAKE_CXX_COMPILER=g++ \
    -DGGML_NATIVE=ON \
    -DGGML_AVX=ON \
    -DGGML_AVX2=ON \
    -DGGML_AVX512=ON \
    -DGGML_AVX512_VBMI=ON \
    -DGGML_AVX512_VNNI=ON \
    -DGGML_FMA=ON \
    -DGGML_F16C=ON \
    -DGGML_BLAS=ON \
    -DGGML_BLAS_VENDOR=OpenBLAS \
    -DGGML_OPENMP=ON \
    -DWHISPER_SDL2=ON \
    -DWHISPER_FFMPEG=ON \
    -DCMAKE_C_FLAGS="-march=native -mtune=native -O3 -pipe -fno-plt -fexceptions -Wp,-D_FORTIFY_SOURCE=2 -Wformat -Werror=format-security -fstack-clash-protection -fcf-protection" \
    -DCMAKE_CXX_FLAGS="-march=native -mtune=native -O3 -pipe -fno-plt -fexceptions -Wp,-D_FORTIFY_SOURCE=2 -Wformat -Werror=format-security -fstack-clash-protection -fcf-protection"

echo -e "\n=== Building whisper.cpp ==="
cmake --build build -j${THREADS} --config Release

echo -e "\n=== Build Complete! ==="

# Download and quantize large-v3-turbo model
echo -e "\n${YELLOW}Would you like to download and quantize the large-v3-turbo model?${NC}"
echo "The Q5_1 quantized version offers:"
echo "  • 50% smaller size (~1.5GB vs 3GB)"
echo "  • 20-30% faster inference"
echo "  • Minimal quality loss (~4%)"
read -p "Download and quantize model? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}Downloading large-v3-turbo model...${NC}"
    ./models/download-ggml-model.sh large-v3-turbo
    
    if [ -f "models/ggml-large-v3-turbo.bin" ]; then
        echo -e "\n${YELLOW}Quantizing model to Q5_1 format...${NC}"
        ./build/bin/quantize models/ggml-large-v3-turbo.bin models/ggml-large-v3-turbo-q5_1.bin q5_1
        
        if [ -f "models/ggml-large-v3-turbo-q5_1.bin" ]; then
            echo -e "${GREEN}✓${NC} Quantization complete!"
            echo -e "${GREEN}✓${NC} Original size: $(du -h models/ggml-large-v3-turbo.bin | cut -f1)"
            echo -e "${GREEN}✓${NC} Quantized size: $(du -h models/ggml-large-v3-turbo-q5_1.bin | cut -f1)"
            
            echo -e "\n${YELLOW}Would you like to remove the original model to save space?${NC}"
            read -p "Remove original model? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rm models/ggml-large-v3-turbo.bin
                echo -e "${GREEN}✓${NC} Original model removed"
            fi
        else
            echo -e "${RED}✗${NC} Quantization failed!"
        fi
    fi
fi

echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo "Binaries are located in: ./build/bin/"
echo ""
echo "Example usage:"
echo "  ./build/bin/whisper-cli -m models/ggml-large-v3-turbo-q5_1.bin -t ${THREADS} -f samples/jfk.wav"
echo ""
echo "For real-time transcription from microphone:"
echo "  ./build/bin/whisper-stream -m models/ggml-large-v3-turbo-q5_1.bin -t ${THREADS}"
echo ""
echo "Additional models can be downloaded with:"
echo "  ./models/download-ggml-model.sh <model-name>"
echo "  Available: tiny, base, small, medium, large-v1, large-v2, large-v3, large-v3-turbo"