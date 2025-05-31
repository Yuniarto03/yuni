
"use client";

import React, { useState, useMemo } from 'react';
import { BarChart3, PieChart, ScatterChart, Radar, AreaChart, LineChart as LineChartIcon, Settings2, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart as ReBarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Line, LineChart as ReLineChart, Pie, PieChart as RePieChart, Area, AreaChart as ReAreaChart, Scatter, ScatterChart as ReScatterChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadarChart as ReRadarChart, Radar as ReRadar } from 'recharts';
import { useToast } from '@/hooks/use-toast';

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'radar' | 'polar'; 

const mockData = [
  { name: 'Jan', uv: 400, pv: 240, amt: 240 },
  { name: 'Feb', uv: 300, pv: 139, amt: 221 },
  { name: 'Mar', uv: 200, pv: 980, amt: 229 },
  { name: 'Apr', uv: 278, pv: 390, amt: 200 },
  { name: 'May', uv: 189, pv: 480, amt: 218 },
  { name: 'Jun', uv: 239, pv: 380, amt: 250 },
];

const chartConfig = {
  uv: { label: "UV", color: "hsl(var(--chart-1))" },
  pv: { label: "PV", color: "hsl(var(--chart-2))" },
};

const chartIcons: Record<ChartType, React.ElementType> = {
  bar: BarChart3,
  line: LineChartIcon,
  area: AreaChart,
  pie: PieChart,
  scatter: ScatterChart,
  radar: Radar,
  polar: Radar, 
};

export function DataVisualization() {
  const [chartType, setChartType] = useState<ChartType>('bar');
  // Placeholder for axis and aggregation settings
  const [xAxisField, setXAxisField] = useState('name');
  const [yAxisField, setYAxisField] = useState('uv');
  const { toast } = useToast();

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ReBarChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
            <XAxis dataKey={xAxisField} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey={yAxisField} fill="var(--color-uv)" radius={4} />
            <Bar dataKey="pv" fill="var(--color-pv)" radius={4} />
          </ReBarChart>
        );
      case 'line':
        return (
          <ReLineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
            <XAxis dataKey={xAxisField} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line type="monotone" dataKey={yAxisField} stroke="var(--color-uv)" />
            <Line type="monotone" dataKey="pv" stroke="var(--color-pv)" />
          </ReLineChart>
        );
      case 'area':
        return (
          <ReAreaChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
            <XAxis dataKey={xAxisField} stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area type="monotone" dataKey={yAxisField} stroke="var(--color-uv)" fill="var(--color-uv)" fillOpacity={0.3} />
             <Area type="monotone" dataKey="pv" stroke="var(--color-pv)" fill="var(--color-pv)" fillOpacity={0.3} />
          </ReAreaChart>
        );
      case 'pie':
        return (
          <RePieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie data={mockData} dataKey={yAxisField} nameKey={xAxisField} cx="50%" cy="50%" outerRadius={80} fill="var(--color-uv)" label />
            <Pie data={mockData} dataKey="pv" nameKey={xAxisField} cx="50%" cy="50%" innerRadius={90} outerRadius={110} fill="var(--color-pv)" label />
            <ChartLegend content={<ChartLegendContent />} />
          </RePieChart>
        );
      case 'scatter':
        return (
          <ReScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
             <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
            <XAxis type="category" dataKey={xAxisField} name={xAxisField} stroke="hsl(var(--muted-foreground))" />
            <YAxis type="number" dataKey={yAxisField} name={yAxisField} stroke="hsl(var(--muted-foreground))" />
            <ChartTooltip content={<ChartTooltipContent />} cursor={{ ZAxis: 'red' }}/>
            <ChartLegend content={<ChartLegendContent />} />
            <Scatter name="A school" data={mockData} fill="var(--color-uv)" />
          </ReScatterChart>
        );
      case 'radar':
         return (
          <ReRadarChart cx="50%" cy="50%" outerRadius="80%" data={mockData}>
            <PolarGrid stroke="hsl(var(--border)/0.5)" />
            <PolarAngleAxis dataKey={xAxisField} stroke="hsl(var(--muted-foreground))"/>
            <PolarRadiusAxis stroke="hsl(var(--muted-foreground))"/>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReRadar name="Mike" dataKey={yAxisField} stroke="var(--color-uv)" fill="var(--color-uv)" fillOpacity={0.6} />
             <ReRadar name="Lily" dataKey="pv" stroke="var(--color-pv)" fill="var(--color-pv)" fillOpacity={0.6} />
            <ChartLegend content={<ChartLegendContent />} />
          </ReRadarChart>
        );
      case 'polar':
         return (
          <ReRadarChart cx="50%" cy="50%" outerRadius="80%" data={mockData}>
            <PolarGrid stroke="hsl(var(--border)/0.5)" />
            <PolarAngleAxis dataKey={xAxisField} stroke="hsl(var(--muted-foreground))"/>
            <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="hsl(var(--muted-foreground))"/>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReRadar name="Mike" dataKey={yAxisField} stroke="var(--color-uv)" fill="var(--color-uv)" fillOpacity={0.6} />
            <ReRadar name="Lily" dataKey="pv" stroke="var(--color-pv)" fill="var(--color-pv)" fillOpacity={0.6} />
            <ChartLegend content={<ChartLegendContent />} />
          </ReRadarChart>
        );
      default:
        return <p>Select a chart type to visualize data.</p>;
    }
  };

  const handleExport = () => {
    toast({ title: "Exporting Chart", description: "Chart data export to Excel started..." });
    console.log("Exporting chart data:", mockData);
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <BarChart3 className="text-primary" /> {/* Using general icon */}
          Visualize Your Data
        </CardTitle>
        <CardDescription>Create various charts from your data with customizable options.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
            <SelectTrigger className="w-full sm:w-[200px] bg-input focus:bg-background">
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
          
          <Button variant="outline" disabled className="w-full sm:w-auto">
            <Settings2 className="mr-2 h-4 w-4" /> Customize Axes (Soon)
          </Button>

           <Button onClick={handleExport} className="w-full sm:w-auto sm:ml-auto bg-accent hover:bg-accent/90 text-accent-foreground">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Chart Data
          </Button>
        </div>

        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </ChartContainer>

      </CardContent>
    </Card>
  );
}

    