"use client";

import React, { useState, useMemo } from 'react';
import { LineChart, TrendingUp, CalendarDays, Download, FileSpreadsheet, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart as ReLineChart, ResponsiveContainer } from 'recharts';
import { generateForecastAnalysis, type GenerateForecastAnalysisInput, type GenerateForecastAnalysisOutput } from '@/ai/flows/generate-forecast-analysis';
import { useToast } from '@/hooks/use-toast';

type ForecastHorizon = 'monthly' | 'quarterly' | 'yearly';

const initialChartData = [
  { month: "Jan", actual: 4000, forecast: 4200 },
  { month: "Feb", actual: 3000, forecast: 3100 },
  { month: "Mar", actual: 2000, forecast: 2200 },
  { month: "Apr", actual: 2780, forecast: 2900 },
  { month: "May", actual: 1890, forecast: 1950 },
  { month: "Jun", actual: 2390, forecast: 2500 },
];

const chartConfig = {
  actual: { label: "Actual Sales", color: "hsl(var(--chart-1))" },
  forecast: { label: "Forecasted Sales", color: "hsl(var(--chart-2))" },
};

export function ForecastAnalysis() {
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>('monthly');
  const [forecastNarrative, setForecastNarrative] = useState('');
  const [chartData, setChartData] = useState<any[]>(initialChartData);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // This would come from your uploaded data state and user selections
  const mockDataSummary = "Sales data for product X over the last 2 years, showing monthly sales figures.";
  const mockSelectedFields = ["Sales", "Order Date"];

  const handleGenerateForecast = async () => {
    setIsLoading(true);
    setForecastNarrative('');
    // setChartData([]); // Optionally clear previous chart data

    try {
      const input: GenerateForecastAnalysisInput = {
        dataSummary: mockDataSummary,
        selectedFields: mockSelectedFields,
        forecastHorizon: forecastHorizon,
      };
      const output: GenerateForecastAnalysisOutput = await generateForecastAnalysis(input);
      setForecastNarrative(output.analysis);
      
      // Attempt to parse chartData if it's a JSON string, otherwise use a default/mock.
      try {
        const parsedChartData = JSON.parse(output.chartData);
        setChartData(Array.isArray(parsedChartData) ? parsedChartData : initialChartData);
      } catch (e) {
        console.warn("AI returned non-JSON chart data, using placeholder. Raw data:", output.chartData);
        // Simulate new forecast data based on horizon for placeholder
        const newForecastData = initialChartData.map(d => ({
            ...d,
            forecast: d.forecast * (1 + (Math.random() - 0.5) * 0.2) // +/- 10% variation
        }));
        setChartData(newForecastData);
      }

      toast({ title: "Forecast Generated", description: `A ${forecastHorizon} forecast has been created.`});
    } catch (error) {
      console.error("Error generating forecast analysis:", error);
      setForecastNarrative("Failed to generate forecast. Please try again.");
      toast({ title: "Error", description: "Failed to generate forecast.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    toast({ title: "Exporting Forecast", description: "Forecast data and narrative export to Excel started..." });
    // Placeholder for actual export logic
    console.log("Exporting forecast narrative:", forecastNarrative, "and chart data:", chartData);
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <TrendingUp className="text-primary" />
          Forecast Analysis
        </CardTitle>
        <CardDescription>Generate monthly, quarterly, or yearly forecasts for your data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-muted-foreground" />
            <Select value={forecastHorizon} onValueChange={(value: ForecastHorizon) => setForecastHorizon(value)}>
              <SelectTrigger className="w-[180px] bg-input focus:bg-background">
                <SelectValue placeholder="Select Horizon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerateForecast} disabled={isLoading} className="w-full sm:w-auto bg-magentaAccent hover:bg-magentaAccent/90 text-magenta-accent-foreground">
             {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Generate Forecast
          </Button>
        </div>

        {isLoading && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                Generating forecast, please wait...
            </div>
        )}

        {!isLoading && chartData.length > 0 && (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </ReLineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {!isLoading && forecastNarrative && (
          <div>
            <h3 className="font-semibold mb-2 text-lg text-primary-foreground">Forecast Narrative:</h3>
             <div className="p-4 border rounded-md bg-background/50 min-h-[100px] whitespace-pre-wrap text-sm text-foreground/90">
                {forecastNarrative}
             </div>
          </div>
        )}
        
        {!isLoading && (forecastNarrative || chartData.length > 0) && (
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
