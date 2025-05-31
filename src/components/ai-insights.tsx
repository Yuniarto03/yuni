
"use client";

import React, { useState, useMemo } from 'react';
import { Brain, Wand2, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateNarrativeSummary, type GenerateNarrativeSummaryInput, type GenerateNarrativeSummaryOutput } from '@/ai/flows/generate-narrative-summary';
import { useToast } from '@/hooks/use-toast';

interface AIInsightsProps {
  uploadedData: Record<string, any>[];
  dataFields: string[];
  datasetIdentifier: string; // e.g., "filename.xlsx (Sheet: Sheet1)"
}

export function AIInsights({ uploadedData, dataFields, datasetIdentifier }: AIInsightsProps) {
  const [insights, setInsights] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateDataSummaryString = (data: Record<string, any>[], fields: string[], identifier: string): string => {
    if (!data || data.length === 0) return `No data available for ${identifier}.`;
    const rowCount = data.length;
    const fieldList = fields.join(', ');
    
    let summary = `The dataset from "${identifier}" contains ${rowCount} records. `;
    if (fields.length > 0) {
      summary += `Fields include: ${fieldList}. `;
    }
    
    const sampleRows = data.slice(0, 2).map(row => {
      const rowSample: Record<string, any> = {};
      fields.slice(0, 5).forEach(field => { 
        rowSample[field] = row[field];
      });
      return JSON.stringify(rowSample);
    }).join('; ');

    if (sampleRows) {
      summary += `Sample of first few records (up to 5 fields shown): ${sampleRows}`;
    }
    return summary.substring(0, 10000); 
  };

  const currentDataSummary = useMemo(() => generateDataSummaryString(uploadedData, dataFields, datasetIdentifier), [uploadedData, dataFields, datasetIdentifier]);

  const handleGenerateInsights = async () => {
    if (uploadedData.length === 0) {
      toast({ title: "No Data", description: "Please upload data first to generate insights.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setInsights('');
    try {
      const input: GenerateNarrativeSummaryInput = { dataSummary: currentDataSummary };
      const output: GenerateNarrativeSummaryOutput = await generateNarrativeSummary(input);
      setInsights(output.narrativeSummary);
      toast({ title: "AI Insights Generated", description: `Narrative summary for "${datasetIdentifier}" has been created.`});
    } catch (error) {
      console.error("Error generating AI insights:", error);
      setInsights("Failed to generate insights. The AI model might be busy or the data summary could not be processed. Please try again.");
      toast({ title: "Error", description: "Failed to generate AI insights. Check console for details.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExport = () => {
    if (!insights) {
         toast({ title: "No Insights", description: "No insights available to export.", variant: "destructive" });
        return;
    }
    toast({ title: "Exporting Insights", description: "AI insights export to text file started..." });
    const blob = new Blob([`Dataset: ${datasetIdentifier}\nData Summary Used:\n${currentDataSummary}\n\nAI Insights:\n${insights}`], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const exportFileName = `${datasetIdentifier.replace(/[^a-z0-9]/gi, '_')}_ai_insights.txt`;
    link.download = exportFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const canGenerate = uploadedData.length > 0;

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Brain className="text-primary" />
          AI-Powered Insights
        </CardTitle>
        <CardDescription>
          Generate a narrative summary, key findings, root cause analysis, and potential solutions from {datasetIdentifier ? `"${datasetIdentifier}"` : "your data"}.
          {!canGenerate && " Please upload data first."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={handleGenerateInsights} 
            disabled={isLoading || !canGenerate} 
            className="w-full sm:w-auto bg-magentaAccent hover:bg-magentaAccent/90 text-magenta-accent-foreground"
          >
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
                Generating insights for {datasetIdentifier ? `"${datasetIdentifier}"` : "your data"}, please wait...
            </div>
          )}

          {insights && !isLoading && (
            <div className="p-4 border rounded-md bg-background/50 min-h-[200px] whitespace-pre-wrap overflow-y-auto max-h-[400px]">
              <h3 className="font-semibold mb-2 text-lg text-primary-foreground">Narrative Summary:</h3>
              <p className="text-sm text-foreground/90">{insights}</p>
            </div>
          )}
          
          {insights && !isLoading && (
            <div className="flex justify-end">
              <Button onClick={handleExport} variant="outline" disabled={!insights}>
                <FileText className="mr-2 h-4 w-4" /> Export Insights
              </Button>
            </div>
          )}

          {!canGenerate && !isLoading && (
             <p className="text-muted-foreground text-center py-4">Upload data in the 'Upload Data' section to enable AI insights.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
