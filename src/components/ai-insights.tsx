"use client";

import React, { useState } from 'react';
import { Brain, Wand2, Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateNarrativeSummary, type GenerateNarrativeSummaryInput, type GenerateNarrativeSummaryOutput } from '@/ai/flows/generate-narrative-summary';
import { useToast } from '@/hooks/use-toast';

export function AIInsights() {
  const [insights, setInsights] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // This would come from your uploaded data state
  const mockDataSummary = "The dataset contains customer information with fields like ID, Name, Email, City, Country, Sales amount, and Order Date. Sales are highest in USA and Japan. Most orders occur in Q2 and Q4. Potential issues might be low sales in European countries.";

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setInsights('');
    try {
      const input: GenerateNarrativeSummaryInput = { dataSummary: mockDataSummary };
      const output: GenerateNarrativeSummaryOutput = await generateNarrativeSummary(input);
      setInsights(output.narrativeSummary);
      toast({ title: "AI Insights Generated", description: "Narrative summary has been created."});
    } catch (error) {
      console.error("Error generating AI insights:", error);
      setInsights("Failed to generate insights. Please try again.");
      toast({ title: "Error", description: "Failed to generate AI insights.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExport = () => {
    toast({ title: "Exporting Insights", description: "AI insights export to text file started..." });
    // Placeholder for actual export logic (e.g., download as .txt or .md)
    const blob = new Blob([insights], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ai_insights.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    console.log("Exporting insights:", insights);
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Brain className="text-primary" />
          AI-Powered Insights
        </CardTitle>
        <CardDescription>
          Generate a narrative summary, key findings, root cause analysis, and potential solutions from your data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={handleGenerateInsights} disabled={isLoading} className="w-full sm:w-auto bg-magentaAccent hover:bg-magentaAccent/90 text-magenta-accent-foreground">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Generate Insights
          </Button>
          
          {isLoading && (
             <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                Generating insights, please wait...
            </div>
          )}

          {insights && !isLoading && (
            <div className="p-4 border rounded-md bg-background/50 min-h-[200px] whitespace-pre-wrap">
              <h3 className="font-semibold mb-2 text-lg text-primary-foreground">Narrative Summary:</h3>
              <p className="text-sm text-foreground/90">{insights}</p>
            </div>
          )}
          
          {insights && !isLoading && (
            <div className="flex justify-end">
              <Button onClick={handleExport} variant="outline">
                <FileText className="mr-2 h-4 w-4" /> Export Insights
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
