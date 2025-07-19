# Transcript Agent

AI-powered meeting transcript analysis and organization system built with VoltAgent. Designed for fast-moving startup teams using weekly kanban cadences.

## Features

- **🤖 AI-Powered Analysis**: Uses Claude/GPT-4 to intelligently classify and analyze meeting transcripts
- **📊 Weekly Summaries**: Generate comprehensive weekly reports for kanban-style planning
- **🎯 Smart Classification**: Automatically categorizes meetings (Strategic, Customer, Product, Operations)
- **👥 Relationship Tracking**: Extract people, companies, and business relationships
- **✅ Action Item Extraction**: Identify tasks, owners, and follow-ups
- **📈 Business Intelligence**: Track opportunities, risks, and customer feedback
- **🔄 Workflow Integration**: Designed for Monday planning → Wednesday check-ins → Friday retrospectives

## Quick Start

### 1. Installation

```bash
cd /Users/akamat/code/c_code/whisper/transcript_agent
npm install
```

### 2. Environment Setup

Create a `.env` file:
```bash
# Choose your preferred provider
OPENAI_API_KEY=your_openai_key_here
# OR
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### 3. Basic Usage

```bash
# Analyze all transcripts in a directory
npm run dev analyze /Users/akamat/Desktop/screen_recordings/transcripts

# Generate weekly summaries
npm run dev weekly ./analysis_output/master_analysis.json

