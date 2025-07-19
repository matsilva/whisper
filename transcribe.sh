#!/usr/bin/env bash
# transcribe_m4a.sh – batch-convert .m4a recordings to Whisper JSON

set -euo pipefail

############################  CONFIG  #########################################
# `.env` values override the sensible defaults below.
# Required vars: MODEL_FILE (Whisper GGML/GGUF model path)
###############################################################################

ENV_FILE="$(dirname "$0")/.env"
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

INPUT_DIR="${INPUT_DIR:-$HOME/Desktop/screen_recordings/to_process}"
PROCESSED_DIR="${PROCESSED_DIR:-$HOME/Desktop/screen_recordings/processed}"
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/Desktop/screen_recordings/transcripts}"
MODEL_FILE="${MODEL_FILE:-$HOME/code/c_code/whisper/models/ggml-large-v3-turbo-q5_0.bin}"
THREADS="${THREADS:-1}"      # use >1 only if you call script with --threads N and have GNU parallel
###############################################################################

mkdir -p "$OUTPUT_DIR" "$PROCESSED_DIR"

transcribe() {
  local src="$1"
  local base="${src##*/}"
  base="${base%.*}"

  local wav="$INPUT_DIR/$base.wav"
  local out_json="$OUTPUT_DIR/$base.json"

  # Skip if transcript already exists
  [[ -f "$out_json" ]] && { echo "• skipped (exists)  $base"; return; }


  # //TODO: also support convert mp4 to wav
  # ffmpeg -i input.mp4 -vn -c:a copy output.wav

  # Convert → WAV
  if ffmpeg -loglevel error -y -i "$src" -ar 16000 -ac 1 "$wav"; then
    # Run Whisper
    if /Users/akamat/code/c_code/whisper/build/bin/whisper-cli \
        -m "$MODEL_FILE" "$wav" -oj -of "${out_json%.json}"; then
      echo "✓ transcribed        $base"
      mv -n -- "$src" "$PROCESSED_DIR/"
    else
      echo "✗ whisper failed     $base" >&2
    fi
  else
    echo "✗ ffmpeg failed      $base" >&2
  fi

  rm -f -- "$wav"
}

export -f transcribe
export INPUT_DIR PROCESSED_DIR OUTPUT_DIR MODEL_FILE

shopt -s nullglob
files=("$INPUT_DIR"/*.m4a)
shopt -u nullglob

if (( ${#files[@]} == 0 )); then
  echo "No .m4a files found in $INPUT_DIR"
  exit 0
fi

if (( THREADS > 1 )); then
  command -v parallel >/dev/null 2>&1 || { echo "Install GNU parallel or use THREADS=1"; exit 1; }
  parallel -j "$THREADS" transcribe ::: "${files[@]}"
else
  for f in "${files[@]}"; do transcribe "$f"; done
fi
