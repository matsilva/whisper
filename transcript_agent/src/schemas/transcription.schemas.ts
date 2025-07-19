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
