
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, PieChart as PieIcon, ScatterChart as ScatterIcon, Radar as RadarIcon, AreaChart as AreaIcon, LineChart as LineChartIcon, Settings2, FileSpreadsheet, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart as ReBarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart as ReLineChart, Pie, PieChart as RePieChart, Area, AreaChart as ReAreaChart, Scatter, ScatterChart as ReScatterChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadarChart as ReRadarChart, Radar as ReRadar } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'radar'; 

interface DataVisualizationProps {
  uploadedData: Record<string, any>[];
  dataFields: string[];
}

const chartIcons: Record<ChartType, React.ElementType> = {
  bar: BarChart3,
  line: LineChartIcon,
  area: AreaIcon,
  pie: PieIcon,
  scatter: ScatterIcon,
  radar: RadarIcon,
};

const NO_FIELD_SELECTED_VALUE = "__NONE_FIELD_SELECTION__";

export function DataVisualization({ uploadedData, dataFields }: DataVisualizationProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisField, setXAxisField] = useState<string | undefined>(undefined);
  const [yAxisField, setYAxisField] = useState<string | undefined>(undefined);
  const [yAxisField2, setYAxisField2] = useState<string | undefined>(undefined); // Optional second Y-axis field
  const { toast } = useToast();

  const numericFields = useMemo(() => {
    if (uploadedData.length === 0) return [];
    return dataFields.filter(field => typeof uploadedData[0][field] === 'number');
  }, [uploadedData, dataFields]);

  const categoricalFields = useMemo(() => {
     if (uploadedData.length === 0) return [];
    return dataFields.filter(field => {
        if (typeof uploadedData[0][field] === 'number' && uploadedData.every(d => typeof d[field] === 'number')) return false; 
        const uniqueValues = new Set(uploadedData.map(d => d[field]));
        return uniqueValues.size <= 50 || typeof uploadedData[0][field] === 'string'; 
    });
  }, [uploadedData, dataFields]);

  const xAxisOptions = useMemo(() => categoricalFields.length > 0 ? categoricalFields : dataFields, [categoricalFields, dataFields]);


  useEffect(() => {
    if (dataFields.length > 0) {
      setXAxisField(xAxisOptions[0] || dataFields[0]);
      setYAxisField(numericFields[0] || undefined);
      setYAxisField2(numericFields[1] || undefined);
    } else {
      setXAxisField(undefined);
      setYAxisField(undefined);
      setYAxisField2(undefined);
    }
  }, [dataFields, numericFields, xAxisOptions]);

  const chartConfig = useMemo(() => {
    const config: Record<string, {label: string, color: string}> = {};
    if (yAxisField) config[yAxisField] = { label: yAxisField, color: "hsl(var(--chart-1))" };
    if (yAxisField2 && yAxisField2 !== yAxisField) config[yAxisField2] = { label: yAxisField2, color: "hsl(var(--chart-2))" };
    return config;
  }, [yAxisField, yAxisField2]);

  const displayData = useMemo(() => {
    if (chartType === 'pie' && xAxisField && yAxisField && uploadedData.length > 0) {
        const aggregated: Record<string, number> = {};
        uploadedData.forEach(item => {
            const category = String(item[xAxisField]);
            const value = parseFloat(item[yAxisField]);
            if (!isNaN(value)) {
                aggregated[category] = (aggregated[category] || 0) + value;
            }
        });
        return Object.entries(aggregated).map(([name, value]) => ({ [xAxisField]: name, [yAxisField]: value })).slice(0,10);
    }
    return uploadedData.slice(0, 100); 
  }, [uploadedData, chartType, xAxisField, yAxisField]);


  const renderChart = () => {
    if (!xAxisField || !yAxisField || displayData.length === 0) {
      return <p className="text-muted-foreground text-center p-10">Please select valid X and Y axis fields. Ensure Y axis field is numeric.</p>;
    }

    switch (chartType) {
      case 'bar':
        return (
          <ReBarChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
            <XAxis dataKey={xAxisField} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} interval={displayData.length > 20 ? 'preserveStartEnd' : 0} />
            <YAxis stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey={yAxisField} fill={`var(--color-${yAxisField})`} radius={4} name={yAxisField} />
            {yAxisField2 && yAxisField2 !== yAxisField && <Bar dataKey={yAxisField2} fill={`var(--color-${yAxisField2})`} radius={4} name={yAxisField2}/>}
          </ReBarChart>
        );
      case 'line':
        return (
          <ReLineChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
            <XAxis dataKey={xAxisField} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} interval={displayData.length > 20 ? 'preserveStartEnd' : 0} />
            <YAxis stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line type="monotone" dataKey={yAxisField} stroke={`var(--color-${yAxisField})`} name={yAxisField}/>
            {yAxisField2 && yAxisField2 !== yAxisField && <Line type="monotone" dataKey={yAxisField2} stroke={`var(--color-${yAxisField2})`} name={yAxisField2}/>}
          </ReLineChart>
        );
      case 'area':
        return (
          <ReAreaChart data={displayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
            <XAxis dataKey={xAxisField} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} interval={displayData.length > 20 ? 'preserveStartEnd' : 0} />
            <YAxis stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area type="monotone" dataKey={yAxisField} stroke={`var(--color-${yAxisField})`} fill={`var(--color-${yAxisField})`} fillOpacity={0.4} name={yAxisField} />
            {yAxisField2 && yAxisField2 !== yAxisField && <Area type="monotone" dataKey={yAxisField2} stroke={`var(--color-${yAxisField2})`} fill={`var(--color-${yAxisField2})`} fillOpacity={0.4} name={yAxisField2} />}
          </ReAreaChart>
        );
      case 'pie':
        return (
          <RePieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie data={displayData} dataKey={yAxisField} nameKey={xAxisField} cx="50%" cy="50%" outerRadius={Math.min(120, window.innerHeight / 5) } fill={`var(--color-${yAxisField})`} labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} />
            <ChartLegend content={<ChartLegendContent wrapperStyle={{fontSize: '10px'}}/>} />
          </RePieChart>
        );
      case 'scatter':
         if (!yAxisField2) return <p className="text-muted-foreground text-center p-10">Scatter plot requires a second numeric Y-axis field (Y-Axis 2).</p>;
        return (
          <ReScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
             <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
            <XAxis type="category" dataKey={xAxisField} name={xAxisField} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} interval={displayData.length > 20 ? 'preserveStartEnd' : 0} />
            <YAxis type="number" dataKey={yAxisField} name={yAxisField} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}}/>
             {yAxisField2 && <YAxis yAxisId="right" type="number" dataKey={yAxisField2} name={yAxisField2} orientation="right" stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}}/>}
            <ChartTooltip content={<ChartTooltipContent />} cursor={{ strokeDasharray: '3 3' }}/>
            <ChartLegend content={<ChartLegendContent />} />
            <Scatter name={yAxisField} data={displayData} fill={`var(--color-${yAxisField})`} />
            {yAxisField2 && <Scatter yAxisId="right" name={yAxisField2} data={displayData} fill={`var(--color-${yAxisField2})`} />}
          </ReScatterChart>
        );
      case 'radar':
         if (!yAxisField2) return <p className="text-muted-foreground text-center p-10">Radar chart often benefits from a second Y-axis field for comparison (Y-Axis 2), or ensure your X-axis has multiple categories.</p>;
         return (
          <ReRadarChart cx="50%" cy="50%" outerRadius="70%" data={displayData.slice(0,6)}> 
            <PolarGrid stroke="hsl(var(--border)/0.5)" />
            <PolarAngleAxis dataKey={xAxisField} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReRadar name={yAxisField} dataKey={yAxisField} stroke={`var(--color-${yAxisField})`} fill={`var(--color-${yAxisField})`} fillOpacity={0.6} />
             {yAxisField2 && <ReRadar name={yAxisField2} dataKey={yAxisField2} stroke={`var(--color-${yAxisField2})`} fill={`var(--color-${yAxisField2})`} fillOpacity={0.6} />}
            <ChartLegend content={<ChartLegendContent />} />
          </ReRadarChart>
        );
      default:
        return <p>Select a chart type to visualize data.</p>;
    }
  };

  const handleExport = () => {
     if (displayData.length === 0) {
      toast({ title: "No Data", description: "No data to export for current chart configuration.", variant: "destructive" });
      return;
    }
    toast({ title: "Exporting Chart Data", description: "Chart data export to CSV started..." });
    
    const fieldsToExport = [xAxisField, yAxisField, yAxisField2].filter(Boolean) as string[];
    const headerRow = fieldsToExport.join(',');
    const dataRows = displayData.map(row => 
      fieldsToExport.map(field => {
        let value = row[field];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    );
    
    const csvContent = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `${chartType}_chart_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const canVisualize = uploadedData.length > 0 && dataFields.length > 0;

  if (!canVisualize) {
     return (
      <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
           <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <BarChart3 className="text-primary" />
            Visualize Your Data
          </CardTitle>
          <CardDescription>Create various charts from your data with customizable options.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">No data uploaded. Please upload a CSV, XLS, or XLSX file in the 'Upload Data' section to use this feature. CSV is recommended for best results.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <BarChart3 className="text-primary" />
          Visualize Your Data
        </CardTitle>
        <CardDescription>Select chart type and fields to visualize. Displaying up to 100 data points for performance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
          <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
            <SelectTrigger className="w-full bg-input focus:bg-background">
              <SelectValue placeholder="Select Chart Type" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(chartIcons) as ChartType[]).map(type => {
                const Icon = chartIcons[type];
                return (
                  <SelectItem key={type} value={type} className="capitalize">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" /> {type}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          <Select value={xAxisField} onValueChange={setXAxisField}>
            <SelectTrigger className="w-full bg-input focus:bg-background">
              <SelectValue placeholder="Select X-Axis Field" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {xAxisOptions.length > 0 
                ? xAxisOptions.map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)
                : <p className="p-2 text-xs text-muted-foreground text-center">No fields available</p>
              }
            </SelectContent>
          </Select>

          <Select value={yAxisField} onValueChange={setYAxisField}>
            <SelectTrigger className="w-full bg-input focus:bg-background">
              <SelectValue placeholder="Select Y-Axis Field (Numeric)" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {numericFields.length > 0 
                ? numericFields.map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)
                : <p className="p-2 text-xs text-muted-foreground text-center">No numeric fields found</p>
              }
            </SelectContent>
          </Select>
          
          <Select 
            value={yAxisField2 || NO_FIELD_SELECTED_VALUE} // Use special value if yAxisField2 is undefined
            onValueChange={(value) => setYAxisField2(value === NO_FIELD_SELECTED_VALUE ? undefined : value)} 
            disabled={chartType === 'pie'}
          >
            <SelectTrigger className="w-full bg-input focus:bg-background">
              <SelectValue placeholder="Y-Axis 2 (Optional, Numeric)" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value={NO_FIELD_SELECTED_VALUE}>None</SelectItem>
              {numericFields.filter(f => f !== yAxisField).map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)}
              {/* If numericFields is empty (excluding primary yAxisField), only "None" will effectively be shown */}
            </SelectContent>
          </Select>

        </div>
         <div className="flex justify-end">
            <Button onClick={handleExport} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={displayData.length === 0}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Chart Data
            </Button>
        </div>

        {(!xAxisField || !yAxisField) && (
             <Alert variant="default" className="bg-accent/10 border-accent/30">
              <Info className="h-4 w-4 text-accent" />
              <AlertTitle className="text-accent">Configuration Required</AlertTitle>
              <AlertDescription>
                Please select an X-axis field and at least one numeric Y-axis field to display the chart.
              </AlertDescription>
            </Alert>
        )}

        <ChartContainer config={chartConfig} className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </ChartContainer>

      </CardContent>
    </Card>
  );
}

    
