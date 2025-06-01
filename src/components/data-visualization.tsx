
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart3, PieChart as PieIcon, ScatterChart as ScatterIcon, Radar as RadarIcon, AreaChart as AreaIcon, LineChart as LineChartIcon, Settings2, FileSpreadsheet, Info, Palette, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart as ReBarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart as ReLineChart, Pie, PieChart as RePieChart, Area, AreaChart as ReAreaChart, Scatter, ScatterChart as ReScatterChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadarChart as ReRadarChart, Radar as ReRadar, Label as RechartsLabel, Tooltip as RechartsTooltip } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'radar';
type AggregationType = 'count' | 'sum' | 'average' | 'min' | 'max' | 'uniqueCount' | 'sdev';

interface DataVisualizationProps {
  uploadedData: Record<string, any>[];
  dataFields: string[];
  currentDatasetIdentifier: string;
}

const chartIcons: Record<ChartType, React.ElementType> = {
  bar: BarChart3,
  line: LineChartIcon,
  area: AreaIcon,
  pie: PieIcon,
  scatter: ScatterIcon,
  radar: RadarIcon,
};

const aggregationOptions: { value: AggregationType; label: string; numericOnly: boolean }[] = [
  { value: 'count', label: 'Count (Non-Empty)', numericOnly: false },
  { value: 'sum', label: 'Sum', numericOnly: true },
  { value: 'average', label: 'Average', numericOnly: true },
  { value: 'min', label: 'Min', numericOnly: true },
  { value: 'max', label: 'Max', numericOnly: true },
  { value: 'uniqueCount', label: 'Unique Count', numericOnly: false },
  { value: 'sdev', label: 'Standard Deviation', numericOnly: true },
];

const chartThemes = {
  default: {
    '1': 'hsl(var(--chart-1))',
    '2': 'hsl(var(--chart-2))',
    '3': 'hsl(var(--chart-3))',
    '4': 'hsl(var(--chart-4))',
    '5': 'hsl(var(--chart-5))',
  },
  ocean: { '1': '#0077b6', '2': '#00b4d8', '3': '#90e0ef', '4': '#caf0f8', '5': '#ade8f4' },
  sunset: { '1': '#f77f00', '2': '#fcbf49', '3': '#eae2b7', '4': '#d62828', '5': '#f9a03f' },
  forest: { '1': '#2d6a4f', '2': '#40916c', '3': '#52b788', '4': '#74c69d', '5': '#95d5b2' },
  grayscale: { '1': '#333333', '2': '#555555', '3': '#777777', '4': '#999999', '5': '#bbbbbb' },
};
type ChartThemeKey = keyof typeof chartThemes;

const NO_FIELD_SELECTED_VALUE = "__NONE_FIELD_SELECTION__";

