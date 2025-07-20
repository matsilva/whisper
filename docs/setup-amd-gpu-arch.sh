#!/bin/bash
# Optional: AMD GPU acceleration setup for Arch Linux
# For future use when ROCm support improves for RDNA3 iGPUs

echo "=== AMD GPU Acceleration Information ==="
echo ""
echo "Your AMD Radeon 890M (RDNA3) integrated GPU currently has limited acceleration support."
echo ""
echo "Future options to explore:"
echo ""
echo "1. Vulkan acceleration (experimental):"
echo "   sudo pacman -S vulkan-radeon vulkan-tools"
echo "   Then rebuild with: -DGGML_VULKAN=ON"
echo ""
echo "2. ROCm (when RDNA3 iGPU support improves):"
echo "   Check: https://github.com/ROCm/ROCm/issues"
echo "   Package: rocm-hip-sdk (AUR)"
echo ""
echo "3. OpenCL (limited performance):"
echo "   sudo pacman -S opencl-clover-mesa opencl-headers"
echo "   Then rebuild with: -DGGML_OPENCL=ON"
echo ""
echo "Currently, CPU optimization provides the best performance for your system."