// src/ai/flows/generate-narrative-summary.ts
'use server';

/**
 * @fileOverview Generates a narrative summary of uploaded data, highlighting key findings,
 * potential root causes, and possible solutions, presented in a structured format.
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
  narrativeSummary: z.string().describe('A general overview of the dataset.'),
  keyFindings: z.array(z.string()).describe('A list of key observations and findings, typically as bullet points.'),
  rootCauseAnalysis: z.string().describe('An analysis of potential root causes for the observed findings.'),
  suggestedSolutions: z.array(z.string()).describe('A list of actionable suggestions or next steps, typically as bullet points.')
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

Based on the following data summary, generate a comprehensive analysis. Please structure your response into the following distinct sections:

1.  **Narrative Summary**: Provide a concise general overview of the dataset and its main characteristics.
2.  **Key Findings**: List the most important observations and notable patterns discovered in the data. Present these as a list of distinct points/items.
3.  **Root Cause Analysis**: Based on the findings, discuss potential underlying reasons or root causes for these patterns or any identified issues.
4.  **Suggested Solutions / Next Steps**: Propose actionable recommendations, solutions, or next steps that could be taken based on the analysis. Present these as a list of distinct points/items.

Data Summary:
{{dataSummary}}

Ensure your output strictly follows this structure. For "Key Findings" and "Suggested Solutions / Next Steps", each point should be a separate item in the list that will be used to generate bullet points.
Do not use markdown for bullet points (e.g., '-' or '*') in the "Key Findings" and "Suggested Solutions / Next Steps" lists; just provide plain text for each item.
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
