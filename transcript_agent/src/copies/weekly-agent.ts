import { Agent } from '@voltagent/core';
import { VercelAIProvider } from '@voltagent/vercel-ai'; // Handles communication
import { openai } from '@ai-sdk/openai'; // Defines the specific model source
import { anthropic } from '@ai-sdk/anthropic';
import { WeeklySummarySchema, type MeetingAnalysis, type WeeklySummary } from './schemas.js';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export class WeeklyReportAgent {
  private agent;

  constructor(provider: 'openai' | 'anthropic' = 'openai') {
    const llmProvider = new VercelAIProvider();
    const model = provider === 'openai' ? openai('gpt-4o') : anthropic('claude-3-5-sonnet-20240620');

    const agent = new Agent({
      name: 'Weekly Report Generator',
      instructions: `You are a weekly report specialist for a fast-moving startup team. Your role is to synthesize meeting data into actionable weekly insights that support the team's kanban-style workflow.

**Team Context:**
- Weekly cadence: Monday planning → Wednesday check-ins → Friday retrospectives
- Focus on LLM/AI product development
- Active customer design partnerships and sales pipeline
- Values rapid iteration, customer feedback, and team alignment

**Report Structure:**
Create comprehensive weekly summaries that help with:
1. **Celebrating Wins**: What the team accomplished this week
2. **Planning Ahead**: Priorities and focus areas for next week  
3. **Customer Intelligence**: Client interactions and opportunities
4. **Product Progress**: Development milestones and technical decisions
5. **Team Health**: Collaboration patterns and operational insights
6. **Action Items**: Clear next steps with owners and timelines

Make insights actionable, data-driven, and focused on what matters most for a startup's velocity and customer success.`,
      llm: llmProvider,
      model: model,
      markdown: true,
    });

    this.agent = agent;
  }

  groupByWeek(analyses: MeetingAnalysis[]): Map<string, MeetingAnalysis[]> {
    const weeklyGroups = new Map<string, MeetingAnalysis[]>();

    for (const analysis of analyses) {
      const date = new Date(analysis.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!weeklyGroups.has(weekKey)) {
        weeklyGroups.set(weekKey, []);
      }
      weeklyGroups.get(weekKey)!.push(analysis);
    }

    return weeklyGroups;
  }

  async generateWeeklySummary(weekAnalyses: MeetingAnalysis[], weekOf: string): Promise<WeeklySummary> {
    console.log(`📊 Generating weekly summary for week of ${weekOf} (${weekAnalyses.length} meetings)`);

    const prompt = `Generate a comprehensive weekly summary for the week of ${weekOf}.

**Meeting Data for This Week:**
${JSON.stringify(
  weekAnalyses.map((a) => ({
    date: a.date,
    category: a.classification.category,
    priority: a.classification.priority,
    summary: a.summary,
    key_points: a.key_points,
    decisions_made: a.decisions_made,
    action_items: a.action_items,
    participants: a.participants,
    companies_mentioned: a.companies_mentioned,
    key_topics: a.key_topics,
    opportunities: a.opportunities,
    risks: a.risks,
    customer_feedback: a.customer_feedback,
    sentiment: a.overall_sentiment,
    next_steps: a.next_steps,
  })),
  null,
  2
)}

**Analysis Requirements:**

1. **Meeting Breakdown**: Count meetings by category (strategic/customer/product/operations)

2. **Key Accomplishments**: Major wins, milestones, and completed deliverables mentioned across meetings

3. **Decisions Made**: Important decisions that will impact future work

4. **Customer & Business Activities**: 
   - Client interactions and outcomes
   - Revenue-related activities and deal progress
   - New opportunities identified

5. **Product & Technical Progress**:
   - Development milestones achieved
   - Technical decisions made
   - Blockers resolved

6. **Team & Operational Highlights**:
   - Team performance and collaboration wins
   - Process improvements implemented
   - Upcoming priorities identified

7. **Action Items Analysis**:
   - Actions completed this week
   - Current pending actions with priorities
   - Any overdue items that need attention

8. **Insights & Recommendations**:
   - Overall sentiment trend
   - Productivity observations
   - Specific recommendations for next week

Focus on actionable intelligence that helps with next week's planning and maintains momentum on key initiatives.`;

    const result = await this.agent.generateObject(prompt, WeeklySummarySchema);
    const summary = result.object;

    // Ensure week_of is set correctly
    summary.week_of = weekOf;
    summary.total_meetings = weekAnalyses.length;

    console.log(
      `✅ Weekly summary generated: ${summary.key_accomplishments.length} accomplishments, ${summary.pending_actions.length} pending actions`
    );

    return summary;
  }

  async generateAllWeeklySummaries(analyses: MeetingAnalysis[]): Promise<WeeklySummary[]> {
    const weeklyGroups = this.groupByWeek(analyses);
    const summaries: WeeklySummary[] = [];

    for (const [weekOf, weekAnalyses] of weeklyGroups.entries()) {
      try {
        const summary = await this.generateWeeklySummary(weekAnalyses, weekOf);
        summaries.push(summary);

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`❌ Failed to generate summary for week ${weekOf}:`, error);
      }
    }

    return summaries.sort((a, b) => a.week_of.localeCompare(b.week_of));
  }

  async generateExecutiveReport(summaries: WeeklySummary[]): Promise<string> {
    const prompt = `Create an executive report from these weekly summaries.

**Weekly Summary Data:**
${JSON.stringify(summaries, null, 2)}

**Executive Report Requirements:**

Generate a comprehensive report covering:

1. **Executive Summary**: High-level overview of the period covered

2. **Key Metrics & Trends**:
   - Meeting patterns and frequency
   - Team productivity indicators
   - Customer engagement trends
   - Product development velocity

3. **Major Accomplishments**:
   - Significant milestones achieved
   - Important decisions made
   - Customer wins and business progress

4. **Customer & Revenue Intelligence**:
   - Customer relationship health
   - Pipeline development
   - Opportunity progression
   - Feedback themes and insights

5. **Product & Technical Progress**:
   - Development milestones
   - Technical architecture decisions
   - Innovation and R&D advances

6. **Team & Operational Health**:
   - Team dynamics and sentiment trends
   - Process improvements
   - Collaboration effectiveness
   - Resource utilization

7. **Forward-Looking Insights**:
   - Emerging opportunities and risks
   - Strategic recommendations
   - Resource and priority suggestions
   - Process optimization opportunities

Format as a professional executive report with clear sections, bullet points, and actionable insights. Include specific data points and examples where relevant.`;

    const result = await this.agent.generateText(prompt);
    return result.text;
  }

  async generateKanbanUpdate(currentWeekSummary: WeeklySummary, previousWeekSummary?: WeeklySummary): Promise<string> {
    const prompt = `Generate a kanban-style team update based on weekly meeting analysis.

**This Week's Data:**
${JSON.stringify(currentWeekSummary, null, 2)}

${
  previousWeekSummary
    ? `**Previous Week's Data:**
${JSON.stringify(previousWeekSummary, null, 2)}`
    : ''
}

**Generate a team-focused update with:**

1. **🎉 What We Accomplished This Week**
   - Completed deliverables and milestones
   - Decisions made and problems solved
   - Customer wins and positive feedback

2. **🚀 What We're Working on Next Week**
   - Priority action items and their owners
   - Key meetings and customer interactions
   - Product development focuses

3. **⚠️ Blockers & Attention Needed**
   - Overdue action items
   - Dependencies requiring coordination
   - Risks that need mitigation

4. **📈 Customer & Business Updates**
   - Client interaction highlights
   - Pipeline developments
   - Opportunities to watch

5. **🔧 Process & Team Notes**
   - Collaboration highlights
   - Process improvements
   - Team sentiment and energy

Format for easy reading in team channels (Slack, etc.) with clear sections and actionable callouts.`;

    const result = await this.agent.generateText(prompt);
    return result.text;
  }
}
