import { z } from 'zod';

import { PersonSchema } from './person.schemas';

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
export type TranscriptionObject = z.infer<typeof TranscriptionObjectSchema>;

// Simple base conversation entry - one per meeting
export const ConversationEntrySchema = z.object({
  // Core identifiers
  id: z.string(),
  created_at: z.string().datetime().optional(), // When the meeting happened
  processed_at: z.string().datetime().optional(), // When this entry was processed

  // Basic metadata
  filename: z.string().optional(),
  duration_minutes: z.number().optional(),

  // Content
  transcript: TranscriptionObjectSchema,

  // Simple classification (AI-enriched)
  category: z.enum(['strategic', 'customer', 'product', 'operations']).optional(),
  tags: z.array(z.string()).default([]),

  // Key extracted info
  summary: z.string().optional(),
  participants: z.array(PersonSchema).default([]),
  companies: z.array(z.string()).default([]),
  action_items: z.array(z.string()).default([]),

  // Processing status
  processing_status: z
    .enum([
      'raw', // Just converted from transcript, no AI processing
      'classified', // Basic classification (category, tags) complete
      'enriched', // Full enrichment (summary, participants, etc.) complete
      'validated', // Human-reviewed and validated
      'archived', // Finalized and archived
    ])
    .default('raw'),
});

export type ConversationEntry = z.infer<typeof ConversationEntrySchema>;
