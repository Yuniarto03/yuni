
"use client";

import React, { useState, useMemo } from 'react';
import { Brain, Wand2, FileText, Loader2, BookOpen, ListChecks, AlertTriangle, Wrench } from 'lucide-react';
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
  const [insights, setInsights] = useState<GenerateNarrativeSummaryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorOccurred, setErrorOccurred] = useState(false);
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
    setInsights(null);
    setErrorOccurred(false);
    try {
      const input: GenerateNarrativeSummaryInput = { dataSummary: currentDataSummary };
      const output: GenerateNarrativeSummaryOutput = await generateNarrativeSummary(input);
      setInsights(output);
      setErrorOccurred(false);
      toast({ title: "AI Insights Generated", description: `Analysis for "${datasetIdentifier}" has been created.`});
    } catch (error) {
      console.error("Error generating AI insights:", error);
      setErrorOccurred(true);
      setInsights(null);
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
    
    let exportContent = `Dataset: ${datasetIdentifier}\nData Summary Used:\n${currentDataSummary}\n\n`;

    if (insights.narrativeSummary) {
        exportContent += `Narrative Summary:\n${insights.narrativeSummary}\n\n`;
    }
    if (insights.keyFindings && insights.keyFindings.length > 0) {
        exportContent += `Key Findings:\n${insights.keyFindings.map(finding => `- ${finding}`).join('\n')}\n\n`;
    }
    if (insights.rootCauseAnalysis) {
        exportContent += `Root Cause Analysis:\n${insights.rootCauseAnalysis}\n\n`;
    }
    if (insights.suggestedSolutions && insights.suggestedSolutions.length > 0) {
        exportContent += `Suggested Solutions / Next Steps:\n${insights.suggestedSolutions.map(solution => `- ${solution}`).join('\n')}\n\n`;
    }

    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
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
          Generate a structured analysis including narrative summary, key findings, root cause analysis, and suggested solutions from {datasetIdentifier ? `"${datasetIdentifier}"` : "your data"}.
          {!canGenerate && " Please upload data first."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
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

          {!isLoading && errorOccurred && (
            <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
              <h3 className="font-semibold mb-2 text-lg flex items-center gap-2"><AlertTriangle /> Error Generating Insights</h3>
              <p className="text-sm">Failed to generate insights. The AI model might be busy or the data could not be processed. Please try again. If the issue persists, check the console for more details.</p>
            </div>
          )}

          {!isLoading && !errorOccurred && insights && (
            <div className="space-y-6 p-4 border rounded-md bg-background/50 min-h-[200px] text-sm">
              {insights.narrativeSummary && (
                <section>
                  <h3 className="font-semibold text-lg text-primary mb-2 flex items-center gap-2">
                    <BookOpen className="text-primary h-5 w-5" /> Narrative Summary
                  </h3>
                  <p className="text-foreground/90 whitespace-pre-wrap">{insights.narrativeSummary}</p>
                </section>
              )}

              {insights.keyFindings && insights.keyFindings.length > 0 && (
                <section>
                  <h3 className="font-semibold text-lg text-accent mb-2 flex items-center gap-2">
                    <ListChecks className="text-accent h-5 w-5" /> Key Findings
                  </h3>
                  <ul className="list-disc list-inside pl-2 space-y-1 text-foreground/90">
                    {insights.keyFindings.map((finding, index) => (
                      <li key={`finding-${index}`}>{finding}</li>
                    ))}
                  </ul>
                </section>
              )}

              {insights.rootCauseAnalysis && (
                <section>
                  <h3 className="font-semibold text-lg text-orange-500 mb-2 flex items-center gap-2">
                    <AlertTriangle className="text-orange-500 h-5 w-5" /> Root Cause Analysis
                  </h3>
                  <p className="text-foreground/90 whitespace-pre-wrap">{insights.rootCauseAnalysis}</p>
                </section>
              )}

              {insights.suggestedSolutions && insights.suggestedSolutions.length > 0 && (
                <section>
                  <h3 className="font-semibold text-lg text-green-500 mb-2 flex items-center gap-2">
                    <Wrench className="text-green-500 h-5 w-5" /> Suggested Solutions / Next Steps
                  </h3>
                  <ul className="list-disc list-inside pl-2 space-y-1 text-foreground/90">
                    {insights.suggestedSolutions.map((solution, index) => (
                      <li key={`solution-${index}`}>{solution}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
          
          {!isLoading && !errorOccurred && insights && (
            <div className="flex justify-end">
              <Button onClick={handleExport} variant="outline" disabled={!insights}>
                <FileText className="mr-2 h-4 w-4" /> Export Insights
              </Button>
            </div>
          )}

          {!isLoading && !errorOccurred && !insights && canGenerate && (
             <p className="text-muted-foreground text-center py-4">Click "Generate Insights" to analyze your data.</p>
          )}

          {!canGenerate && !isLoading && (
             <p className="text-muted-foreground text-center py-4">Upload data in the 'Upload Data' section to enable AI insights.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
