import { z } from 'zod';

// Core schemas for transcript analysis
export const TranscriptSchema = z.object({
  systeminfo: z.string(),
  model: z.object({
    type: z.string(),
    multilingual: z.boolean(),
    vocab: z.number(),
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

export const MeetingClassificationSchema = z.object({
  category: z.enum(['strategic', 'customer', 'product', 'operations']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  subcategory: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

export const ParticipantSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  company: z.string().optional(),
  type: z.enum(['team_member', 'customer', 'external', 'unknown']),
});

export const ActionItemSchema = z.object({
  description: z.string(),
  assignee: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']),
  context: z.string().optional(),
});

export const KeyTopicSchema = z.object({
  topic: z.string(),
  importance: z.number().min(0).max(1),
  category: z.string(),
  mentions: z.number(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
});

export const MeetingAnalysisSchema = z.object({
  // Basic metadata
  filename: z.string(),
  date: z.string(),
  duration_minutes: z.number(),

  // Classification
  classification: MeetingClassificationSchema,

  // Content analysis
  summary: z.string(),
  key_points: z.array(z.string()),
  decisions_made: z.array(z.string()),
  action_items: z.array(ActionItemSchema),

  // People and relationships
  participants: z.array(ParticipantSchema),
  companies_mentioned: z.array(z.string()),

  // Topics and themes
  key_topics: z.array(KeyTopicSchema),
  technical_topics: z.array(z.string()),

  // Business intelligence
  opportunities: z.array(z.string()),
  risks: z.array(z.string()),
  customer_feedback: z.array(z.string()),

  // Sentiment and tone
  overall_sentiment: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative']),
  energy_level: z.enum(['low', 'medium', 'high']),

  // Follow-up needs
  follow_up_required: z.boolean(),
  next_steps: z.array(z.string()),
  dependencies: z.array(z.string()),
});

export const WeeklySummarySchema = z.object({
  week_of: z.string(),
  total_meetings: z.number(),
  meeting_breakdown: z.object({
    strategic: z.number(),
    customer: z.number(),
    product: z.number(),
    operations: z.number(),
  }),

  // Accomplishments
  key_accomplishments: z.array(z.string()),
  decisions_made: z.array(z.string()),
  milestones_reached: z.array(z.string()),

  // Customer & Business
  customer_interactions: z.array(
    z.object({
      customer: z.string(),
      type: z.string(),
      outcome: z.string(),
    })
  ),
  revenue_activities: z.array(z.string()),
  opportunities_identified: z.array(z.string()),

  // Product & Technical
  product_progress: z.array(z.string()),
  technical_decisions: z.array(z.string()),
  blockers_resolved: z.array(z.string()),

  // Team & Operations
  team_highlights: z.array(z.string()),
  process_improvements: z.array(z.string()),
  upcoming_priorities: z.array(z.string()),

  // Action items
  completed_actions: z.array(z.string()),
  pending_actions: z.array(ActionItemSchema),
  overdue_actions: z.array(ActionItemSchema),

  // Insights
  sentiment_trend: z.string(),
  productivity_insights: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type TranscriptData = z.infer<typeof TranscriptSchema>;
export type MeetingClassification = z.infer<typeof MeetingClassificationSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type KeyTopic = z.infer<typeof KeyTopicSchema>;
export type MeetingAnalysis = z.infer<typeof MeetingAnalysisSchema>;
export type WeeklySummary = z.infer<typeof WeeklySummarySchema>;
