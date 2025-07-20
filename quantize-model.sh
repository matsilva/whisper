#!/bin/bash
# Helper script to quantize whisper models to Q5_1 format

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Whisper Model Quantization Tool ===${NC}"
echo "Quantizes models to Q5_1 format for optimal performance"
echo ""

# Check if quantize binary exists
if [ ! -f "./build/bin/quantize" ]; then
    echo -e "${RED}Error: quantize binary not found!${NC}"
    echo "Please run ./build.sh first to build the project."
    echo "Or run the appropriate build script for your OS:"
    echo "  ./build-arch-linux.sh           (Arch Linux)"
    echo "  ./build-macos-apple-silicon.sh  (macOS M1/M2/M3/M4)"
    exit 1
fi

# Function to quantize a model
quantize_model() {
    local input_model="$1"
    local model_name=$(basename "$input_model" .bin)
    local output_model="${input_model%.bin}-q5_1.bin"
    
    if [ ! -f "$input_model" ]; then
        echo -e "${RED}Error: Model file not found: $input_model${NC}"
        return 1
    fi
    
    if [ -f "$output_model" ]; then
        echo -e "${YELLOW}Quantized model already exists: $output_model${NC}"
        read -p "Overwrite? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    echo -e "${YELLOW}Quantizing $model_name to Q5_1 format...${NC}"
    ./build/bin/quantize "$input_model" "$output_model" q5_1
    
    if [ $? -eq 0 ] && [ -f "$output_model" ]; then
        echo -e "${GREEN}✓ Quantization complete!${NC}"
        echo -e "  Original size:  $(du -h "$input_model" | cut -f1)"
        echo -e "  Quantized size: $(du -h "$output_model" | cut -f1)"
        echo -e "  Compression:    $(echo "scale=1; $(stat -c%s "$output_model") * 100 / $(stat -c%s "$input_model")" | bc)%"
        return 0
    else
        echo -e "${RED}✗ Quantization failed!${NC}"
        return 1
    fi
}

# If model path provided as argument
if [ $# -eq 1 ]; then
    quantize_model "$1"
    exit $?
fi

# Interactive mode - list available models
echo "Available models in ./models/:"
echo ""

models=($(find ./models -name "ggml-*.bin" ! -name "*-q[0-9]_[0-9].bin" 2>/dev/null | sort))

if [ ${#models[@]} -eq 0 ]; then
    echo -e "${RED}No models found in ./models/${NC}"
    echo "Download models first using:"
    echo "  ./models/download-ggml-model.sh <model-name>"
    exit 1
fi

# Display models with numbers
for i in "${!models[@]}"; do
    model_name=$(basename "${models[$i]}")
    size=$(du -h "${models[$i]}" | cut -f1)
    echo "  $((i+1)). $model_name ($size)"
done

echo ""
echo "  a. Quantize all models"
echo "  q. Quit"
echo ""

read -p "Select model to quantize (1-${#models[@]}/a/q): " choice

case $choice in
    [1-9]|[1-9][0-9])
        if [ "$choice" -le "${#models[@]}" ]; then
            quantize_model "${models[$((choice-1))]}"
        else
            echo -e "${RED}Invalid selection${NC}"
        fi
        ;;
    a|A)
        echo -e "\n${YELLOW}Quantizing all models...${NC}\n"
        for model in "${models[@]}"; do
            quantize_model "$model"
            echo ""
        done
        ;;
    q|Q)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid selection${NC}"
        exit 1
        ;;
esac

echo -e "\n${BLUE}=== Quantization Complete ===${NC}"
echo ""
echo "Tips:"
echo "• Q5_1 models offer ~50% size reduction with minimal quality loss"
echo "• Use quantized models for faster inference and lower memory usage"
echo "• Example: ./build/bin/whisper-cli -m models/ggml-large-v3-turbo-q5_1.bin -t $([ "$(uname)" = "Darwin" ] && sysctl -n hw.ncpu || nproc) -f audio.wav"