import { Agent, createTool } from '@voltagent/core';
import { VercelAIProvider } from '@voltagent/vercel-ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import {
  TranscriptSchema,
  MeetingAnalysisSchema,
  MeetingClassificationSchema,
  type TranscriptData,
  type MeetingAnalysis,
  type MeetingClassification,
} from './schemas.js';

export class TranscriptAnalysisAgent {
  private agent: Agent<typeof VercelAIProvider>;
  private classifierAgent: Agent<typeof VercelAIProvider>;

  constructor(provider: 'openai' | 'anthropic' = 'openai') {
    const llmProvider = new VercelAIProvider();
    const model = provider === 'openai' ? openai('gpt-4o') : anthropic('claude-3-5-sonnet-20240620');

    // Main analysis agent
    this.agent = new Agent({
      name: 'Transcript Analyzer',
      instructions: `You are an expert business analyst specializing in meeting transcript analysis for fast-moving startup teams. Your role is to:

1. Extract actionable insights from meeting transcripts
2. Identify key decisions, action items, and follow-ups
3. Track customer relationships and business opportunities
4. Monitor team dynamics and productivity patterns
5. Support weekly kanban-style planning processes

Context: This is for a startup team that:
- Uses weekly cadences (Monday planning, Wednesday check-ins, Friday retrospectives)
- Focuses on LLM/AI product development
- Has active customer design partnerships (Arkea, Live Oak, etc.)
- Values alignment, rapid iteration, and customer feedback

Be thorough but concise. Focus on actionable intelligence that helps with:
- Weekly planning and prioritization
- Customer relationship management
- Team coordination and alignment
- Product development decisions
- Business opportunity tracking`,
      llm: llmProvider,
      model: model,
      markdown: true,
    });

    // Specialized classifier agent
    this.classifierAgent = new Agent({
      name: 'Meeting Classifier',
      instructions: `You are a meeting classification specialist. Analyze meeting content and classify it into one of four categories:

**STRATEGIC**: Company-level planning, alignment, goal-setting, quarterly/annual planning, all-hands meetings, vision/mission discussions, major decisions

**CUSTOMER**: Any interaction with external customers, prospects, design partners, or clients. Sales calls, demos, feedback sessions, customer support, partnership discussions

**PRODUCT**: Technical development, engineering discussions, product planning, feature development, architecture decisions, QA processes, technical reviews, LLM/AI development

**OPERATIONS**: Internal team coordination, standups, process discussions, administrative meetings, team retrospectives, workflow optimization

Consider both explicit content and implicit context (timing, participants, tone) for accurate classification.`,
      llm: llmProvider,
      model: model,
    });
  }

