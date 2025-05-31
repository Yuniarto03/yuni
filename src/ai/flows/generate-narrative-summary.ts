// src/ai/flows/generate-narrative-summary.ts
'use server';

/**
 * @fileOverview Generates a narrative summary of uploaded data, highlighting key findings,
 * potential root causes, and possible solutions.
 *
 * - generateNarrativeSummary - A function that generates the narrative summary.
 * - GenerateNarrativeSummaryInput - The input type for the generateNarrativeSummary function.
 * - GenerateNarrativeSummaryOutput - The return type for the generateNarrativeSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNarrativeSummaryInputSchema = z.object({
  dataSummary: z
    .string()
    .describe(
      'A summary of the uploaded data, including key fields and their distributions.'
    ),
});

export type GenerateNarrativeSummaryInput = z.infer<typeof GenerateNarrativeSummaryInputSchema>;

const GenerateNarrativeSummaryOutputSchema = z.object({
  narrativeSummary: z
    .string()
    .describe(
      'A narrative summary of the data, including key findings, potential root causes, and possible solutions.'
    ),
});

export type GenerateNarrativeSummaryOutput = z.infer<typeof GenerateNarrativeSummaryOutputSchema>;

export async function generateNarrativeSummary(
  input: GenerateNarrativeSummaryInput
): Promise<GenerateNarrativeSummaryOutput> {
  return generateNarrativeSummaryFlow(input);
}

const narrativeSummaryPrompt = ai.definePrompt({
  name: 'narrativeSummaryPrompt',
  input: {schema: GenerateNarrativeSummaryInputSchema},
  output: {schema: GenerateNarrativeSummaryOutputSchema},
  prompt: `You are an expert data analyst tasked with summarizing datasets and providing insights.

  Based on the following data summary, generate a narrative summary highlighting key findings, potential root causes, and possible solutions.

  Data Summary:
  {{dataSummary}}

  Narrative Summary:
  `,
});

const generateNarrativeSummaryFlow = ai.defineFlow(
  {
    name: 'generateNarrativeSummaryFlow',
    inputSchema: GenerateNarrativeSummaryInputSchema,
    outputSchema: GenerateNarrativeSummaryOutputSchema,
  },
  async input => {
    const {output} = await narrativeSummaryPrompt(input);
    return output!;
  }
);
