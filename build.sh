#!/bin/bash
# Universal build script for whisper.cpp
# Automatically detects OS and runs appropriate build script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}┌────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│                   Whisper.cpp Builder                 │${NC}"
echo -e "${BLUE}│              Universal Build Script                   │${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────┘${NC}"
echo ""

# Detect operating system
detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # Check if it's Apple Silicon
    if [[ $(uname -m) == "arm64" ]]; then
      echo "macos-apple-silicon"
    else
      echo "macos-intel"
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Check specific Linux distribution
    if command -v pacman >/dev/null 2>&1; then
      echo "arch-linux"
    elif command -v apt >/dev/null 2>&1; then
      echo "ubuntu-debian"
    elif command -v dnf >/dev/null 2>&1; then
      echo "fedora-rhel"
    else
      echo "linux-generic"
    fi
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "windows"
  else
    echo "unknown"
  fi
}

OS=$(detect_os)

echo -e "${PURPLE}Detected OS:${NC} $OS"
echo ""

# Run appropriate build script
case $OS in
"macos-apple-silicon")
  echo -e "${GREEN}Running macOS Apple Silicon optimized build...${NC}"
  if [ -f "build-macos-apple-silicon.sh" ]; then
    chmod +x build-macos-apple-silicon.sh
    ./build-macos-apple-silicon.sh
  else
    echo -e "${RED}Error: build-macos-apple-silicon.sh not found!${NC}"
    exit 1
  fi
  ;;
"arch-linux")
  echo -e "${GREEN}Running Arch Linux optimized build...${NC}"
  if [ -f "build-arch-linux.sh" ]; then
    chmod +x build-arch-linux.sh
    ./build-arch-linux.sh
  else
    echo -e "${RED}Error: build-arch-linux.sh not found!${NC}"
    exit 1
  fi
  ;;
"ubuntu-debian")
  echo -e "${YELLOW}Ubuntu/Debian detected${NC}"
  echo "Creating Ubuntu/Debian build script based on Arch version..."
  # Create a quick Ubuntu version
  if [ -f "build-arch-linux.sh" ]; then
    sed 's/pacman -S --needed --noconfirm/apt-get update \&\& apt-get install -y/g; s/pacman -Qi/dpkg -l | grep -q/g' build-arch-linux.sh >build-ubuntu-debian.sh
    chmod +x build-ubuntu-debian.sh
    echo -e "${GREEN}Running Ubuntu/Debian build...${NC}"
    ./build-ubuntu-debian.sh
  else
    echo -e "${RED}Error: Cannot create Ubuntu build script${NC}"
    exit 1
  fi
  ;;
"macos-intel")
  echo -e "${YELLOW}macOS Intel detected${NC}"
  echo "Using Apple Silicon script (should work on Intel Macs too)"
  if [ -f "build-macos-apple-silicon.sh" ]; then
    chmod +x build-macos-apple-silicon.sh
    ./build-macos-apple-silicon.sh
  else
    echo -e "${RED}Error: build-macos-apple-silicon.sh not found!${NC}"
    exit 1
  fi
  ;;
"windows")
  echo -e "${YELLOW}Windows detected${NC}"
  echo -e "${RED}Windows build script not implemented yet${NC}"
  echo "Please use Windows Subsystem for Linux (WSL) or Visual Studio"
  echo "See: https://github.com/ggml-org/whisper.cpp#windows"
  echo "Also: PRs are welcome :)"
  exit 1
  ;;
"unknown" | *)
  echo -e "${RED}Unknown or unsupported operating system: $OSTYPE${NC}"
  echo ""
  echo "Available build scripts:"
  echo -e "${GREEN}Manual options:${NC}"
  if [ -f "build-macos-apple-silicon.sh" ]; then
    echo "  ./build-macos-apple-silicon.sh  - macOS with Apple Silicon (M1/M2/M3/M4)"
  fi
  if [ -f "build-arch-linux.sh" ]; then
    echo "  ./build-arch-linux.sh          - Arch Linux with optimizations"
  fi
  echo ""
  echo "Or create a custom build script for your system based on the existing ones."
  exit 1
  ;;
esac

echo ""
echo -e "${BLUE}┌────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│                     Build Complete!                   │${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Test your installation:"
echo "     ./build/bin/whisper-cli -f samples/jfk.wav"
echo ""
echo "  2. Download more models:"
echo "     ./models/download-ggml-model.sh <model-name>"
echo ""
echo "  3. Quantize existing models:"
echo "     ./quantize-model.sh"
echo ""
echo -e "${BLUE}Enjoy fast, offline speech recognition!${NC}"