  async loadTranscript(filePath: string): Promise<TranscriptData> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return TranscriptSchema.parse(data);
    } catch (error) {
      throw new Error(`Failed to load transcript ${filePath}: ${error}`);
    }
  }

  extractFullText(transcript: TranscriptData): string {
    return transcript.transcription
      .map((segment) => segment.text.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  parseFilenameDate(filename: string): Date {
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2} \d{2}\.\d{2}\.\d{2})/);
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/\./g, ':');
      return new Date(dateStr);
    }
    return new Date();
  }

  async classifyMeeting(text: string, filename: string): Promise<MeetingClassification> {
    const prompt = `Analyze this meeting transcript and classify it.

**Filename:** ${filename}
**Content Preview:** ${text.substring(0, 1000)}${text.length > 1000 ? '...' : ''}

Classify this meeting and provide reasoning for your decision.`;

    const result = await this.classifierAgent.generateObject(prompt, MeetingClassificationSchema);

    return result.object;
  }

  async analyzeTranscript(filePath: string): Promise<MeetingAnalysis> {
    console.log(`🔍 Analyzing transcript: ${path.basename(filePath)}`);

    // Load and parse transcript
    const transcript = await this.loadTranscript(filePath);
    const fullText = this.extractFullText(transcript);
    const filename = path.basename(filePath);
    const date = this.parseFilenameDate(filename);

    // First classify the meeting
    const classification = await this.classifyMeeting(fullText, filename);
    console.log(`📂 Classified as: ${classification.category} (${Math.round(classification.confidence * 100)}% confidence)`);

    // Now do comprehensive analysis
    const analysisPrompt = `Perform a comprehensive analysis of this meeting transcript.

**Meeting Details:**
- Filename: ${filename}
- Date: ${date.toISOString()}
- Category: ${classification.category}
- Duration: ~${Math.round(transcript.transcription.length / 2)} minutes

**Full Transcript:**
${fullText}

**Analysis Instructions:**
1. **Summary**: Create a concise but comprehensive summary (2-3 sentences)
2. **Key Points**: Extract the most important discussion points and outcomes
3. **Decisions Made**: Identify any explicit decisions or conclusions reached
4. **Action Items**: Find commitments, tasks, and follow-ups with owners when mentioned
5. **Participants**: Identify people mentioned and their likely roles/companies
6. **Companies**: Extract any company names or client references
7. **Topics**: Identify key themes and technical topics discussed
8. **Business Intelligence**: Note opportunities, risks, and customer feedback
9. **Sentiment**: Assess overall tone and energy level
10. **Next Steps**: Identify follow-up requirements and dependencies

Pay special attention to:
- Customer names and feedback (Arkea, Live Oak, etc.)
- Revenue discussions and deal progress
- Product development updates (LLM, AI features)
- Team coordination and alignment issues
- Technical decisions and architecture discussions
- Weekly planning elements (Monday goals, Wednesday progress, Friday retrospectives)`;

    const result = await this.agent.generateObject(analysisPrompt, MeetingAnalysisSchema);

    const analysis = result.object;

    // Add computed fields
    analysis.filename = filename;
    analysis.date = date.toISOString();
    analysis.duration_minutes = Math.round(transcript.transcription.length / 2);
    analysis.classification = classification;

    console.log(`✅ Analysis complete: ${analysis.summary.substring(0, 60)}...`);

    return analysis;
  }

  async batchAnalyze(transcriptDir: string, outputDir: string): Promise<MeetingAnalysis[]> {
    await fs.mkdir(outputDir, { recursive: true });

    const files = await fs.readdir(transcriptDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.includes('summary'));

    console.log(`📁 Found ${jsonFiles.length} transcript files to process`);

    const analyses: MeetingAnalysis[] = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(transcriptDir, file);
        const analysis = await this.analyzeTranscript(filePath);

        // Save individual analysis
        const outputFile = path.join(outputDir, `${path.parse(file).name}_analysis.json`);
        await fs.writeFile(outputFile, JSON.stringify(analysis, null, 2));

        analyses.push(analysis);

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to analyze ${file}:`, error);
      }
    }

    // Save master analysis file
    const masterFile = path.join(outputDir, 'master_analysis.json');
    await fs.writeFile(masterFile, JSON.stringify(analyses, null, 2));

    console.log(`🎉 Batch analysis complete! Processed ${analyses.length} files`);
    return analyses;
  }

  async generateInsights(analyses: MeetingAnalysis[]): Promise<string> {
    const prompt = `Generate executive insights from this collection of meeting analyses.

**Meeting Data:**
${JSON.stringify(
  analyses.map((a) => ({
    date: a.date,
    category: a.classification.category,
    summary: a.summary,
    participants: a.participants.map((p) => p.name),
    companies: a.companies_mentioned,
    sentiment: a.overall_sentiment,
    key_topics: a.key_topics.map((t) => t.topic),
  })),
  null,
  2
)}

**Generate insights covering:**
1. **Meeting Patterns**: Frequency, types, trends over time
2. **Team Dynamics**: Participation, sentiment, energy trends
3. **Customer Relationships**: Key accounts, feedback themes, opportunity pipeline
4. **Product Progress**: Development themes, technical decisions, blockers
5. **Business Intelligence**: Revenue activities, market insights, competitive intelligence
6. **Operational Health**: Process efficiency, communication patterns, alignment issues
7. **Weekly Cadence Analysis**: How well the team is executing Monday/Wednesday/Friday rhythm
8. **Recommendations**: Actionable suggestions for improvement

Format as a clear, executive-friendly report with specific examples and data points.`;

    const result = await this.agent.generateText(prompt);
    return result.text;
  }
}
