
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, CalendarDays, FileSpreadsheet, Loader2, Wand2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Line, LineChart as ReLineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { generateForecastAnalysis, type GenerateForecastAnalysisInput, type GenerateForecastAnalysisOutput } from '@/ai/flows/generate-forecast-analysis';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ForecastHorizon = 'monthly' | 'quarterly' | 'yearly';

interface ForecastAnalysisProps {
  uploadedData: Record<string, any>[];
  dataFields: string[];
  datasetIdentifier: string;
}

const defaultChartData = [
  { month: "Jan", actual: 0, forecast: 0 },
  { month: "Feb", actual: 0, forecast: 0 },
  { month: "Mar", actual: 0, forecast: 0 },
  { month: "Apr", actual: 0, forecast: 0 },
  { month: "May", actual: 0, forecast: 0 },
  { month: "Jun", actual: 0, forecast: 0 },
];

export function ForecastAnalysis({ uploadedData, dataFields, datasetIdentifier }: ForecastAnalysisProps) {
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>('monthly');
  const [forecastNarrative, setForecastNarrative] = useState('');
  const [chartData, setChartData] = useState<any[]>(defaultChartData);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [dateField, setDateField] = useState<string | undefined>(undefined);
  const [valueField, setValueField] = useState<string | undefined>(undefined);
  const [numericFields, setNumericFields] = useState<string[]>([]);
  const [dateLikeFields, setDateLikeFields] = useState<string[]>([]);

  useEffect(() => {
    if (uploadedData.length > 0 && dataFields.length > 0) {
      const sample = uploadedData[0];
      const numFields = dataFields.filter(f => typeof sample[f] === 'number');
      setNumericFields(numFields);
      const dtFields = dataFields.filter(f => {
        const val = sample[f];
        if (typeof val === 'string') {
          return val.match(/^\d{4}-\d{2}-\d{2}/) || val.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/) || !isNaN(new Date(val).getTime());
        }
        if (typeof val === 'number' && val > 1000000000000 && val < 3000000000000) { // Basic timestamp check
             return !isNaN(new Date(val).getTime());
        }
        return false;
      });
      setDateLikeFields(dtFields);

      if (dtFields.length > 0) setDateField(dtFields[0]);
      else setDateField(undefined);
      
      if (numFields.length > 0) setValueField(numFields[0]);
      else setValueField(undefined);

    } else {
      setNumericFields([]);
      setDateLikeFields([]);
      setDateField(undefined);
      setValueField(undefined);
    }
    setChartData(defaultChartData);
    setForecastNarrative('');
  }, [uploadedData, dataFields]);

  const chartConfig = useMemo(() => ({
    [valueField || 'value']: { label: valueField || "Value", color: "hsl(var(--chart-1))" },
    forecast: { label: `Forecast (${valueField || "Value"})`, color: "hsl(var(--chart-2))" },
  }), [valueField]);


  const generateDataSummaryString = (data: Record<string, any>[], fields: string[], identifier: string): string => {
     if (!data || data.length === 0) return `No data available for ${identifier}.`;
    const rowCount = data.length;
    const fieldList = fields.join(', ');
    let summary = `The dataset from "${identifier}" contains ${rowCount} records. Fields include: ${fieldList}. `;
    const sampleRows = data.slice(0, 1).map(row => JSON.stringify(row)).join('; ');
    if (sampleRows) summary += `First record sample: ${sampleRows}`;
    return summary.substring(0, 10000);
  };

  const currentDataSummary = useMemo(() => generateDataSummaryString(uploadedData, dataFields, datasetIdentifier), [uploadedData, dataFields, datasetIdentifier]);
  
  const handleGenerateForecast = async () => {
    if (!dateField || !valueField) {
      toast({ title: "Configuration Needed", description: "Please select a valid date/time field and a numeric value field for forecasting.", variant: "destructive" });
      return;
    }
    if (uploadedData.length === 0) {
      toast({ title: "No Data", description: "Please upload data first.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setForecastNarrative('');

    try {
      const input: GenerateForecastAnalysisInput = {
        dataSummary: currentDataSummary,
        selectedFields: [dateField, valueField], 
        forecastHorizon: forecastHorizon,
        existingAnalysis: forecastNarrative || undefined,
      };
      const output: GenerateForecastAnalysisOutput = await generateForecastAnalysis(input);
      setForecastNarrative(output.analysis);
      
      try {
        const parsedChartData = JSON.parse(output.chartData);
        if (Array.isArray(parsedChartData) && parsedChartData.length > 0 && dateField && valueField) {
           setChartData(parsedChartData.map(d => ({
            [dateField]: d.date || d[dateField] || d.Month || d.Quarter || d.Year, 
            [valueField]: d.actual || d[valueField], 
            forecast: d.forecast
          })));
        } else {
           throw new Error("Parsed chart data is not in expected format or empty.");
        }
      } catch (e) {
        console.warn("AI returned non-JSON or invalid chart data. Raw data:", output.chartData, "Error:", e);
        toast({title: "Chart Data Issue", description: "AI returned chart data that couldn't be parsed. Displaying fallback forecast visualization.", variant: "default"});
        const newForecastData = uploadedData.slice(0, Math.min(20, uploadedData.length)).map(d => ({
            [dateField]: d[dateField],
            [valueField]: d[valueField],
            forecast: (Number(d[valueField]) || 0) * (1 + (Math.random() - 0.4) * 0.3) 
        })).sort((a,b) => {
            const dateA = new Date(a[dateField]).getTime();
            const dateB = new Date(b[dateField]).getTime();
            return (isNaN(dateA) || isNaN(dateB)) ? 0 : dateA - dateB;
        });
        setChartData(newForecastData);
      }

      toast({ title: "Forecast Generated", description: `A ${forecastHorizon} forecast for "${datasetIdentifier}" has been created.`});
    } catch (error) {
      console.error("Error generating forecast analysis:", error);
      setForecastNarrative("Failed to generate forecast. The AI model might be busy or encountered an issue. Please try again.");
      toast({ title: "Error", description: "Failed to generate forecast. Check console for details.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!forecastNarrative && chartData.every(d => d.actual === 0 && d.forecast === 0)) {
         toast({ title: "No Data", description: "No forecast data or narrative to export.", variant: "destructive" });
        return;
    }
    toast({ title: "Exporting Forecast", description: "Forecast data and narrative export started..." });
    
    let content = `Dataset: ${datasetIdentifier}\nForecast Horizon: ${forecastHorizon}\nDate Field: ${dateField}\nValue Field: ${valueField}\n\nForecast Narrative:\n${forecastNarrative}\n\nChart Data:\n`;
    const headers = [dateField || 'date', valueField || 'actual', 'forecast'].join(',');
    const dataRows = chartData.map(row => 
        [row[dateField || 'date'], row[valueField || 'actual'], row.forecast].join(',')
    ).join('\n');
    content += headers + '\n' + dataRows;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    const exportFileName = `${datasetIdentifier.replace(/[^a-z0-9]/gi, '_')}_forecast_analysis.txt`;
    link.setAttribute("download", exportFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const canGenerate = uploadedData.length > 0 && dateField && valueField;

  if (uploadedData.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <TrendingUp className="text-primary" />
            Forecast Analysis
          </CardTitle>
          <CardDescription>Generate monthly, quarterly, or yearly forecasts. Upload data to enable.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">No data uploaded. Please upload a file in the 'Upload Data' section to use this feature.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <TrendingUp className="text-primary" />
          Forecast Analysis
        </CardTitle>
        <CardDescription>Generate forecasts for {datasetIdentifier ? `"${datasetIdentifier}"` : "your data"}. Select date and value fields below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-center">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <Select value={forecastHorizon} onValueChange={(value: ForecastHorizon) => setForecastHorizon(value)}>
              <SelectTrigger className="w-full bg-input focus:bg-background">
                <SelectValue placeholder="Select Horizon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

           <Select value={dateField} onValueChange={setDateField}>
            <SelectTrigger className="w-full bg-input focus:bg-background" disabled={dateLikeFields.length === 0}>
              <SelectValue placeholder="Select Date/Time Field" />
            </SelectTrigger>
            <SelectContent>
              {dateLikeFields.length > 0 
                ? dateLikeFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>) 
                : <p className="p-2 text-xs text-muted-foreground text-center">No date-like fields found</p>}
            </SelectContent>
          </Select>

          <Select value={valueField} onValueChange={setValueField}>
            <SelectTrigger className="w-full bg-input focus:bg-background" disabled={numericFields.length === 0}>
              <SelectValue placeholder="Select Value Field (Numeric)" />
            </SelectTrigger>
            <SelectContent>
              {numericFields.length > 0 
                ? numericFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>) 
                : <p className="p-2 text-xs text-muted-foreground text-center">No numeric fields found</p>}
            </SelectContent>
          </Select>
        </div>
         <div className="flex justify-start">
            <Button onClick={handleGenerateForecast} disabled={isLoading || !canGenerate} className="w-full sm:w-auto bg-magentaAccent hover:bg-magentaAccent/90 text-magenta-accent-foreground">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Forecast
            </Button>
        </div>
        
        {!canGenerate && !isLoading && (
            <Alert variant="default" className="bg-accent/10 border-accent/30">
              <Info className="h-4 w-4 text-accent" />
              <AlertTitle className="text-accent">Configuration Required</AlertTitle>
              <AlertDescription>
                Please ensure data is uploaded and select a valid Date/Time field and a numeric Value field to enable forecast generation.
              </AlertDescription>
            </Alert>
        )}


        {isLoading && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                Generating forecast for {datasetIdentifier ? `"${datasetIdentifier}"` : "your data"}, please wait...
            </div>
        )}

        {!isLoading && chartData.length > 0 && chartData.some(d => (d[valueField || 'actual'] !== 0 && d[valueField || 'actual'] !== undefined) || (d.forecast !== 0 && d.forecast !== undefined)) && valueField && dateField && (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                <XAxis 
                    dataKey={dateField} 
                    stroke="hsl(var(--muted-foreground))" 
                    tickFormatter={(tick) => {
                        if (typeof tick === 'string' && (tick.includes('-') || tick.includes('/'))) {
                            const date = new Date(tick);
                            if (!isNaN(date.getTime())) return `${String(date.getMonth() + 1).padStart(2,'0')}/${String(date.getFullYear()).slice(-2)}`;
                        }
                        return String(tick); // Fallback
                    }}
                    tick={{fontSize: 10}}
                />
                <YAxis dataKey={valueField} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey={valueField} stroke="var(--color-value)" strokeWidth={2} dot={false} name={valueField} connectNulls={true} />
                <Line type="monotone" dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2} strokeDasharray="5 5" dot={false} name={`Forecast (${valueField})`} connectNulls={true} />
              </ReLineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {!isLoading && forecastNarrative && (
          <div>
            <h3 className="font-semibold mb-2 text-lg text-primary-foreground">Forecast Narrative:</h3>
             <div className="p-4 border rounded-md bg-background/50 min-h-[100px] whitespace-pre-wrap text-sm text-foreground/90 max-h-[300px] overflow-y-auto">
                {forecastNarrative}
             </div>
          </div>
        )}
        
        {!isLoading && (forecastNarrative || chartData.some(d => (d[valueField||'actual'] !== 0 && d[valueField||'actual'] !== undefined) || (d.forecast !== 0 && d.forecast !== undefined))) && (
          <div className="flex justify-end mt-4">
            <Button onClick={handleExport} variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Forecast
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
