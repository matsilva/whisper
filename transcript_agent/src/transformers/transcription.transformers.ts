import { z } from 'zod';

// Your existing schemas
export const TranscriptSchema = z.object({
  systeminfo: z.string(),
  model: z.object({
    type: z.string(),
    multilingual: z.boolean(),
    vocab: z.number(),
    audio: z.object({
      ctx: z.number(),
      state: z.number(),
      head: z.number(),
      layer: z.number(),
    }),
    text: z.object({
      ctx: z.number(),
      state: z.number(),
      head: z.number(),
      layer: z.number(),
    }),
    mels: z.number(),
    ftype: z.number(),
  }),
  params: z.object({
    model: z.string(),
    language: z.string(),
    translate: z.boolean(),
  }),
  result: z.object({
    language: z.string(),
  }),
  transcription: z.array(
    z.object({
      timestamps: z.object({
        from: z.string(),
        to: z.string(),
      }),
      offsets: z.object({
        from: z.number(),
        to: z.number(),
      }),
      text: z.string(),
    })
  ),
});

export const TranscriptionObjectSchema = z.object({
  task: z.string(),
  language: z.string(),
  duration: z.number(),
  text: z.string(),
  segments: z.array(
    z.object({
      id: z.number(),
      seek: z.number(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
      tokens: z.array(z.number()),
      temperature: z.number(),
      avg_logprob: z.number(),
      compression_ratio: z.number(),
      no_speech_prob: z.number(),
    })
  ),
});

// Type inference
export type WhisperTranscript = z.infer<typeof TranscriptSchema>;
export type TranscriptionObject = z.infer<typeof TranscriptionObjectSchema>;

/**
 * Converts a Whisper transcript JSON to the standard transcription object format
 * @param whisperTranscript - The original Whisper transcript object
 * @returns TranscriptionObject in the target schema format
 */
export function convertWhisperToTranscriptionObject(whisperTranscript: WhisperTranscript): TranscriptionObject {
  // Parse timestamp string (HH:MM:SS,mmm) to seconds
  const parseTimestamp = (timestamp: string): number => {
    const [time, ms] = timestamp.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
  };

  // Calculate total duration from the last segment
  const lastSegment = whisperTranscript.transcription[whisperTranscript.transcription.length - 1];
  const duration = lastSegment ? parseTimestamp(lastSegment.timestamps.to) : 0;

  // Combine all text segments
  const fullText = whisperTranscript.transcription
    .map((segment) => segment.text.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Convert segments to the target format
  const segments = whisperTranscript.transcription.map((segment, index) => {
    const startTime = parseTimestamp(segment.timestamps.from);
    const endTime = parseTimestamp(segment.timestamps.to);
    const segmentDuration = endTime - startTime;
    const textLength = segment.text.trim().length;

    // Generate realistic-looking placeholder values for missing fields
    // These would normally come from the actual Whisper API response
    return {
      id: index,
      seek: segment.offsets.from, // Use millisecond offset as seek position
      start: startTime,
      end: endTime,
      text: segment.text.trim(),
      tokens: [], // stick with unknown for now
      temperature: 0.0, // Default temperature
      avg_logprob: estimateLogProb(segment.text), // Estimate based on text complexity
      compression_ratio: estimateCompressionRatio(segment.text), // Estimate compression
      no_speech_prob: estimateNoSpeechProb(segment.text), // Estimate speech confidence
    };
  });

  return {
    task: whisperTranscript.params.translate ? 'translate' : 'transcribe',
    language: whisperTranscript.result.language,
    duration,
    text: fullText,
    segments,
  };
}

/**
 * Generate approximate token array based on text content
 * This is a rough approximation since we don't have the actual tokens
 */
function generatePlaceholderTokens(text: string): number[] {
  // Rough approximation: ~4 characters per token for English
  const estimatedTokenCount = Math.max(1, Math.ceil(text.length / 4));

  // Generate placeholder token IDs (would be actual token IDs from model)
  return Array.from({ length: estimatedTokenCount }, (_, i) => {
    // Generate pseudo-random but deterministic token IDs based on text
    const charSum = text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return (charSum * 7 + i * 13) % 50000; // Keep within reasonable token ID range
  });
}

/**
 * Estimate average log probability based on text characteristics
 */
function estimateLogProb(text: string): number {
  const trimmedText = text.trim();

  if (trimmedText.length === 0) return -3.0;

  // Simple heuristic: shorter, common words have higher probability
  const wordCount = trimmedText.split(/\s+/).length;
  const avgWordLength = trimmedText.length / wordCount;

  // Estimate based on complexity indicators
  const hasNumbers = /\d/.test(trimmedText);
  const hasSpecialChars = /[^a-zA-Z0-9\s.,!?-]/.test(trimmedText);
  const isAllCaps = trimmedText === trimmedText.toUpperCase() && trimmedText.length > 3;

  let logProb = -0.5; // Base probability

  // Adjust based on text characteristics
  if (avgWordLength > 8) logProb -= 0.3; // Longer words are less common
  if (hasNumbers) logProb -= 0.2; // Numbers are less predictable
  if (hasSpecialChars) logProb -= 0.3; // Special characters reduce confidence
  if (isAllCaps) logProb -= 0.4; // All caps might indicate shouting/emphasis
  if (wordCount === 1 && trimmedText.length < 4) logProb += 0.2; // Short common words

  return Math.max(-4.0, Math.min(-0.1, logProb));
}

/**
 * Estimate compression ratio based on text repetitiveness
 */
function estimateCompressionRatio(text: string): number {
  const trimmedText = text.trim();

  if (trimmedText.length === 0) return 1.0;

  // Simple heuristic: measure text repetitiveness
  const words = trimmedText.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = words.length / uniqueWords.size;

  // Normal speech typically has compression ratio between 1.5-3.0
  // Higher repetition = higher compression ratio
  const baseRatio = 2.0;
  const adjustedRatio = baseRatio + (repetitionRatio - 1) * 0.5;

  return Math.max(1.0, Math.min(4.0, adjustedRatio));
}

/**
 * Estimate probability that segment contains no speech
 */
function estimateNoSpeechProb(text: string): number {
  const trimmedText = text.trim();

  // Empty or very short text suggests possible no-speech
  if (trimmedText.length === 0) return 0.8;
  if (trimmedText.length < 3) return 0.3;

  // Check for non-speech indicators
  const hasOnlyPunctuation = /^[.,!?\-\s]*$/.test(trimmedText);
  const hasManyRepeatedChars = /(.)\1{3,}/.test(trimmedText);
  const isVeryShort = trimmedText.length < 5;

  if (hasOnlyPunctuation) return 0.7;
  if (hasManyRepeatedChars) return 0.4;
  if (isVeryShort) return 0.2;

  // Normal speech should have very low no-speech probability
  return Math.max(0.0, Math.min(0.1, 0.05 - trimmedText.length * 0.001));
}

/**
 * Utility function to validate and convert a JSON file
 * @param jsonContent - Raw JSON content as string
 * @returns Converted TranscriptionObject
 */
export function convertWhisperJsonToTranscriptionObject(jsonContent: string): TranscriptionObject {
  try {
    const parsed = JSON.parse(jsonContent);
    const validated = TranscriptSchema.parse(parsed);
    return convertWhisperToTranscriptionObject(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid Whisper transcript format: ${error.message}`);
    }
    throw new Error(`Failed to parse JSON: ${error}`);
  }
}

/**
 * Batch convert multiple Whisper transcripts
 * @param whisperTranscripts - Array of Whisper transcript objects
 * @returns Array of converted TranscriptionObjects
 */
export function batchConvertWhisperTranscripts(whisperTranscripts: WhisperTranscript[]): TranscriptionObject[] {
  return whisperTranscripts.map(convertWhisperToTranscriptionObject);
}

// Example usage:
/*
import fs from 'fs';

// Convert a single file
const whisperJson = fs.readFileSync('transcript.json', 'utf-8');
const converted = convertWhisperJsonToTranscriptionObject(whisperJson);
console.log(converted);

// Convert from loaded object
const whisperData: WhisperTranscript = JSON.parse(whisperJson);
const validated = TranscriptSchema.parse(whisperData);
const result = convertWhisperToTranscriptionObject(validated);
*/
