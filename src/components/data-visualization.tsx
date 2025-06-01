
"use client";

import React, { useMemo } from 'react';
import { LayoutDashboard, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useSettings } from '@/contexts/settings-context';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DataVisualizationProps {
  uploadedData: Record<string, any>[];
  dataFields: string[];
  currentDatasetIdentifier: string;
}

export function DataVisualization({ uploadedData, dataFields, currentDatasetIdentifier }: DataVisualizationProps) {
  const appSettings = useSettings();

  const canVisualize = useMemo(() => uploadedData.length > 0 && dataFields.length > 0, [uploadedData, dataFields]);

  // These are kept in case they are needed for other types of simple data display later,
  // or if the user decides to re-introduce a simplified chart.
  const numericFields = useMemo(() => {
    if (uploadedData.length === 0) return [];
    return dataFields.filter(field => {
      const firstNonEmptyValue = uploadedData.find(d => d[field] !== null && d[field] !== undefined && String(d[field]).trim() !== '')?.[field];
      if (firstNonEmptyValue === null || firstNonEmptyValue === undefined) return false;
      return typeof firstNonEmptyValue === 'number' || (typeof firstNonEmptyValue === 'string' && !isNaN(parseFloat(firstNonEmptyValue.replace(/,/g, ''))));
    });
  }, [uploadedData, dataFields]);

  const categoricalFields = useMemo(() => {
    if (uploadedData.length === 0) return [];
    return dataFields.filter(field => {
      if (numericFields.includes(field)) return false;
      const uniqueValues = new Set(uploadedData.map(d => d[field]));
      return uniqueValues.size <= 50 || typeof uploadedData.find(d => d[field] !== null && d[field] !== undefined)?.[field] === 'string';
    });
  }, [uploadedData, dataFields, numericFields]);


  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <LayoutDashboard className="text-primary" />
          Data Visualization Dashboard
        </CardTitle>
        <CardDescription className="break-words">
          Displaying data for {currentDatasetIdentifier ? `"${currentDatasetIdentifier}"` : "your data"}.
          Chart rendering capabilities have been removed from this section.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 min-h-[200px] flex flex-col justify-center">
        {!canVisualize && (
             <Alert variant="default" className="bg-accent/10 border-accent/30 my-6">
              <Info className="h-4 w-4 text-accent" />
              <AlertTitle className="text-accent">Data Required</AlertTitle>
              <AlertDescription>
                Please upload data in the 'Upload Data' section on the main page to enable visualization.
              </AlertDescription>
            </Alert>
        )}
        {canVisualize && (
           <div className="text-center text-muted-foreground p-10">
             <LayoutDashboard className="h-16 w-16 mx-auto mb-4 text-primary/50" />
             <p className="text-lg">Chart visualization features have been removed from this component.</p>
             <p className="text-sm">You can explore your data using the 'Explore Data' and 'Summarize Data' sections.</p>
           </div>
        )}
      </CardContent>
       <CardFooter className="pt-6 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Data visualization options are currently not available in this view.
        </p>
      </CardFooter>
    </Card>
  );
}
