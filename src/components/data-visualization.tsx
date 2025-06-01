
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
  datasetIdentifier: string;
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

export function DataVisualization({ uploadedData, dataFields, datasetIdentifier }: DataVisualizationProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisField, setXAxisField] = useState<string | undefined>(undefined);
  const [yAxisField, setYAxisField] = useState<string | undefined>(undefined);
  const [yAxisField2, setYAxisField2] = useState<string | undefined>(undefined); 
  const { toast } = useToast();

  const numericFields = useMemo(() => {
    if (uploadedData.length === 0) return [];
    return dataFields.filter(field => typeof uploadedData[0][field] === 'number' && uploadedData.every(d => typeof d[field] === 'number' || d[field] === null || d[field] === undefined));
  }, [uploadedData, dataFields]);

  const categoricalFields = useMemo(() => {
     if (uploadedData.length === 0) return [];
    return dataFields.filter(field => {
        if (numericFields.includes(field)) return false; 
        const uniqueValues = new Set(uploadedData.map(d => d[field]));
        return uniqueValues.size <= 50 || typeof uploadedData[0][field] === 'string'; 
    });
  }, [uploadedData, dataFields, numericFields]);

  const xAxisOptions = useMemo(() => {
     if (chartType === 'pie' || chartType === 'radar' ) return categoricalFields.length > 0 ? categoricalFields : dataFields.filter(f => !numericFields.includes(f));
     return dataFields; // All fields for general charts like bar, line, area, scatter
  }, [categoricalFields, dataFields, chartType, numericFields]);


  useEffect(() => {
    if (dataFields.length > 0) {
      setXAxisField(xAxisOptions[0] || dataFields[0]);
      setYAxisField(numericFields[0] || undefined);
      setYAxisField2(numericFields.filter(f => f !== (numericFields[0] || ""))[0] || undefined);
    } else {
      setXAxisField(undefined);
      setYAxisField(undefined);
      setYAxisField2(undefined);
    }
  }, [dataFields, numericFields, xAxisOptions]); 

  const chartConfig = useMemo(() => {
    const config: Record<string, {label: string, color: string}> = {};
    if (yAxisField) config[yAxisField] = { label: yAxisField.replace(/_/g, ' '), color: "hsl(var(--chart-1))" };
    if (yAxisField2 && yAxisField2 !== yAxisField) config[yAxisField2] = { label: yAxisField2.replace(/_/g, ' '), color: "hsl(var(--chart-2))" };
    return config;
  }, [yAxisField, yAxisField2]);

  const displayData = useMemo(() => {
    if (uploadedData.length === 0) return [];
    
    let processedData = uploadedData.map(item => {
        const newItem = {...item};
        if (xAxisField && typeof newItem[xAxisField] !== 'string') {
            newItem[xAxisField] = String(newItem[xAxisField]);
        }
        if (yAxisField && typeof newItem[yAxisField] !== 'number') {
             newItem[yAxisField] = parseFloat(String(newItem[yAxisField]));
        }
        if (yAxisField2 && typeof newItem[yAxisField2] !== 'number') {
            newItem[yAxisField2] = parseFloat(String(newItem[yAxisField2]));
        }
        return newItem;
    });

    if (chartType === 'pie' && xAxisField && yAxisField) {
        const aggregated: Record<string, number> = {};
        processedData.forEach(item => {
            const category = String(item[xAxisField]); 
            const value = item[yAxisField]; 
            if (!isNaN(value)) {
                aggregated[category] = (aggregated[category] || 0) + value;
            }
        });
        return Object.entries(aggregated).map(([name, value]) => ({ [xAxisField]: name, [yAxisField]: value })).slice(0,10); 
    }
    
    if (chartType === 'radar' && xAxisField && yAxisField) {
         const aggregated: Record<string, any> = {};
         processedData.forEach(item => {
            const category = String(item[xAxisField]);
             if (!aggregated[category]) aggregated[category] = { [xAxisField]: category };
             
             const val1 = item[yAxisField];
             if (yAxisField && !isNaN(val1)) {
                 aggregated[category][yAxisField] = (aggregated[category][yAxisField] || 0) + val1;
             }
             const val2 = item[yAxisField2];
             if (yAxisField2 && !isNaN(val2)) {
                 aggregated[category][yAxisField2] = (aggregated[category][yAxisField2] || 0) + val2;
             }
         });
         return Object.values(aggregated).slice(0, 8); 
    }
    
    return processedData.slice(0, 100); 
  }, [uploadedData, chartType, xAxisField, yAxisField, yAxisField2]);

  const canVisualize = uploadedData.length > 0 && dataFields.length > 0;

  const renderChartContent = () => {
    if (!canVisualize) {
      return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">No data uploaded. Please upload a CSV, XLS, or XLSX file in the 'Upload Data' section. Select the appropriate sheet in Excel files for visualization.</p>;
    }
    if (!xAxisField || !yAxisField || displayData.length === 0) {
      return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Please select valid X and Y axis fields. Ensure Y axis field is numeric. Chart data may be limited.</p>;
    }

    const commonXAxisProps = {
      dataKey: xAxisField,
      stroke: "hsl(var(--muted-foreground))",
      tick: { fontSize: 10 },
      interval: displayData.length > 20 ? 'preserveStartEnd' : 0,
      allowDuplicatedCategory: chartType !== 'bar' && chartType !== 'line' && chartType !== 'area', 
      name: xAxisField.replace(/_/g, ' '),
    };
    const commonYAxisProps = {
        stroke: "hsl(var(--muted-foreground))",
        tick: { fontSize: 10 },
        name: yAxisField.replace(/_/g, ' '),
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis {...commonXAxisProps} />
              <YAxis {...commonYAxisProps} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey={yAxisField} fill={`var(--color-${yAxisField})`} radius={4} name={yAxisField.replace(/_/g, ' ')} />
              {yAxisField2 && yAxisField2 !== yAxisField && <Bar dataKey={yAxisField2} fill={`var(--color-${yAxisField2})`} radius={4} name={yAxisField2.replace(/_/g, ' ')}/>}
            </ReBarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis {...commonXAxisProps} />
              <YAxis {...commonYAxisProps} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey={yAxisField} stroke={`var(--color-${yAxisField})`} name={yAxisField.replace(/_/g, ' ')} connectNulls={true}/>
              {yAxisField2 && yAxisField2 !== yAxisField && <Line type="monotone" dataKey={yAxisField2} stroke={`var(--color-${yAxisField2})`} name={yAxisField2.replace(/_/g, ' ')} connectNulls={true}/>}
            </ReLineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReAreaChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis {...commonXAxisProps} />
              <YAxis {...commonYAxisProps} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area type="monotone" dataKey={yAxisField} stroke={`var(--color-${yAxisField})`} fill={`var(--color-${yAxisField})`} fillOpacity={0.4} name={yAxisField.replace(/_/g, ' ')} connectNulls={true}/>
              {yAxisField2 && yAxisField2 !== yAxisField && <Area type="monotone" dataKey={yAxisField2} stroke={`var(--color-${yAxisField2})`} fill={`var(--color-${yAxisField2})`} fillOpacity={0.4} name={yAxisField2.replace(/_/g, ' ')} connectNulls={true}/>}
            </ReAreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={displayData} dataKey={yAxisField} nameKey={xAxisField} cx="50%" cy="50%" outerRadius={Math.min(120, window.innerHeight / 5) } fill={`var(--color-${yAxisField})`} labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} />
              <ChartLegend content={<ChartLegendContent wrapperStyle={{fontSize: '10px'}}/>} />
            </RePieChart>
          </ResponsiveContainer>
        );
      case 'scatter':
         if (!yAxisField2) return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Scatter plot requires a second numeric Y-axis field (Y-Axis 2).</p>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis type="category" {...commonXAxisProps} />
              <YAxis type="number" dataKey={yAxisField} {...commonYAxisProps}/>
              <YAxis yAxisId="right" type="number" dataKey={yAxisField2} name={yAxisField2.replace(/_/g, ' ')} orientation="right" stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}}/>
              <ChartTooltip content={<ChartTooltipContent />} cursor={{ strokeDasharray: '3 3' }}/>
              <ChartLegend content={<ChartLegendContent />} />
              <Scatter name={yAxisField.replace(/_/g, ' ')} data={displayData} fill={`var(--color-${yAxisField})`} />
              <Scatter yAxisId="right" name={yAxisField2.replace(/_/g, ' ')} data={displayData} fill={`var(--color-${yAxisField2})`} />
            </ReScatterChart>
          </ResponsiveContainer>
        );
      case 'radar':
         return (
          <ResponsiveContainer width="100%" height="100%">
            <ReRadarChart cx="50%" cy="50%" outerRadius="70%" data={displayData}> 
              <PolarGrid stroke="hsl(var(--border)/0.5)" />
              <PolarAngleAxis dataKey={xAxisField} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} name={xAxisField.replace(/_/g, ' ')}/>
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReRadar name={yAxisField.replace(/_/g, ' ')} dataKey={yAxisField} stroke={`var(--color-${yAxisField})`} fill={`var(--color-${yAxisField})`} fillOpacity={0.6} />
              {yAxisField2 && yAxisField2 !== yAxisField && <ReRadar name={yAxisField2.replace(/_/g, ' ')} dataKey={yAxisField2} stroke={`var(--color-${yAxisField2})`} fill={`var(--color-${yAxisField2})`} fillOpacity={0.6} />}
              <ChartLegend content={<ChartLegendContent />} />
            </ReRadarChart>
          </ResponsiveContainer>
        );
      default:
        return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Select a chart type to visualize data.</p>;
    }
  };

  const handleExport = () => {
     if (!canVisualize || displayData.length === 0) {
      toast({ title: "No Data", description: "No data to export for current chart configuration.", variant: "destructive" });
      return;
    }
    toast({ title: "Exporting Chart Data", description: "Chart data export to CSV started..." });
    
    const fieldsToExport = [xAxisField, yAxisField, yAxisField2].filter(Boolean) as string[];
    const headerRow = fieldsToExport.map(f => f.replace(/_/g, ' ')).join(',');
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
    const exportFileName = `${datasetIdentifier.replace(/[^a-z0-9]/gi, '_')}_${chartType}_chart_data.csv`;
    link.setAttribute("download", exportFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };


  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <BarChart3 className="text-primary" />
          Visualize Your Data
        </CardTitle>
        <CardDescription className="break-words">Select chart type and fields for {datasetIdentifier ? `"${datasetIdentifier}"` : "your data"}. Displaying up to 100 data points for most charts (less for Pie/Radar).</CardDescription>
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
          
          <Select value={xAxisField} onValueChange={setXAxisField} disabled={dataFields.length === 0}>
            <SelectTrigger className="w-full bg-input focus:bg-background">
              <SelectValue placeholder="Select X-Axis Field" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              { (xAxisOptions.length > 0 ? xAxisOptions : dataFields).map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)}
              {dataFields.length === 0 && <p className="p-2 text-xs text-muted-foreground text-center">No fields available</p>}
            </SelectContent>
          </Select>

          <Select value={yAxisField} onValueChange={setYAxisField} disabled={numericFields.length === 0 && dataFields.length === 0}>
            <SelectTrigger className="w-full bg-input focus:bg-background">
              <SelectValue placeholder="Select Y-Axis Field (Numeric)" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {numericFields.length > 0 
                ? numericFields.map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)
                : dataFields.length > 0 
                    ? <p className="p-2 text-xs text-muted-foreground text-center">No numeric fields found</p>
                    : <p className="p-2 text-xs text-muted-foreground text-center">No fields available</p>
              }
            </SelectContent>
          </Select>
          
          <Select 
            value={yAxisField2 || NO_FIELD_SELECTED_VALUE} 
            onValueChange={(value) => setYAxisField2(value === NO_FIELD_SELECTED_VALUE ? undefined : value)} 
            disabled={(chartType === 'pie') || (numericFields.filter(f => f !== yAxisField).length === 0 && dataFields.length === 0)}
          >
            <SelectTrigger className="w-full bg-input focus:bg-background">
              <SelectValue placeholder="Y-Axis 2 (Optional, Numeric)" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value={NO_FIELD_SELECTED_VALUE}>None</SelectItem>
              {numericFields.filter(f => f !== yAxisField).map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)}
               {(numericFields.filter(f => f !== yAxisField).length === 0 && dataFields.length > 0) && <p className="p-2 text-xs text-muted-foreground text-center">No other numeric fields</p>}
            </SelectContent>
          </Select>

        </div>
         <div className="flex justify-end">
            <Button 
                onClick={handleExport} 
                className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" 
                disabled={!canVisualize || displayData.length === 0 || !xAxisField || !yAxisField}
            >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Chart Data
            </Button>
        </div>

        {canVisualize && (!xAxisField || !yAxisField) && (
             <Alert variant="default" className="bg-accent/10 border-accent/30">
              <Info className="h-4 w-4 text-accent" />
              <AlertTitle className="text-accent">Configuration Required</AlertTitle>
              <AlertDescription>
                Please select an X-axis field and at least one numeric Y-axis field to display the chart.
              </AlertDescription>
            </Alert>
        )}

        <ChartContainer config={chartConfig} className="h-[450px] w-full">
          {renderChartContent()}
        </ChartContainer>

      </CardContent>
    </Card>
  );
}

