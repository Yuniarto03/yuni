// use server'
'use server';
/**
 * @fileOverview AI agent that generates forecast analyses (monthly, quarterly, yearly) based on the uploaded data and
 * displays the forecast visually with a chart.
 *
 * - generateForecastAnalysis - A function that generates forecast analyses.
 * - GenerateForecastAnalysisInput - The input type for the generateForecastAnalysis function.
 * - GenerateForecastAnalysisOutput - The return type for the generateForecastAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateForecastAnalysisInputSchema = z.object({
  dataSummary: z
    .string()
    .describe(
      'A summary of the dataset, including the fields and data types in the dataset.'
    ),
  selectedFields: z.array(z.string()).describe('The fields selected for the forecast analysis.'),
  forecastHorizon: z.enum(['monthly', 'quarterly', 'yearly']).describe('The forecast horizon.'),
  existingAnalysis: z.string().optional().describe('The existing analysis, if any.'),
});

export type GenerateForecastAnalysisInput = z.infer<typeof GenerateForecastAnalysisInputSchema>;

const GenerateForecastAnalysisOutputSchema = z.object({
  analysis: z.string().describe('The forecast analysis narrative.'),
  chartData: z.string().describe('The chart data for visualizing the forecast.'),
});

export type GenerateForecastAnalysisOutput = z.infer<typeof GenerateForecastAnalysisOutputSchema>;

export async function generateForecastAnalysis(
  input: GenerateForecastAnalysisInput
): Promise<GenerateForecastAnalysisOutput> {
  return generateForecastAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateForecastAnalysisPrompt',
  input: {schema: GenerateForecastAnalysisInputSchema},
  output: {schema: GenerateForecastAnalysisOutputSchema},
  prompt: `You are an expert data analyst specializing in time series forecasting.

You will analyze the provided dataset summary and generate a forecast analysis based on the selected fields and forecast horizon.  The analysis should include a narrative summary of the forecast, key findings, and potential implications.

Dataset Summary:
{{dataSummary}}

Selected Fields: {{selectedFields}}
Forecast Horizon: {{forecastHorizon}}

Existing Analysis (if any): {{existingAnalysis}}

Based on this information, generate a forecast analysis and provide the chart data to visualize the forecast.`,
});

const generateForecastAnalysisFlow = ai.defineFlow(
  {
    name: 'generateForecastAnalysisFlow',
    inputSchema: GenerateForecastAnalysisInputSchema,
    outputSchema: GenerateForecastAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