export function DataVisualization({ uploadedData, dataFields, currentDatasetIdentifier }: DataVisualizationProps) {
  const { toast } = useToast();

  // --- State for Chart 1 ---
  const [chart1Type, setChart1Type] = useState<ChartType>('bar');
  const [chart1XAxisField, setChart1XAxisField] = useState<string | undefined>(undefined);
  const [chart1YAxisField1, setChart1YAxisField1] = useState<string | undefined>(undefined);
  const [chart1YAxisAggregation1, setChart1YAxisAggregation1] = useState<AggregationType>('sum');
  const [chart1YAxisField2, setChart1YAxisField2] = useState<string | undefined>(undefined);
  const [chart1YAxisAggregation2, setChart1YAxisAggregation2] = useState<AggregationType>('sum');
  const [chart1Theme, setChart1Theme] = useState<ChartThemeKey>('default');

  // --- State for Chart 2 ---
  const [chart2Type, setChart2Type] = useState<ChartType>('line');
  const [chart2XAxisField, setChart2XAxisField] = useState<string | undefined>(undefined);
  const [chart2YAxisField1, setChart2YAxisField1] = useState<string | undefined>(undefined);
  const [chart2YAxisAggregation1, setChart2YAxisAggregation1] = useState<AggregationType>('count');
  const [chart2YAxisField2, setChart2YAxisField2] = useState<string | undefined>(undefined);
  const [chart2YAxisAggregation2, setChart2YAxisAggregation2] = useState<AggregationType>('sum');
  const [chart2Theme, setChart2Theme] = useState<ChartThemeKey>('ocean');

  const numericFields = useMemo(() => {
    if (uploadedData.length === 0) return [];
    return dataFields.filter(field => {
      const firstNonEmptyValue = uploadedData.find(d => d[field] !== null && d[field] !== undefined)?.[field];
      if (firstNonEmptyValue === null || firstNonEmptyValue === undefined) return false; // if all are empty, not numeric
      return typeof firstNonEmptyValue === 'number' && uploadedData.every(d => d[field] === null || d[field] === undefined || typeof d[field] === 'number');
    });
  }, [uploadedData, dataFields]);

  const categoricalFields = useMemo(() => {
    if (uploadedData.length === 0) return [];
    return dataFields.filter(field => {
      if (numericFields.includes(field)) return false;
      const uniqueValues = new Set(uploadedData.map(d => d[field]));
      return uniqueValues.size <= 50 || typeof uploadedData.find(d=>d[field] !== null && d[field] !== undefined)?.[field] === 'string';
    });
  }, [uploadedData, dataFields, numericFields]);

  const getXAxisOptions = (chartType: ChartType) => {
    if (chartType === 'pie' || chartType === 'radar') return categoricalFields.length > 0 ? categoricalFields : dataFields.filter(f => !numericFields.includes(f));
    return dataFields;
  };

  const setDefaultFields = useCallback((
    _chartType: ChartType,
    setX: (val: string | undefined) => void,
    setY1: (val: string | undefined) => void,
    setY2: (val: string | undefined) => void,
    currentX?: string, currentY1?: string, currentY2?: string
  ) => {
    if (dataFields.length > 0) {
      const newXOptions = getXAxisOptions(_chartType);
      if (!currentX || !newXOptions.includes(currentX)) {
        setX(newXOptions[0] || dataFields[0]);
      }

      if (!currentY1 || !dataFields.includes(currentY1)) {
        setY1(numericFields[0] || undefined);
      }
      
      const availableY2 = numericFields.filter(f => f !== (currentY1 || numericFields[0]));
      if (!currentY2 || !availableY2.includes(currentY2)) {
         setY2(availableY2[0] || undefined);
      }

    } else {
      [setX, setY1, setY2].forEach(f => f(undefined));
    }
  }, [dataFields, numericFields, categoricalFields]); // getXAxisOptions relies on categoricalFields which relies on numericFields

  useEffect(() => {
    setDefaultFields(chart1Type, setChart1XAxisField, setChart1YAxisField1, setChart1YAxisField2, chart1XAxisField, chart1YAxisField1, chart1YAxisField2);
  }, [dataFields, numericFields, chart1Type, setDefaultFields]);

  useEffect(() => {
    setDefaultFields(chart2Type, setChart2XAxisField, setChart2YAxisField1, setChart2YAxisField2, chart2XAxisField, chart2YAxisField1, chart2YAxisField2);
  }, [dataFields, numericFields, chart2Type, setDefaultFields]);


  const processAggregatedData = useCallback((
    data: Record<string, any>[],
    xField: string | undefined,
    yField1: string | undefined,
    yAgg1: AggregationType,
    yField2: string | undefined,
    yAgg2: AggregationType,
    chartTypeForProcessing: ChartType
  ): any[] => {
    if (!xField || data.length === 0 || (!yField1 && chartTypeForProcessing !== 'pie' && chartTypeForProcessing !== 'radar' && !(yAgg1 === 'count' && chartTypeForProcessing !== 'scatter' )) ) {
        if(chartTypeForProcessing === 'pie' && xField && yAgg1 === 'count'){
             const categoryCounts: Record<string, number> = {};
             data.forEach(item => {
                 const categoryValue = item[xField];
                 if (categoryValue !== null && categoryValue !== undefined && String(categoryValue).trim() !== "") {
                    const category = String(categoryValue);
                    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                 }
             });
             // For pie chart, yField1 is used as dataKey, so we need to ensure it's present
             // We can use a placeholder name if yField1 is not selected but agg is count
             const effectiveYField1 = yField1 || 'count';
             return Object.entries(categoryCounts).map(([name, value]) => ({ [xField]: name, [effectiveYField1]: value })).slice(0, 10);
        }
        return [];
    }

    const groupedData: Record<string, {
      values1: any[],
      values2: any[],
      numericValues1: number[],
      numericValues2: number[],
      uniqueSet1: Set<any>,
      uniqueSet2: Set<any>
    }> = {};

    data.forEach(item => {
      const xValue = String(item[xField] ?? 'N/A'); // Treat null/undefined X-values as 'N/A' category
      if (!groupedData[xValue]) {
        groupedData[xValue] = { values1: [], values2: [], numericValues1: [], numericValues2: [], uniqueSet1: new Set(), uniqueSet2: new Set() };
      }
      if (yField1) {
        groupedData[xValue].values1.push(item[yField1]);
        groupedData[xValue].uniqueSet1.add(item[yField1]); // Still add all for uniqueSet if needed by uniqueCount
        const numVal1 = parseFloat(String(item[yField1]).replace(/,/g, '')); // Handle potential commas in string numbers
        if (!isNaN(numVal1)) groupedData[xValue].numericValues1.push(numVal1);
      } else if (yAgg1 === 'count') { // if yField1 is not selected but agg is count, push a placeholder for counting non-empty x-values
        groupedData[xValue].values1.push(item[xField]); // The value itself doesn't matter, only its presence
      }

      if (yField2) {
        groupedData[xValue].values2.push(item[yField2]);
        groupedData[xValue].uniqueSet2.add(item[yField2]);
        const numVal2 = parseFloat(String(item[yField2]).replace(/,/g, ''));
        if (!isNaN(numVal2)) groupedData[xValue].numericValues2.push(numVal2);
      } else if (yAgg2 === 'count') {
         groupedData[xValue].values2.push(item[xField]);
      }
    });

    const aggregate = (values: any[], numericValues: number[], uniqueSet: Set<any>, aggType: AggregationType): number | string => {
      const validValuesForCount = values.filter(v => v !== null && v !== undefined && String(v).trim() !== "");
      
      if (numericValues.length === 0 && aggType !== 'count' && aggType !== 'uniqueCount') return 0;
      
      switch (aggType) {
        case 'count': return validValuesForCount.length;
        case 'sum': return numericValues.reduce((s, a) => s + a, 0);
        case 'average': return numericValues.length > 0 ? numericValues.reduce((s, a) => s + a, 0) / numericValues.length : 0;
        case 'min': return numericValues.length > 0 ? Math.min(...numericValues) : 0;
        case 'max': return numericValues.length > 0 ? Math.max(...numericValues) : 0;
        case 'uniqueCount': 
          const validUniqueSet = new Set();
          uniqueSet.forEach(v => {
            if (v !== null && v !== undefined && String(v).trim() !== "") {
              validUniqueSet.add(v);
            }
          });
          return validUniqueSet.size;
        case 'sdev':
          if (numericValues.length < 2) return 0;
          const mean = numericValues.reduce((s, a) => s + a, 0) / numericValues.length;
          const variance = numericValues.reduce((s, a) => s + (a - mean) ** 2, 0) / (numericValues.length - 1);
          return Math.sqrt(variance);
        default: return 0;
      }
    };
    
    let result = Object.entries(groupedData).map(([xValue, group]) => {
      const aggregated: Record<string, any> = { [xField]: xValue };
      const effectiveYField1 = yField1 || (yAgg1 === 'count' ? 'count' : 'value1'); // Use 'count' if yField1 is null and agg is count
      const effectiveYField2 = yField2 || (yAgg2 === 'count' ? 'count2' : 'value2');

      aggregated[effectiveYField1] = aggregate(group.values1, group.numericValues1, group.uniqueSet1, yAgg1);
      
      if (yField2 || yAgg2 === 'count') { // Ensure second aggregation is processed if yField2 is selected OR if yAgg2 is 'count' (even if yField2 is not selected)
         aggregated[effectiveYField2] = aggregate(group.values2, group.numericValues2, group.uniqueSet2, yAgg2);
      }
      return aggregated;
    });

    if (chartTypeForProcessing === 'pie' && xField && yAgg1 === 'count' && yField1) { // check yField1 for pie dataKey
        // Data already prepared if it's count of categories
    }
    
    if (chartTypeForProcessing === 'pie') { // Limit for pie
        return result.slice(0, 10);
    }
    if (chartTypeForProcessing === 'radar') { // Limit for radar
        return result.slice(0, 8);
    }
    
    return result.slice(0, 100); // General data limit
  }, []);


  const displayDataChart1 = useMemo(() => {
    return processAggregatedData(uploadedData, chart1XAxisField, chart1YAxisField1, chart1YAxisAggregation1, chart1YAxisField2, chart1YAxisAggregation2, chart1Type);
  }, [uploadedData, chart1XAxisField, chart1YAxisField1, chart1YAxisAggregation1, chart1YAxisField2, chart1YAxisAggregation2, chart1Type, processAggregatedData]);

  const displayDataChart2 = useMemo(() => {
    return processAggregatedData(uploadedData, chart2XAxisField, chart2YAxisField1, chart2YAxisAggregation1, chart2YAxisField2, chart2YAxisAggregation2, chart2Type);
  }, [uploadedData, chart2XAxisField, chart2YAxisField1, chart2YAxisAggregation1, chart2YAxisField2, chart2YAxisAggregation2, chart2Type, processAggregatedData]);


  const getChartConfig = (yField1?: string, yField2?: string, themeKey: ChartThemeKey = 'default', yAgg1?: AggregationType, yAgg2?: AggregationType): ChartConfig => {
    const themeColors = chartThemes[themeKey] || chartThemes.default;
    const config: ChartConfig = {};
    
    const effectiveYField1 = yField1 || (yAgg1 === 'count' ? 'count' : undefined);
    const effectiveYField2 = yField2 || (yAgg2 === 'count' ? 'count2' : undefined);

    if (effectiveYField1) {
      const label1 = effectiveYField1.replace(/_/g, ' ');
      const aggLabel1 = aggregationOptions.find(a => a.value === yAgg1)?.label || yAgg1;
      config[effectiveYField1] = { label: `${label1}${yAgg1 !== 'count' || yField1 ? ` (${aggLabel1})` : ''}`, color: themeColors['1'] };
    }
    if (effectiveYField2 && effectiveYField2 !== effectiveYField1) {
      const label2 = effectiveYField2.replace(/_/g, ' ');
      const aggLabel2 = aggregationOptions.find(a => a.value === yAgg2)?.label || yAgg2;
      config[effectiveYField2] = { label: `${label2}${yAgg2 !== 'count' || yField2 ? ` (${aggLabel2})` : ''}`, color: themeColors['2'] };
    }
    return config;
  };

  const chart1Config = useMemo(() => getChartConfig(chart1YAxisField1, chart1YAxisField2, chart1Theme, chart1YAxisAggregation1, chart1YAxisAggregation2), [chart1YAxisField1, chart1YAxisField2, chart1Theme, chart1YAxisAggregation1, chart1YAxisAggregation2]);
  const chart2Config = useMemo(() => getChartConfig(chart2YAxisField1, chart2YAxisField2, chart2Theme, chart2YAxisAggregation1, chart2YAxisAggregation2), [chart2YAxisField1, chart2YAxisField2, chart2Theme, chart2YAxisAggregation1, chart2YAxisAggregation2]);

  const canVisualize = uploadedData.length > 0 && dataFields.length > 0;

  const renderChartContent = (
    chartType: ChartType,
    displayData: any[],
    xAxisField: string | undefined,
    yAxisField1: string | undefined,
    yAxisField2: string | undefined,
    chartConfigObj: ChartConfig,
    yAgg1: AggregationType,
    yAgg2: AggregationType,
    chartNum: 1 | 2
  ) => {
    const effectiveYField1 = yAxisField1 || (yAgg1 === 'count' ? 'count' : undefined);
    const effectiveYField2 = yAxisField2 || (yAgg2 === 'count' ? 'count2' : undefined);

    if (!canVisualize) {
      return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">No data uploaded. Please upload a file in the 'Upload Data' section.</p>;
    }
    if (!xAxisField || !effectiveYField1 || displayData.length === 0) {
        if (chartType === 'pie' && xAxisField && displayData.length > 0 && effectiveYField1 && yAgg1 === 'count') {
            // Allow pie chart with category counts
        } else {
             return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Please select valid X and Y axis fields. Ensure Y axis field is numeric or aggregation is 'Count (Non-Empty)'/'Unique Count'. Chart data may be limited.</p>;
        }
    }
    
    const yLabel1Base = yAxisField1 ? yAxisField1.replace(/_/g, ' ') : (yAgg1 === 'count' ? 'Count' : '');
    const aggLabel1 = aggregationOptions.find(a=>a.value === yAgg1)?.label || yAgg1;
    const finalYLabel1 = `${yLabel1Base}${yAgg1 !== 'count' || yAxisField1 ? ` (${aggLabel1})` : ''}`;

    const yLabel2Base = yAxisField2 ? yAxisField2.replace(/_/g, ' ') : (yAgg2 === 'count' ? 'Count' : '');
    const aggLabel2 = aggregationOptions.find(a=>a.value === yAgg2)?.label || yAgg2;
    const finalYLabel2 = `${yLabel2Base}${yAgg2 !== 'count' || yAxisField2 ? ` (${aggLabel2})` : ''}`;


    const commonXAxisProps = {
      dataKey: xAxisField,
      stroke: "hsl(var(--muted-foreground))",
      tick: { fontSize: 10 },
      interval: displayData.length > 20 ? 'preserveStartEnd' : 0,
      allowDuplicatedCategory: chartType !== 'bar' && chartType !== 'line' && chartType !== 'area',
    };
    const commonYAxisProps1 = {
        stroke: "hsl(var(--muted-foreground))",
        tick: { fontSize: 10 },
    };
     const commonYAxisProps2 = {
        yAxisId: "right",
        orientation:"right",
        stroke: "hsl(var(--muted-foreground))",
        tick: { fontSize: 10 },
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis {...commonXAxisProps}>
                <RechartsLabel value={xAxisField?.replace(/_/g, ' ')} offset={5} position="insideBottom" />
              </XAxis>
              <YAxis {...commonYAxisProps1} label={{ value: finalYLabel1, angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fontSize: '12px'}, dy: 40 }}/>
              {effectiveYField2 && <YAxis {...commonYAxisProps2} label={{ value: finalYLabel2, angle: -90, position: 'insideRight', style: {textAnchor: 'middle', fontSize: '12px'}, dy: -40 }}/>}
              <RechartsTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {effectiveYField1 && <Bar dataKey={effectiveYField1} fill={`var(--color-${effectiveYField1})`} radius={4} name={chartConfigObj[effectiveYField1]?.label as string || finalYLabel1} />}
              {effectiveYField2 && effectiveYField2 !== effectiveYField1 && <Bar yAxisId="right" dataKey={effectiveYField2} fill={`var(--color-${effectiveYField2})`} radius={4} name={chartConfigObj[effectiveYField2]?.label as string || finalYLabel2} />}
            </ReBarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis {...commonXAxisProps}>
                 <RechartsLabel value={xAxisField?.replace(/_/g, ' ')} offset={5} position="insideBottom" />
              </XAxis>
              <YAxis {...commonYAxisProps1} label={{ value: finalYLabel1, angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fontSize: '12px'}, dy: 40 }}/>
              {effectiveYField2 && <YAxis {...commonYAxisProps2} label={{ value: finalYLabel2, angle: -90, position: 'insideRight', style: {textAnchor: 'middle', fontSize: '12px'}, dy: -40 }}/>}
              <RechartsTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {effectiveYField1 && <Line type="monotone" dataKey={effectiveYField1} stroke={`var(--color-${effectiveYField1})`} name={chartConfigObj[effectiveYField1]?.label as string || finalYLabel1} connectNulls={true} />}
              {effectiveYField2 && effectiveYField2 !== effectiveYField1 && <Line yAxisId="right" type="monotone" dataKey={effectiveYField2} stroke={`var(--color-${effectiveYField2})`} name={chartConfigObj[effectiveYField2]?.label as string || finalYLabel2} connectNulls={true} />}
            </ReLineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReAreaChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis {...commonXAxisProps}>
                <RechartsLabel value={xAxisField?.replace(/_/g, ' ')} offset={5} position="insideBottom" />
              </XAxis>
              <YAxis {...commonYAxisProps1} label={{ value: finalYLabel1, angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fontSize: '12px'}, dy: 40 }}/>
              {effectiveYField2 && <YAxis {...commonYAxisProps2} label={{ value: finalYLabel2, angle: -90, position: 'insideRight', style: {textAnchor: 'middle', fontSize: '12px'}, dy: -40 }}/>}
              <RechartsTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {effectiveYField1 && <Area type="monotone" dataKey={effectiveYField1} stroke={`var(--color-${effectiveYField1})`} fill={`var(--color-${effectiveYField1})`} fillOpacity={0.4} name={chartConfigObj[effectiveYField1]?.label as string || finalYLabel1} connectNulls={true} />}
              {effectiveYField2 && effectiveYField2 !== effectiveYField1 && <Area yAxisId="right" type="monotone" dataKey={effectiveYField2} stroke={`var(--color-${effectiveYField2})`} fill={`var(--color-${effectiveYField2})`} fillOpacity={0.4} name={chartConfigObj[effectiveYField2]?.label as string || finalYLabel2} connectNulls={true} />}
            </ReAreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
         if (!xAxisField || !effectiveYField1 || displayData.length === 0) return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Pie chart requires X-Axis (category) and Y-Axis (value or count aggregation).</p>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
              <RechartsTooltip content={<ChartTooltipContent />} />
              <Pie data={displayData} dataKey={effectiveYField1} nameKey={xAxisField} cx="50%" cy="50%" outerRadius={Math.min(120, window.innerHeight / 5)} fill={`var(--color-${effectiveYField1})`} labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} />
              <ChartLegend content={<ChartLegendContent wrapperStyle={{ fontSize: '10px' }} />} />
            </RePieChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        if (!effectiveYField2) return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Scatter plot requires a second numeric Y-axis field (Y-Axis 2).</p>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis type="category" {...commonXAxisProps}>
                 <RechartsLabel value={xAxisField?.replace(/_/g, ' ')} offset={5} position="insideBottom" />
              </XAxis>
              <YAxis type="number" dataKey={effectiveYField1} {...commonYAxisProps1} label={{ value: finalYLabel1, angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fontSize: '12px'}, dy: 40 }}/>
              <YAxis yAxisId="right" type="number" dataKey={effectiveYField2} orientation="right" stroke="hsl(var(--muted-foreground))" tick={{fontSize: 10}} label={{ value: finalYLabel2, angle: -90, position: 'insideRight', style: {textAnchor: 'middle', fontSize: '12px'}, dy: -40 }}/>
              <RechartsTooltip content={<ChartTooltipContent />} cursor={{ strokeDasharray: '3 3' }} />
              <ChartLegend content={<ChartLegendContent />} />
              {effectiveYField1 && <Scatter name={chartConfigObj[effectiveYField1]?.label as string || finalYLabel1} data={displayData} fill={`var(--color-${effectiveYField1})`} />}
              {effectiveYField2 && <Scatter yAxisId="right" name={chartConfigObj[effectiveYField2]?.label as string || finalYLabel2} data={displayData} fill={`var(--color-${effectiveYField2})`} />}
            </ReScatterChart>
          </ResponsiveContainer>
        );
      case 'radar':
        if (!xAxisField || !effectiveYField1 || displayData.length === 0) return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Radar chart requires X-Axis (category) and Y-Axis (value).</p>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReRadarChart cx="50%" cy="50%" outerRadius="70%" data={displayData}>
              <PolarGrid stroke="hsl(var(--border)/0.5)" />
              <PolarAngleAxis dataKey={xAxisField} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <RechartsTooltip content={<ChartTooltipContent />} />
              {effectiveYField1 && <ReRadar name={chartConfigObj[effectiveYField1]?.label as string || finalYLabel1} dataKey={effectiveYField1} stroke={`var(--color-${effectiveYField1})`} fill={`var(--color-${effectiveYField1})`} fillOpacity={0.6} />}
              {effectiveYField2 && effectiveYField2 !== effectiveYField1 && <ReRadar name={chartConfigObj[effectiveYField2]?.label as string || finalYLabel2} dataKey={effectiveYField2} stroke={`var(--color-${effectiveYField2})`} fill={`var(--color-${effectiveYField2})`} fillOpacity={0.6} />}
              <ChartLegend content={<ChartLegendContent />} />
            </ReRadarChart>
          </ResponsiveContainer>
        );
      default:
        return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Select a chart type to visualize data.</p>;
    }
  };

  const handleExport = (chartDataToExport: any[], xAxisField?: string, yAxisField1?: string, yAxisField2?: string, chartNum: 1 | 2 = 1, agg1?: AggregationType, agg2?: AggregationType) => {
    if (!canVisualize || chartDataToExport.length === 0) {
      toast({ title: "No Data", description: `No data to export for Chart ${chartNum}.`, variant: "destructive" });
      return;
    }
    toast({ title: `Exporting Chart ${chartNum} Data`, description: "Chart data export to CSV started..." });

    const fieldsToExport: string[] = [];
    const headerLabels: string[] = [];
    
    const effectiveYField1 = yAxisField1 || (agg1 === 'count' ? 'count' : undefined);
    const effectiveYField2 = yAxisField2 || (agg2 === 'count' ? 'count2' : undefined);


    if(xAxisField) {
        fieldsToExport.push(xAxisField);
        headerLabels.push(xAxisField.replace(/_/g, ' '));
    }
    if(effectiveYField1) {
        fieldsToExport.push(effectiveYField1);
        const baseLabel = yAxisField1 ? yAxisField1.replace(/_/g, ' ') : (agg1 === 'count' ? 'Count' : '');
        const aggLabel = aggregationOptions.find(a => a.value === agg1)?.label || agg1;
        headerLabels.push(`${baseLabel}${agg1 !== 'count' || yAxisField1 ? ` (${aggLabel})` : ''}`);
    }
    if(effectiveYField2 && effectiveYField2 !== effectiveYField1) {
        fieldsToExport.push(effectiveYField2);
        const baseLabel = yAxisField2 ? yAxisField2.replace(/_/g, ' ') : (agg2 === 'count' ? 'Count' : '');
        const aggLabel = aggregationOptions.find(a => a.value === agg2)?.label || agg2;
        headerLabels.push(`${baseLabel}${agg2 !== 'count' || yAxisField2 ? ` (${aggLabel})` : ''}`);
    }
    
    const headerRow = headerLabels.join(',');
    const dataRows = chartDataToExport.map(row =>
      fieldsToExport.map(field => {
        let value = row[field];
        if (value instanceof Date) {
             value = value.toISOString().split('T')[0]; 
        } else if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        } else if (value === null || value === undefined) {
          return "";
        }
        return String(value);
      }).join(',')
    );

    const csvContent = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    const exportFileName = `${currentDatasetIdentifier.replace(/[^a-z0-9]/gi, '_')}_chart${chartNum}_data.csv`;
    link.setAttribute("download", exportFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const renderConfigControls = (
    chartId: '1' | '2',
    chartType: ChartType, setChartType: (val: ChartType) => void,
    xAxisField: string | undefined, setXAxisField: (val: string | undefined) => void,
    yAxisField1: string | undefined, setYAxisField1: (val: string | undefined) => void,
    yAxisAggregation1: AggregationType, setYAxisAggregation1: (val: AggregationType) => void,
    yAxisField2: string | undefined, setYAxisField2: (val: string | undefined) => void,
    yAxisAggregation2: AggregationType, setYAxisAggregation2: (val: AggregationType) => void,
    chartTheme: ChartThemeKey, setChartTheme: (val: ChartThemeKey) => void
  ) => {
    const xAxisOptions = getXAxisOptions(chartType);
    const isY2Disabled = chartType === 'pie'; // For pie, Y2 doesn't make sense. Scatter requires Y2.
    const y1IsOptional = chartType === 'pie' && yAxisAggregation1 === 'count'; // Y1 field is optional if just counting categories for pie


    const handleAggregationChange = (
        fieldSetter: (val: string | undefined) => void, 
        aggSetter: (val: AggregationType) => void, 
        newAgg: AggregationType, 
        currentField: string | undefined,
        isY1: boolean // to know if we are dealing with Y1 or Y2
    ) => {
      const isNumericOnlyAgg = aggregationOptions.find(opt => opt.value === newAgg)?.numericOnly;
      if (isNumericOnlyAgg && currentField && !numericFields.includes(currentField)) {
        toast({
          title: "Invalid Aggregation",
          description: `Aggregation '${aggregationOptions.find(opt => opt.value === newAgg)?.label}' requires a numeric field. '${currentField}' is not consistently numeric. Select a numeric field or a non-numeric aggregation.`,
          variant: "destructive",
          duration: 7000,
        });
        // Optionally reset field or aggregation if invalid
        // fieldSetter(undefined); 
        // aggSetter('count'); // Default to a safe aggregation
      } else {
        aggSetter(newAgg);
      }
    };
    
    const handleYFieldChange = (
        fieldSetter: (val: string | undefined) => void, 
        aggSetter: (val: AggregationType) => void, 
        newField: string | undefined, 
        currentAgg: AggregationType,
        isY1: boolean
    ) => {
        fieldSetter(newField);
        const isNumericOnlyAgg = aggregationOptions.find(opt => opt.value === currentAgg)?.numericOnly;
        if (isNumericOnlyAgg && newField && !numericFields.includes(newField)) {
            aggSetter('count');
            toast({
                title: "Aggregation Switched",
                description: `Field '${newField}' is not numeric. Switched aggregation for Y-Axis ${isY1 ? '1' : '2'} to 'Count (Non-Empty)'.`,
                variant: "default",
                duration: 5000,
            });
        }
    };


    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-start">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Chart Type</label>
            <Select value={chartType} onValueChange={(val: ChartType) => setChartType(val)}>
              <SelectTrigger className="w-full bg-input focus:bg-background">
                <SelectValue placeholder="Select Chart Type" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(chartIcons) as ChartType[]).map(type => {
                  const Icon = chartIcons[type];
                  return (
                    <SelectItem key={type} value={type} className="capitalize">
                      <div className="flex items-center gap-2"> <Icon className="w-4 h-4" /> {type} </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">X-Axis Field</label>
            <Select value={xAxisField} onValueChange={setXAxisField} disabled={dataFields.length === 0}>
              <SelectTrigger className="w-full bg-input focus:bg-background">
                <SelectValue placeholder="Select X-Axis Field" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {(xAxisOptions.length > 0 ? xAxisOptions : dataFields).map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)}
                {dataFields.length === 0 && <p className="p-2 text-xs text-muted-foreground text-center">No fields available</p>}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Theme</label>
            <Select value={chartTheme} onValueChange={(val: ChartThemeKey) => setChartTheme(val)}>
              <SelectTrigger className="w-full bg-input focus:bg-background">
                <SelectValue placeholder="Select Theme" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(chartThemes) as ChartThemeKey[]).map(themeKey => (
                  <SelectItem key={themeKey} value={themeKey} className="capitalize">
                    <div className="flex items-center gap-2"><Palette className="w-4 h-4" />{themeKey.replace(/_/g, ' ')}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
           <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Y-Axis 1 Field {y1IsOptional ? '(Optional for Count)' : ''}</label>
            <Select 
                value={yAxisField1 || NO_FIELD_SELECTED_VALUE}
                onValueChange={(val) => handleYFieldChange(setYAxisField1, setYAxisAggregation1, val === NO_FIELD_SELECTED_VALUE ? undefined : val, yAxisAggregation1, true)}
                disabled={dataFields.length === 0}
            >
              <SelectTrigger className="w-full bg-input focus:bg-background">
                <SelectValue placeholder="Select Y-Axis 1 Field" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                 {y1IsOptional && <SelectItem value={NO_FIELD_SELECTED_VALUE}>None (Use X-Axis Count)</SelectItem>}
                {dataFields.map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)}
                {dataFields.length === 0 && <p className="p-2 text-xs text-muted-foreground text-center">No fields available</p>}
              </SelectContent>
            </Select>
            <label className="text-xs font-medium text-muted-foreground mt-1 block">Y-Axis 1 Aggregation</label>
            <Select 
                value={yAxisAggregation1} 
                onValueChange={(val: AggregationType) => handleAggregationChange(setYAxisField1, setYAxisAggregation1, val, yAxisField1, true)} 
                disabled={!yAxisField1 && !y1IsOptional}
            >
              <SelectTrigger className="w-full bg-input focus:bg-background text-xs h-8">
                <SelectValue placeholder="Aggregation" />
              </SelectTrigger>
              <SelectContent>
                {aggregationOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs" 
                    disabled={opt.numericOnly && yAxisField1 && !numericFields.includes(yAxisField1) && !(y1IsOptional && opt.value === 'count')}>
                    {opt.label} {opt.numericOnly && yAxisField1 && !numericFields.includes(yAxisField1) ? "(N)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Y-Axis 2 Field (Optional)</label>
            <Select
                value={yAxisField2 || NO_FIELD_SELECTED_VALUE}
                onValueChange={(val) => handleYFieldChange(setYAxisField2, setYAxisAggregation2, val === NO_FIELD_SELECTED_VALUE ? undefined : val, yAxisAggregation2, false)}
                disabled={isY2Disabled || dataFields.filter(f => f !== yAxisField1).length === 0}
            >
              <SelectTrigger className="w-full bg-input focus:bg-background">
                <SelectValue placeholder="Select Y-Axis 2 Field" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={NO_FIELD_SELECTED_VALUE}>None</SelectItem>
                {dataFields.filter(f => f !== yAxisField1).map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)}
                {(dataFields.filter(f => f !== yAxisField1).length === 0 && dataFields.length > 0) && <p className="p-2 text-xs text-muted-foreground text-center">No other fields</p>}
              </SelectContent>
            </Select>
             <label className="text-xs font-medium text-muted-foreground mt-1 block">Y-Axis 2 Aggregation</label>
            <Select 
                value={yAxisAggregation2} 
                onValueChange={(val: AggregationType) => handleAggregationChange(setYAxisField2, setYAxisAggregation2, val, yAxisField2, false)} 
                disabled={!yAxisField2 || isY2Disabled}
            >
              <SelectTrigger className="w-full bg-input focus:bg-background text-xs h-8">
                <SelectValue placeholder="Aggregation" />
              </SelectTrigger>
              <SelectContent>
                {aggregationOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs" 
                    disabled={opt.numericOnly && yAxisField2 && !numericFields.includes(yAxisField2)}>
                    {opt.label} {opt.numericOnly && yAxisField2 && !numericFields.includes(yAxisField2) ? "(N)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  };


  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <LayoutDashboard className="text-primary" />
          Data Visualization Dashboard
        </CardTitle>
        <CardDescription className="break-words">
          Configure and view up to two independent charts for {currentDatasetIdentifier ? `"${currentDatasetIdentifier}"` : "your data"}.
          Displaying up to 100 aggregated data points for most charts (less for Pie/Radar).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {!canVisualize && (
             <Alert variant="default" className="bg-accent/10 border-accent/30 my-6">
              <Info className="h-4 w-4 text-accent" />
              <AlertTitle className="text-accent">Data Required</AlertTitle>
              <AlertDescription>
                Please upload data in the 'Upload Data' section on the main page to enable visualization.
              </AlertDescription>
            </Alert>
        )}

        {/* Chart 1 Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline text-xl text-primary-foreground">Chart 1 Configuration</h3>
            <Button
                onClick={() => handleExport(displayDataChart1, chart1XAxisField, chart1YAxisField1, chart1YAxisField2, 1, chart1YAxisAggregation1, chart1YAxisAggregation2)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={!canVisualize || displayDataChart1.length === 0 || !chart1XAxisField || (!chart1YAxisField1 && chart1YAxisAggregation1 !== 'count')}
            >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Chart 1 Data
            </Button>
          </div>
          {canVisualize && renderConfigControls(
            '1', chart1Type, setChart1Type, chart1XAxisField, setChart1XAxisField,
            chart1YAxisField1, setChart1YAxisField1, chart1YAxisAggregation1, setChart1YAxisAggregation1,
            chart1YAxisField2, setChart1YAxisField2, chart1YAxisAggregation2, setChart1YAxisAggregation2,
            chart1Theme, setChart1Theme
          )}
          <ChartContainer config={chart1Config} className="h-[450px] w-full mt-6">
            {renderChartContent(chart1Type, displayDataChart1, chart1XAxisField, chart1YAxisField1, chart1YAxisField2, chart1Config, chart1YAxisAggregation1, chart1YAxisAggregation2, 1)}
          </ChartContainer>
        </section>

        <Separator className="my-12" />

        {/* Chart 2 Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline text-xl text-primary-foreground">Chart 2 Configuration</h3>
            <Button
                onClick={() => handleExport(displayDataChart2, chart2XAxisField, chart2YAxisField1, chart2YAxisField2, 2, chart2YAxisAggregation1, chart2YAxisAggregation2)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={!canVisualize || displayDataChart2.length === 0 || !chart2XAxisField || (!chart2YAxisField1 && chart2YAxisAggregation1 !== 'count')}
            >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Chart 2 Data
            </Button>
          </div>
           {canVisualize && renderConfigControls(
            '2', chart2Type, setChart2Type, chart2XAxisField, setChart2XAxisField,
            chart2YAxisField1, setChart2YAxisField1, chart2YAxisAggregation1, setChart2YAxisAggregation1,
            chart2YAxisField2, setChart2YAxisField2, chart2YAxisAggregation2, setChart2YAxisAggregation2,
            chart2Theme, setChart2Theme
          )}
          <ChartContainer config={chart2Config} className="h-[450px] w-full mt-6">
            {renderChartContent(chart2Type, displayDataChart2, chart2XAxisField, chart2YAxisField1, chart2YAxisField2, chart2Config, chart2YAxisAggregation1, chart2YAxisAggregation2, 2)}
          </ChartContainer>
        </section>

      </CardContent>
    </Card>
  );
}

