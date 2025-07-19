import { Schema } from 'ai';
import { Agent } from '@voltagent/core';
import { VercelAIProvider } from '@voltagent/vercel-ai'; // Handles communication
import { openai } from '@ai-sdk/openai'; // Defines the specific model source
import { z } from 'zod';

//hard coding for the time being...
export const createAgent = <T>({
  name,
  instructions,
  outputSchema,
}: {
  name: string;
  instructions: string;
  outputSchema: z.Schema<T, z.ZodTypeDef, unknown> | Schema;
}) => {
  const model = openai('gpt-4o');
  const llm = new VercelAIProvider();
  const agent = new Agent({
    name: name,
    instructions: instructions,
    llm: llm,
    model: model,
    outputSchema: outputSchema,
  });
  return agent;
};