# Organize files by category
npm run dev organize /Users/akamat/Desktop/screen_recordings/transcripts ./analysis_output/master_analysis.json
```

## Commands

### `analyze <transcript-dir>`
Analyzes all JSON transcript files in a directory.

**Options:**
- `-o, --output <dir>` - Output directory (default: `./analysis_output`)
- `-p, --provider <provider>` - LLM provider: `openai` or `anthropic` (default: `openai`)

**Example:**
```bash
npm run dev analyze /path/to/transcripts -o ./results -p anthropic
```

**Output:**
- Individual analysis files for each transcript
- `master_analysis.json` with all analyses
- `insights_report.md` with executive insights

### `weekly <analysis-file>`
Generates weekly summaries from analysis results.

**Options:**
- `-o, --output <dir>` - Output directory (default: `./weekly_reports`)
- `-p, --provider <provider>` - LLM provider (default: `openai`)

**Example:**
```bash
npm run dev weekly ./analysis_output/master_analysis.json -o ./weekly
```

**Output:**
- Individual weekly summary JSON files
- `executive_report.md` with comprehensive insights
- `latest_kanban_update.md` for team communication

### `single <file>`
Analyzes a single transcript file.

**Options:**
- `-o, --output <file>` - Output file path
- `-p, --provider <provider>` - LLM provider (default: `openai`)

**Example:**
```bash
npm run dev single ./transcript.json -o ./analysis.json
```

### `organize <transcript-dir> <analysis-file>`
Organizes transcript files into categorized folders based on analysis.

**Options:**
- `-o, --output <dir>` - Output directory (default: `./organized_transcripts`)

**Example:**
```bash
npm run dev organize /path/to/transcripts ./analysis_output/master_analysis.json
```

**Output Structure:**
```
organized_transcripts/
├── strategic/     # Company planning, alignment meetings
├── customer/      # Client calls, sales, design partner sessions
├── product/       # Engineering, development, technical discussions
├── operations/    # Standups, process, team coordination
└── summaries/     # Analysis files and reports
```

## Understanding the Analysis

### Meeting Categories

- **Strategic**: All-hands, company planning, goal-setting, quarterly reviews
- **Customer**: Client calls, sales demos, design partner feedback, customer support
- **Product**: Engineering discussions, feature planning, technical architecture
- **Operations**: Team standups, process discussions, retrospectives

### Analysis Output

Each transcript analysis includes:

```json
{
  "filename": "Recording at 2025-06-04 11.03.16.json",
  "date": "2025-06-04T11:03:16.000Z",
  "classification": {
    "category": "strategic", 
    "confidence": 0.92,
    "reasoning": "Company alignment discussion with 30/60/90 planning"
  },
  "summary": "Team alignment meeting discussing 30/60/90 plans...",
  "key_points": ["LLM development progress", "Customer feedback integration"],
  "decisions_made": ["Focus on drift analysis for next 30 days"],
  "action_items": [
    {
      "description": "Build LLM-based drift analysis tool",
      "assignee": "Matt",
      "priority": "high"
    }
  ],
  "participants": [
    {"name": "Matt", "role": "Engineering", "type": "team_member"}
  ],
  "companies_mentioned": ["Arkea", "Live Oak"],
  "opportunities": ["Six-figure customer starting Monday"],
  "sentiment": "positive"
}
```

### Weekly Summary Output

Weekly summaries provide:
- Accomplishments and milestones reached
- Customer interactions and business progress  
- Product development updates
- Team coordination highlights
- Action items and next steps
- Sentiment and productivity trends

## Advanced Usage

### Custom Prompts

The agents use sophisticated prompts tuned for startup environments. Key context includes:
- Weekly planning cadences (Monday/Wednesday/Friday)
- LLM/AI product focus
- Customer design partnerships
- Rapid iteration and customer feedback loops

### Provider Selection

**OpenAI (GPT-4):**
- Fast, reliable, good for high-volume processing
- Strong structured output capabilities
- Cost-effective for batch processing

**Anthropic (Claude 3.5 Sonnet):**
- Excellent reasoning and analysis quality
- Better at nuanced business intelligence
- Superior for complex relationship extraction

### Integration Ideas

**Slack Bot:**
```bash
# Weekly team update
npm run dev weekly ./analysis.json && cat ./weekly_reports/latest_kanban_update.md
```

**Automated Pipeline:**
```bash
#!/bin/bash
# Process new transcripts daily
npm run dev analyze /path/to/new/transcripts
npm run dev organize /path/to/transcripts ./analysis_output/master_analysis.json
npm run dev weekly ./analysis_output/master_analysis.json
```

**Business Intelligence:**
- Track customer sentiment over time
- Monitor product development velocity
- Identify team communication patterns
- Generate executive dashboards

## Troubleshooting

### Rate Limiting
The system includes automatic delays between API calls. For large batches:
- Use `anthropic` provider for fewer, higher-quality calls
- Process in smaller batches during off-peak hours
- Monitor API usage and costs

### Analysis Quality
- Ensure transcript files are complete (not truncated)
- Clean up obvious transcription errors manually for key meetings
- Review and adjust classification confidence thresholds if needed

### Environment Issues
```bash
# Verify your environment
node --version  # Should be 18+
npm list @voltagent/core  # Should be installed
echo $OPENAI_API_KEY  # Should be set
```

## Development

### Build
```bash
npm run build
```

### Adding Custom Analysis
Extend the schemas in `src/schemas.ts` and update the agent prompts in `src/transcript-agent.ts`.

### Custom Agents
Create new agent classes following the pattern in `src/weekly-agent.ts` for specialized analysis needs.

## File Structure

```
src/
├── index.ts           # CLI interface
├── schemas.ts         # Zod schemas for structured output
├── transcript-agent.ts # Main analysis agent
└── weekly-agent.ts    # Weekly summary generation
```

## Cost Optimization

**Typical Usage:**
- ~50 transcripts: $5-15 depending on provider and length
- Weekly summaries: $2-5 per week
- Single file analysis: $0.10-0.50 per file

**Cost Reduction:**
- Use `openai` provider for bulk processing
- Pre-filter or summarize very long transcripts
- Cache analysis results and avoid re-processing unchanged files

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the VoltAgent documentation: https://voltagent.dev/docs
3. Ensure API keys are properly configured
4. Verify input file formats match expected JSON structure
