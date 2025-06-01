
"use client";

import React, { useState, useMemo, useEffect, useCallback, ReactNode } from 'react';
import { BarChart3, PieChart as PieIcon, ScatterChart as ScatterIcon, Radar as RadarIcon, AreaChart as AreaIcon, LineChart as LineChartIcon, Settings2, FileSpreadsheet, Info, Palette, LayoutDashboard, Droplets, BarChartHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart as ReBarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart as ReLineChart, Pie, PieChart as RePieChart, Area, AreaChart as ReAreaChart, Scatter, ScatterChart as ReScatterChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadarChart as ReRadarChart, Radar as ReRadar, Label as RechartsLabel, Tooltip as RechartsTooltip, Cell, ZAxis, ComposedChart } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { useSettings } from '@/contexts/settings-context'; // Corrected import path

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'radar' | 'composed';
type SeriesChartType = 'bar' | 'line' | 'area'; // For individual series in composed/multi-axis
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
  composed: LayoutDashboard, // Placeholder, consider a more specific icon
};

const seriesChartTypeIcons: Record<SeriesChartType, React.ElementType> = {
    bar: BarChart3,
    line: LineChartIcon,
    area: AreaIcon,
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

const NO_FIELD_SELECTED_VALUE = "__NONE_FIELD_SELECTION__";

const chartMargin = { top: 20, right: 30, left: 20, bottom: 80 }; // Increased bottom margin for rotated labels

// Helper function to parse HSL string and adjust lightness
const adjustHslLightness = (hslColor: string, amount: number): string => {
  if (!hslColor || !hslColor.startsWith('hsl')) return hslColor; // Return original if not a valid HSL string
  const match = hslColor.match(/hsl\(\s*(\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
  if (match) {
    const h = parseInt(match[1]);
    const s = parseFloat(match[2]);
    let l = parseFloat(match[3]);
    l = Math.max(0, Math.min(100, l + amount)); // Adjust lightness and clamp between 0 and 100
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  return hslColor; // Fallback
};


// Custom Active Dot for Line/Area charts
const CustomActiveDot = (props: any) => {
  const { cx, cy, stroke, payload, dataKey, settings } = props;
  const dotRadius = settings.chartAnimationsEnabled ? 6 : 4;
  const pulseRadius = settings.chartAnimationsEnabled ? 10 : 6;

  if (!cx || !cy) return null;

  return (
    <g>
      <circle cx={cx} cy={cy} r={pulseRadius} fill={stroke} fillOpacity={0.2} stroke="none">
        {settings.chartAnimationsEnabled && (
          <animate attributeName="r" from={pulseRadius} to={pulseRadius + 5} dur="1s" begin="0s" repeatCount="indefinite" />
        )}
        {settings.chartAnimationsEnabled && (
          <animate attributeName="fill-opacity" from={0.2} to={0} dur="1s" begin="0s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx={cx} cy={cy} r={dotRadius + 2} fill="hsl(var(--background))" /> 
      <circle cx={cx} cy={cy} r={dotRadius} fill={stroke} stroke="hsl(var(--background))" strokeWidth={2} />
    </g>
  );
};

export function DataVisualization({ uploadedData, dataFields, currentDatasetIdentifier }: DataVisualizationProps) {
  const appSettings = useSettings();
  const { toast } = useToast();
  
  const initialChartState = {
    type: 'bar' as ChartType,
    xAxisField: undefined as string | undefined,
    yAxisField1: undefined as string | undefined,
    yAxisAggregation1: 'sum' as AggregationType,
    yAxisSeriesType1: 'bar' as SeriesChartType,
    yAxisField2: undefined as string | undefined,
    yAxisAggregation2: 'sum' as AggregationType,
    yAxisSeriesType2: 'line' as SeriesChartType,
    theme: appSettings.theme,
  };

  const [chart1, setChart1] = useState(initialChartState);
  const [chart2, setChart2] = useState({ ...initialChartState, type: 'line' as ChartType, theme: 'ocean' as keyof typeof appSettings.chartThemes });


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
      if (numericFields.includes(field)) return false; // If it's identified as numeric, don't include here
      const uniqueValues = new Set(uploadedData.map(d => d[field]));
      return uniqueValues.size <= 50 || typeof uploadedData.find(d => d[field] !== null && d[field] !== undefined)?.[field] === 'string';
    });
  }, [uploadedData, dataFields, numericFields]);

  const getXAxisOptions = (chartType: ChartType) => {
    if (chartType === 'pie' || chartType === 'radar') return categoricalFields.length > 0 ? categoricalFields : dataFields.filter(f => !numericFields.includes(f));
    return dataFields;
  };

   useEffect(() => {
    if (uploadedData.length > 0 && dataFields.length > 0) {
      const resetAction = (prev: typeof initialChartState) => ({
        ...prev, // Keep theme and type if user changed it before data upload
        xAxisField: undefined,
        yAxisField1: undefined,
        yAxisAggregation1: 'sum' as AggregationType,
        yAxisSeriesType1: (prev.type === 'composed' ? 'bar' : prev.type) as SeriesChartType,
        yAxisField2: undefined,
        yAxisAggregation2: 'sum' as AggregationType,
        yAxisSeriesType2: 'line' as SeriesChartType,
      });
      setChart1(resetAction);
      setChart2(prev => ({
        ...resetAction(prev),
        type: prev.type === 'bar' ? 'line' : prev.type, // Differentiate default for chart 2
        theme: prev.theme === appSettings.theme ? 'ocean' : prev.theme
      }));
      toast({
        title: "Data Loaded for Visualization",
        description: "Please select fields for X and Y axes to build your charts.",
        duration: 5000,
      });
    } else if (uploadedData.length === 0) { // Reset if data is removed
       const resetEmpty = (prev: typeof initialChartState) => ({
        ...initialChartState,
        theme: prev.theme, // keep user selected theme
        type: prev.type, // keep user selected type
      });
      setChart1(resetEmpty);
      setChart2(prev => ({...resetEmpty(prev), type: 'line', theme: 'ocean' }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedData, dataFields, toast]); // Removed appSettings.theme dependency


  const setDefaultFields = useCallback((
    currentChartConfig: typeof initialChartState,
    setChartConfig: React.Dispatch<React.SetStateAction<typeof initialChartState>>
  ) => {
    if (dataFields.length > 0) {
        const newXOptions = getXAxisOptions(currentChartConfig.type);
        let updatedX = currentChartConfig.xAxisField;
        if (!updatedX || !newXOptions.includes(updatedX)) {
            updatedX = newXOptions[0] || dataFields[0];
        }

        let updatedY1 = currentChartConfig.yAxisField1;
        if (currentChartConfig.type !== 'pie' && currentChartConfig.type !== 'radar' && currentChartConfig.yAxisAggregation1 !== 'count') { // yField1 is required unless pie/radar count
             if (!updatedY1 || !dataFields.includes(updatedY1)) {
                updatedY1 = numericFields[0] || dataFields.find(f => f !== updatedX);
            }
        } else if ((currentChartConfig.type === 'pie' || currentChartConfig.type === 'radar') && currentChartConfig.yAxisAggregation1 !== 'count' && (!updatedY1 || !numericFields.includes(updatedY1))) {
            updatedY1 = numericFields[0] || dataFields.find(f => f !== updatedX);
        }


        let updatedY2 = currentChartConfig.yAxisField2;
        const availableY2 = numericFields.filter(f => f !== updatedY1);
        if (updatedY2 && !availableY2.includes(updatedY2)) {
             updatedY2 = availableY2[0] || undefined;
        }
        
        const updatedSeriesType1 = (currentChartConfig.type === 'composed' ? currentChartConfig.yAxisSeriesType1 : currentChartConfig.type) as SeriesChartType;
        
        setChartConfig(prev => ({
            ...prev,
            xAxisField: updatedX,
            yAxisField1: updatedY1,
            yAxisSeriesType1: updatedSeriesType1,
            yAxisField2: updatedY2,
        }));
    }
  }, [dataFields, numericFields, categoricalFields, getXAxisOptions]);

  useEffect(() => {
    if (dataFields.length > 0 && (!chart1.xAxisField || !chart1.yAxisField1 && chart1.type !== 'pie' && chart1.type !== 'radar' && chart1.yAxisAggregation1 !== 'count' )) {
        setDefaultFields(chart1, setChart1);
    }
  }, [dataFields, chart1.type, setDefaultFields, chart1.xAxisField, chart1.yAxisField1, chart1.yAxisAggregation1]);

  useEffect(() => {
     if (dataFields.length > 0 && (!chart2.xAxisField || !chart2.yAxisField1 && chart2.type !== 'pie' && chart2.type !== 'radar' && chart2.yAxisAggregation1 !== 'count')) {
        setDefaultFields(chart2, setChart2);
    }
  }, [dataFields, chart2.type, setDefaultFields, chart2.xAxisField, chart2.yAxisField1, chart2.yAxisAggregation1]);
  
  useEffect(() => {
    setChart1(prev => ({ ...prev, theme: appSettings.theme }));
  }, [appSettings.theme]);

  const processAggregatedData = useCallback((
    data: Record<string, any>[],
    xField: string | undefined,
    yField1: string | undefined,
    yAgg1: AggregationType,
    yField2: string | undefined,
    yAgg2: AggregationType,
    chartTypeForProcessing: ChartType
  ): any[] => {
    if (!xField || data.length === 0 || (!yField1 && chartTypeForProcessing !== 'pie' && chartTypeForProcessing !== 'radar' && !(yAgg1 === 'count' && (chartTypeForProcessing !== 'scatter' && chartTypeForProcessing !== 'composed') )) ) {
        if((chartTypeForProcessing === 'pie' || chartTypeForProcessing === 'composed') && xField && yAgg1 === 'count'){
             const categoryCounts: Record<string, number> = {};
             data.forEach(item => {
                 const categoryValue = item[xField];
                 if (categoryValue !== null && categoryValue !== undefined && String(categoryValue).trim() !== "") {
                    const category = String(categoryValue);
                    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                 }
             });
             const effectiveYField1 = yField1 || 'count';
             return Object.entries(categoryCounts).map(([name, value]) => ({ [xField]: name, [effectiveYField1]: value }));
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
      const xValue = String(item[xField] ?? 'N/A');
      if (!groupedData[xValue]) {
        groupedData[xValue] = { values1: [], values2: [], numericValues1: [], numericValues2: [], uniqueSet1: new Set(), uniqueSet2: new Set() };
      }
      if (yField1) {
        const val1 = item[yField1];
        groupedData[xValue].values1.push(val1);
        groupedData[xValue].uniqueSet1.add(val1);
        const numVal1 = parseFloat(String(val1).replace(/,/g, ''));
        if (!isNaN(numVal1)) groupedData[xValue].numericValues1.push(numVal1);
      } else if (yAgg1 === 'count') {
        groupedData[xValue].values1.push(item[xField]);
      }

      if (yField2) {
        const val2 = item[yField2];
        groupedData[xValue].values2.push(val2);
        groupedData[xValue].uniqueSet2.add(val2);
        const numVal2 = parseFloat(String(val2).replace(/,/g, ''));
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
          return Math.sqrt(Math.max(0, variance)); // Ensure variance is not negative due to floating point issues
        default: return 0;
      }
    };
    
    let result = Object.entries(groupedData).map(([xValue, group]) => {
      const aggregated: Record<string, any> = { [xField]: xValue };
      const effectiveYField1 = yField1 || (yAgg1 === 'count' ? 'count' : 'value1');
      const effectiveYField2 = yField2 || (yAgg2 === 'count' ? 'count2' : 'value2');

      aggregated[effectiveYField1] = aggregate(group.values1, group.numericValues1, group.uniqueSet1, yAgg1);
      
      if (yField2 || yAgg2 === 'count') {
         aggregated[effectiveYField2] = aggregate(group.values2, group.numericValues2, group.uniqueSet2, yAgg2);
      }
      return aggregated;
    });
    
    // Sort data if X-axis is date-like for line/area/bar/composed charts
    if (['line', 'area', 'bar', 'composed'].includes(chartTypeForProcessing) && xField && dataFields.includes(xField)) {
        const sampleXValue = uploadedData.find(d => d[xField] !== null && d[xField] !== undefined)?.[xField];
        if (sampleXValue && !isNaN(new Date(sampleXValue).getTime())) {
            result.sort((a, b) => {
                const dateA = new Date(a[xField]).getTime();
                const dateB = new Date(b[xField]).getTime();
                return (isNaN(dateA) || isNaN(dateB)) ? 0 : dateA - dateB;
            });
        }
    }
    return result;
  }, [uploadedData, dataFields]);


  const displayDataChart1 = useMemo(() => {
    return processAggregatedData(uploadedData, chart1.xAxisField, chart1.yAxisField1, chart1.yAxisAggregation1, chart1.yAxisField2, chart1.yAxisAggregation2, chart1.type);
  }, [uploadedData, chart1, processAggregatedData]);

  const displayDataChart2 = useMemo(() => {
    return processAggregatedData(uploadedData, chart2.xAxisField, chart2.yAxisField1, chart2.yAxisAggregation1, chart2.yAxisField2, chart2.yAxisAggregation2, chart2.type);
  }, [uploadedData, chart2, processAggregatedData]);

  const formatValue = (value: number | string) => {
    if (typeof value === 'number') {
      return value.toLocaleString(undefined, { minimumFractionDigits: appSettings.dataPrecision, maximumFractionDigits: appSettings.dataPrecision });
    }
    return String(value);
  };

  const getChartConfig = (
    yField1?: string, yField2?: string, 
    themeKey: keyof typeof appSettings.chartThemes = 'default', 
    yAgg1?: AggregationType, yAgg2?: AggregationType
  ): ChartConfig => {
    const currentThemeCSS = appSettings.chartThemes[themeKey] || appSettings.chartThemes.default;
    const config: ChartConfig = {};
    
    const effectiveYField1 = yField1 || (yAgg1 === 'count' ? 'count' : undefined);
    const effectiveYField2 = yField2 || (yAgg2 === 'count' ? 'count2' : undefined);

    if (effectiveYField1) {
      const label1 = effectiveYField1.replace(/_/g, ' ');
      const aggLabel1 = aggregationOptions.find(a => a.value === yAgg1)?.label || yAgg1;
      config[effectiveYField1] = { label: `${label1}${yAgg1 !== 'count' || yField1 ? ` (${aggLabel1})` : ''}`, color: currentThemeCSS.chart1 };
    }
    if (effectiveYField2 && effectiveYField2 !== effectiveYField1) {
      const label2 = effectiveYField2.replace(/_/g, ' ');
      const aggLabel2 = aggregationOptions.find(a => a.value === yAgg2)?.label || yAgg2;
      config[effectiveYField2] = { label: `${label2}${yAgg2 !== 'count' || yField2 ? ` (${aggLabel2})` : ''}`, color: currentThemeCSS.chart2 };
    } else if (effectiveYField2 && effectiveYField2 === effectiveYField1 && yField1 && yField2) { // Handle case where Y1 and Y2 are same field but different aggs (for composed)
      const label2 = effectiveYField2.replace(/_/g, ' ');
      const aggLabel2 = aggregationOptions.find(a => a.value === yAgg2)?.label || yAgg2;
      // Use a slightly different key for config if fields are same to avoid collision
      config[`${effectiveYField2}-agg2`] = { label: `${label2}${yAgg2 !== 'count' || yField2 ? ` (${aggLabel2})` : ''}`, color: currentThemeCSS.chart2 };
    }
    return config;
  };

  const chart1Config = useMemo(() => getChartConfig(chart1.yAxisField1, chart1.yAxisField2, chart1.theme, chart1.yAxisAggregation1, chart1.yAxisAggregation2), [chart1, appSettings.chartThemes]);
  const chart2Config = useMemo(() => getChartConfig(chart2.yAxisField1, chart2.yAxisField2, chart2.theme, chart2.yAxisAggregation1, chart2.yAxisAggregation2), [chart2, appSettings.chartThemes]);

  const canVisualize = uploadedData.length > 0 && dataFields.length > 0;

  const getGradientId = (chartNum: 1 | 2, seriesNum: 1 | 2) => `chart${chartNum}Gradient${seriesNum}`;

  const renderGradientDefs = (chartNum: 1 | 2, yField1?: string, yField2?: string, yAgg1?: AggregationType, yAgg2?: AggregationType, themeKey: keyof typeof appSettings.chartThemes = 'default') => {
    const currentThemeCSS = appSettings.chartThemes[themeKey] || appSettings.chartThemes.default;
    const defs: ReactNode[] = [];

    const effectiveYField1 = yField1 || (yAgg1 === 'count' ? 'count' : undefined);
    if (effectiveYField1) {
        const color1 = currentThemeCSS.chart1;
        const darkerColor1 = adjustHslLightness(color1, -15); // Darken by 15%
        defs.push(
            <linearGradient key={getGradientId(chartNum, 1)} id={getGradientId(chartNum, 1)} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color1} stopOpacity={0.7}/>
                <stop offset="95%" stopColor={darkerColor1} stopOpacity={0.9}/>
            </linearGradient>
        );
    }

    const effectiveYField2 = yField2 || (yAgg2 === 'count' ? 'count2' : undefined);
    if (effectiveYField2 && effectiveYField2 !== effectiveYField1) {
        const color2 = currentThemeCSS.chart2;
        const darkerColor2 = adjustHslLightness(color2, -15);
        defs.push(
            <linearGradient key={getGradientId(chartNum, 2)} id={getGradientId(chartNum, 2)} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color2} stopOpacity={0.7}/>
                <stop offset="95%" stopColor={darkerColor2} stopOpacity={0.9}/>
            </linearGradient>
        );
    }
    return defs.length > 0 ? <defs>{defs}</defs> : null;
  };
  
  const renderSeriesElement = (
    seriesType: SeriesChartType, 
    dataKey: string, 
    fillOrStrokeColor: string, 
    name: string, 
    yAxisId: "left" | "right",
    gradientId?: string
  ) => {
    const animationProps = { isAnimationActive: appSettings.chartAnimationsEnabled };
    switch (seriesType) {
      case 'bar':
        return <Bar dataKey={dataKey} fill={gradientId ? `url(#${gradientId})` : fillOrStrokeColor} radius={appSettings.chartAnimationsEnabled ? [4, 4, 0, 0] : [0,0,0,0]} name={name} yAxisId={yAxisId} {...animationProps} />;
      case 'line':
        return <Line type="monotone" dataKey={dataKey} stroke={fillOrStrokeColor} name={name} connectNulls={true} yAxisId={yAxisId} strokeWidth={3} dot={false} activeDot={<CustomActiveDot settings={appSettings} />} {...animationProps} />;
      case 'area':
        return <Area type="monotone" dataKey={dataKey} stroke={fillOrStrokeColor} fill={gradientId ? `url(#${gradientId})` : fillOrStrokeColor} fillOpacity={0.6} name={name} connectNulls={true} yAxisId={yAxisId} strokeWidth={3} activeDot={<CustomActiveDot settings={appSettings} />} {...animationProps} />;
      default:
        return null;
    }
  };


  const renderChartContent = (
    chartConfig: typeof initialChartState,
    displayData: any[],
    chartConfigObj: ChartConfig,
    chartNum: 1 | 2
  ) => {
    const { type: chartType, xAxisField, 
            yAxisField1, yAxisAggregation1, yAxisSeriesType1,
            yAxisField2, yAxisAggregation2, yAxisSeriesType2,
            theme: themeKey } = chartConfig;

    const currentThemeCSS = appSettings.chartThemes[themeKey] || appSettings.chartThemes.default;

    const effectiveYField1 = yAxisField1 || (yAxisAggregation1 === 'count' ? 'count' : undefined);
    const effectiveYField2 = yAxisField2 || (yAxisAggregation2 === 'count' ? 'count2' : undefined);
    
    // Key for yAxisField2 if it's the same field as yAxisField1 (for composed charts with different aggregations)
    const yField2DataKey = (yAxisField1 && yAxisField2 && yAxisField1 === yAxisField2 && yAxisAggregation1 !== yAxisAggregation2) 
                         ? `${yAxisField2}-agg2` 
                         : effectiveYField2;


    if (!canVisualize) {
      return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">No data uploaded. Please upload a file in the 'Upload Data' section.</p>;
    }
    if (!xAxisField || (!effectiveYField1 && chartType !== 'pie' && chartType !== 'radar') || displayData.length === 0) {
        if ((chartType === 'pie' || chartType === 'composed') && xAxisField && displayData.length > 0 && effectiveYField1 && yAxisAggregation1 === 'count') {
            // Allow pie chart with category counts
        } else if (chartType === 'composed' && xAxisField && displayData.length > 0 && (effectiveYField1 || effectiveYField2)) {
            // Allow composed if at least one Y is configured
        }
         else {
             return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Please select valid X and Y axis fields. Ensure Y axis field is numeric or aggregation is 'Count (Non-Empty)'/'Unique Count'.</p>;
        }
    }
    
    const yLabel1Base = yAxisField1 ? yAxisField1.replace(/_/g, ' ') : (yAxisAggregation1 === 'count' ? 'Count' : '');
    const aggLabel1 = aggregationOptions.find(a=>a.value === yAxisAggregation1)?.label || yAxisAggregation1;
    const finalYLabel1 = `${yLabel1Base}${yAxisAggregation1 !== 'count' || yAxisField1 ? ` (${aggLabel1})` : ''}`;

    const yLabel2Base = yAxisField2 ? yAxisField2.replace(/_/g, ' ') : (yAxisAggregation2 === 'count' ? 'Count' : '');
    const aggLabel2 = aggregationOptions.find(a=>a.value === yAxisAggregation2)?.label || yAxisAggregation2;
    const finalYLabel2 = `${yLabel2Base}${yAxisAggregation2 !== 'count' || yAxisField2 ? ` (${aggLabel2})` : ''}`;

    const commonXAxisProps = {
      dataKey: xAxisField,
      stroke: "hsl(var(--foreground))",
      tick: { fontSize: 10, fill: "hsl(var(--foreground))" },
      angle: -45,
      textAnchor: "end" as const,
      height: 60, // Increased height for rotated labels
      interval: 0 as const, // Show all labels
      allowDuplicatedCategory: chartType !== 'bar' && chartType !== 'line' && chartType !== 'area' && chartType !== 'composed',
    };
    const commonYAxisProps1 = {
        yAxisId: "left" as const,
        stroke: "hsl(var(--foreground))",
        tick: { fontSize: 10, fill: "hsl(var(--foreground))" },
        tickFormatter: formatValue,
    };
     const commonYAxisProps2 = {
        yAxisId: "right" as const,
        orientation:"right" as const,
        stroke: "hsl(var(--foreground))",
        tick: { fontSize: 10, fill: "hsl(var(--foreground))" },
        tickFormatter: formatValue,
    };

    const mainChartElementY1 = effectiveYField1 
        ? renderSeriesElement(chartType === 'composed' ? yAxisSeriesType1 : chartType as SeriesChartType, effectiveYField1, chartConfigObj[effectiveYField1]?.color || currentThemeCSS.chart1, chartConfigObj[effectiveYField1]?.label as string || finalYLabel1, "left", getGradientId(chartNum, 1))
        : null;
    
    const overlayChartElementY2 = yField2DataKey && effectiveYField2
        ? renderSeriesElement(chartType === 'composed' ? yAxisSeriesType2 : chartType as SeriesChartType, yField2DataKey, chartConfigObj[yField2DataKey]?.color || currentThemeCSS.chart2, chartConfigObj[yField2DataKey]?.label as string || finalYLabel2, "right", getGradientId(chartNum, 2))
        : null;

    let ChartComponent: any = ReBarChart; // Default to BarChart for simplicity
    if (chartType === 'line') ChartComponent = ReLineChart;
    else if (chartType === 'area') ChartComponent = ReAreaChart;
    else if (chartType === 'composed') ChartComponent = ComposedChart;


    switch (chartType) {
      case 'bar':
      case 'line':
      case 'area':
      case 'composed':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={displayData} margin={chartMargin} barGap={chartType === 'bar' && overlayChartElementY2 && yAxisSeriesType2 === 'bar' ? 2 : undefined} barCategoryGap={chartType === 'bar' && overlayChartElementY2 && yAxisSeriesType2 === 'bar' ? '10%' : undefined}>
              {renderGradientDefs(chartNum, yAxisField1, yAxisField2, yAxisAggregation1, yAxisAggregation2, themeKey)}
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis {...commonXAxisProps}>
                <RechartsLabel value={xAxisField?.replace(/_/g, ' ')} offset={10} position="insideBottom" style={{ fill: "hsl(var(--foreground))", fontSize: '12px' }} />
              </XAxis>
              <YAxis {...commonYAxisProps1} label={{ value: finalYLabel1, angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fontSize: '12px', fill: "hsl(var(--foreground))"}, dy: 40 }}/>
              {overlayChartElementY2 && <YAxis {...commonYAxisProps2} label={{ value: finalYLabel2, angle: -90, position: 'insideRight', style: {textAnchor: 'middle', fontSize: '12px', fill: "hsl(var(--foreground))"}, dy: -40 }}/>}
              <RechartsTooltip content={<ChartTooltipContent formatter={formatValue} />} cursor={{fill: 'hsl(var(--accent)/0.1)'}}/>
              <ChartLegend content={<ChartLegendContent />} />
              {mainChartElementY1}
              {chartType !== 'composed' && overlayChartElementY2} 
              {chartType === 'composed' && overlayChartElementY2}
            </ChartComponent>
          </ResponsiveContainer>
        );
      case 'pie':
         if (!xAxisField || !effectiveYField1 || displayData.length === 0) return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Pie chart requires X-Axis (category) and Y-Axis (value or count aggregation).</p>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
              <RechartsTooltip content={<ChartTooltipContent formatter={formatValue} />} />
              <Pie 
                data={displayData} 
                dataKey={effectiveYField1} 
                nameKey={xAxisField} 
                cx="50%" cy="50%" 
                outerRadius={Math.min(120, window.innerHeight / 5, window.innerWidth / 8)} 
                labelLine={false} 
                label={({ name, percent, fill }) => `${name}: ${(percent * 100).toFixed(appSettings.dataPrecision)}%`}
                isAnimationActive={appSettings.chartAnimationsEnabled}
              >
                {displayData.map((entry, index) => {
                    const itemDataKey = entry[xAxisField] || `item-${index}`; // Use xField value or fallback
                    const colorKey = `chart${(index % 5) + 1}` as keyof typeof currentThemeCSS; // Cycle through chart-1 to chart-5
                    return (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={currentThemeCSS[colorKey] || currentThemeCSS.chart1} 
                            stroke="hsl(var(--card))"
                            strokeWidth={1}
                        />
                    );
                })}
              </Pie>
              <ChartLegend content={<ChartLegendContent wrapperStyle={{ fontSize: '10px' }} />} />
            </RePieChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        if (!effectiveYField1 || !effectiveYField2) return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Scatter plot requires two numeric Y-axis fields (Y-Axis 1 and Y-Axis 2).</p>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReScatterChart margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis type="category" {...commonXAxisProps} dataKey={xAxisField} name={xAxisField?.replace(/_/g, ' ')}>
                 <RechartsLabel value={xAxisField?.replace(/_/g, ' ')} offset={10} position="insideBottom" style={{ fill: "hsl(var(--foreground))", fontSize: '12px' }} />
              </XAxis>
              <YAxis type="number" {...commonYAxisProps1} dataKey={effectiveYField1} name={chartConfigObj[effectiveYField1]?.label as string || finalYLabel1} label={{ value: finalYLabel1, angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fontSize: '12px', fill: "hsl(var(--foreground))"}, dy: 40 }}/>
              <YAxis yAxisId="right" type="number" {...commonYAxisProps2} dataKey={effectiveYField2} name={chartConfigObj[yField2DataKey || effectiveYField2]?.label as string || finalYLabel2} label={{ value: finalYLabel2, angle: -90, position: 'insideRight', style: {textAnchor: 'middle', fontSize: '12px', fill: "hsl(var(--foreground))"}, dy: -40 }}/>
              <ZAxis type="number" range={[50, 500]} dataKey="z" name="size" />
              <RechartsTooltip content={<ChartTooltipContent formatter={formatValue} />} cursor={{ strokeDasharray: '3 3', fill: 'hsl(var(--accent)/0.1)' }} />
              <ChartLegend content={<ChartLegendContent />} />
              {effectiveYField1 && <Scatter name={chartConfigObj[effectiveYField1]?.label as string || finalYLabel1} data={displayData} fill={chartConfigObj[effectiveYField1]?.color || currentThemeCSS.chart1} shape={<circle r={6} />} isAnimationActive={appSettings.chartAnimationsEnabled} />}
            </ReScatterChart>
          </ResponsiveContainer>
        );
      case 'radar':
        if (!xAxisField || !effectiveYField1 || displayData.length === 0) return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Radar chart requires X-Axis (category) and Y-Axis (value).</p>;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReRadarChart cx="50%" cy="50%" outerRadius="70%" data={displayData}>
              {renderGradientDefs(chartNum, yAxisField1, yAxisField2, yAxisAggregation1, yAxisAggregation2, themeKey)}
              <PolarGrid stroke="hsl(var(--border)/0.5)" />
              <PolarAngleAxis dataKey={xAxisField} stroke="hsl(var(--foreground))" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="hsl(var(--foreground))" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} tickFormatter={formatValue}/>
              <RechartsTooltip content={<ChartTooltipContent formatter={formatValue} />} />
              {effectiveYField1 && <ReRadar name={chartConfigObj[effectiveYField1]?.label as string || finalYLabel1} dataKey={effectiveYField1} stroke={chartConfigObj[effectiveYField1]?.color || currentThemeCSS.chart1} fill={`url(#${getGradientId(chartNum, 1)})`} fillOpacity={0.7} strokeWidth={2} isAnimationActive={appSettings.chartAnimationsEnabled} />}
              {effectiveYField2 && effectiveYField2 !== effectiveYField1 && <ReRadar name={chartConfigObj[yField2DataKey || effectiveYField2]?.label as string || finalYLabel2} dataKey={yField2DataKey || effectiveYField2} stroke={chartConfigObj[yField2DataKey || effectiveYField2]?.color || currentThemeCSS.chart2} fill={`url(#${getGradientId(chartNum, 2)})`} fillOpacity={0.7} strokeWidth={2} isAnimationActive={appSettings.chartAnimationsEnabled} />}
              <ChartLegend content={<ChartLegendContent />} />
            </ReRadarChart>
          </ResponsiveContainer>
        );
      default:
        return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Select a chart type to visualize data.</p>;
    }
  };

  const handleExport = (chartDataToExport: any[], chartConfigForExport: typeof initialChartState, chartNum: 1 | 2 = 1) => {
    const { xAxisField, yAxisField1, yAxisAggregation1, yAxisField2, yAxisAggregation2 } = chartConfigForExport;
    
    if (!canVisualize || chartDataToExport.length === 0) {
      toast({ title: "No Data", description: `No data to export for Chart ${chartNum}.`, variant: "destructive" });
      return;
    }
    toast({ title: `Exporting Chart ${chartNum} Data`, description: "Chart data export to CSV started..." });

    const fieldsToExport: string[] = [];
    const headerLabels: string[] = [];
    
    const effectiveYField1 = yAxisField1 || (yAxisAggregation1 === 'count' ? 'count' : undefined);
    const yField2DataKey = (yAxisField1 && yAxisField2 && yAxisField1 === yAxisField2 && yAxisAggregation1 !== yAxisAggregation2) 
                         ? `${yAxisField2}-agg2` 
                         : (yAxisField2 || (yAxisAggregation2 === 'count' ? 'count2' : undefined));


    if(xAxisField) {
        fieldsToExport.push(xAxisField);
        headerLabels.push(xAxisField.replace(/_/g, ' '));
    }
    if(effectiveYField1) {
        fieldsToExport.push(effectiveYField1);
        const baseLabel = yAxisField1 ? yAxisField1.replace(/_/g, ' ') : (yAxisAggregation1 === 'count' ? 'Count' : '');
        const aggLabel = aggregationOptions.find(a => a.value === yAxisAggregation1)?.label || yAxisAggregation1;
        headerLabels.push(`${baseLabel}${yAxisAggregation1 !== 'count' || yAxisField1 ? ` (${aggLabel})` : ''}`);
    }
    if(yField2DataKey && yField2DataKey !== effectiveYField1) {
        fieldsToExport.push(yField2DataKey);
        const baseLabel = yAxisField2 ? yAxisField2.replace(/_/g, ' ') : (yAxisAggregation2 === 'count' ? 'Count' : '');
        const aggLabel = aggregationOptions.find(a => a.value === yAxisAggregation2)?.label || yAxisAggregation2;
        headerLabels.push(`${baseLabel}${yAxisAggregation2 !== 'count' || yAxisField2 ? ` (${aggLabel})` : ''}`);
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
    chartNum: 1 | 2,
    currentChartConfig: typeof initialChartState,
    setChartConfig: React.Dispatch<React.SetStateAction<typeof initialChartState>>
  ) => {
    const { type: chartType, xAxisField, 
            yAxisField1, yAxisAggregation1, yAxisSeriesType1,
            yAxisField2, yAxisAggregation2, yAxisSeriesType2,
            theme: chartTheme } = currentChartConfig;

    const updateChartConfig = (key: keyof typeof initialChartState, value: any) => {
      setChartConfig(prev => {
        const newState = {...prev, [key]: value};
        if (key === 'type') {
            // If primary chart type changes, yAxisSeriesType1 should also change unless it's 'composed'
            if (value !== 'composed') {
                newState.yAxisSeriesType1 = value as SeriesChartType;
            }
            // Reset Y2 if new chart type doesn't support it well (e.g. pie, radar)
            if (value === 'pie' || value === 'radar') {
                newState.yAxisField2 = undefined;
                newState.yAxisAggregation2 = 'sum';
                newState.yAxisSeriesType2 = 'line';
            }
        }
        // If Y1 field is removed for pie/radar, ensure agg is count
        if (key === 'yAxisField1' && !value && (newState.type === 'pie' || newState.type === 'radar')) {
            newState.yAxisAggregation1 = 'count';
        }
         // If Y1 field is set, and current agg is 'count' but field isn't numeric, switch to a more appropriate agg if needed for non-count
        if (key === 'yAxisField1' && value && numericFields.includes(value) && newState.yAxisAggregation1 === 'count' && (newState.type !== 'pie' && newState.type !== 'radar')) {
            // This logic might need refinement: if user explicitly wants count of a numeric field, it should be allowed.
            // The main concern is defaulting to sum/avg if a numeric field is picked.
            // For now, let's assume if they pick a numeric field, they might want sum/avg unless it's pie/radar.
        }

        // If a Y field becomes undefined, reset its series type for composed charts if needed
        if (key === 'yAxisField1' && !value && newState.type === 'composed') newState.yAxisSeriesType1 = 'bar';
        if (key === 'yAxisField2' && !value && newState.type === 'composed') newState.yAxisSeriesType2 = 'line';

        return newState;
      });
    };


    const xAxisOptions = getXAxisOptions(chartType);
    const y1IsOptional = (chartType === 'pie' || chartType === 'radar') && yAxisAggregation1 === 'count';
    const y2Disabled = chartType === 'pie' || chartType === 'radar' || chartType === 'scatter'; // Scatter uses Y2, but not as an overlay series type
    const isComposedChart = chartType === 'composed';
    
    const handleYFieldChange = (
        fieldKey: 'yAxisField1' | 'yAxisField2',
        aggKey: 'yAxisAggregation1' | 'yAxisAggregation2',
        newField: string | undefined
    ) => {
        setChartConfig(prev => {
            const updatedState = { ...prev, [fieldKey]: newField };
            const currentAgg = prev[aggKey];
            const isNumericOnlyAgg = aggregationOptions.find(opt => opt.value === currentAgg)?.numericOnly;
            if (isNumericOnlyAgg && newField && !numericFields.includes(newField)) {
                updatedState[aggKey] = 'count'; // Default to count if non-numeric field selected with numeric agg
                toast({
                    title: "Aggregation Switched",
                    description: `Field '${newField}' is not primarily numeric. Switched aggregation to 'Count (Non-Empty)'.`,
                    variant: "default",
                    duration: 5000,
                });
            }
            return updatedState;
        });
    };

    const handleAggregationChange = (
        fieldKey: 'yAxisField1' | 'yAxisField2',
        aggKey: 'yAxisAggregation1' | 'yAxisAggregation2',
        newAgg: AggregationType
    ) => {
        setChartConfig(prev => {
            const updatedState = { ...prev, [aggKey]: newAgg };
            const currentField = prev[fieldKey];
            const isNumericOnlyAgg = aggregationOptions.find(opt => opt.value === newAgg)?.numericOnly;
            if (isNumericOnlyAgg && currentField && !numericFields.includes(currentField)) {
                 toast({
                    title: "Invalid Aggregation",
                    description: `Aggregation '${aggregationOptions.find(opt => opt.value === newAgg)?.label}' typically requires a numeric field. '${currentField}' may not be suitable.`,
                    variant: "default", // Use default to be less intrusive than destructive
                    duration: 7000,
                });
                // Don't auto-change the aggregation here; let the user decide or see the result.
            }
             // If aggregation is 'count' for pie/radar, yField can be optional
            if (newAgg === 'count' && (updatedState.type === 'pie' || updatedState.type === 'radar') && fieldKey === 'yAxisField1') {
                // yAxisField1 can be undefined
            } else if (!currentField && fieldKey === 'yAxisField1') { // If yField1 is required but not set
                 updatedState[fieldKey] = numericFields[0] || dataFields[0]; // Try to set a default
            }
            return updatedState;
        });
    };


    return (
      <div className="space-y-4">
        {/* Section 1: Chart Type, X-Axis, Theme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-start">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Chart Type</label>
            <Select value={chartType} onValueChange={(val: ChartType) => updateChartConfig('type', val)}>
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
            <Select value={xAxisField} onValueChange={(val) => updateChartConfig('xAxisField', val)} disabled={dataFields.length === 0}>
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
            <Select value={chartTheme} onValueChange={(val: keyof typeof appSettings.chartThemes) => updateChartConfig('theme', val)}>
              <SelectTrigger className="w-full bg-input focus:bg-background">
                <SelectValue placeholder="Select Theme" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(appSettings.chartThemes) as (keyof typeof appSettings.chartThemes)[]).map(themeKey => (
                  <SelectItem key={themeKey} value={themeKey} className="capitalize">
                    <div className="flex items-center gap-2"><Palette className="w-4 h-4" />{themeKey.replace(/_/g, ' ')}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Section 2: Y-Axis 1 Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-1 md:col-span-1">
                <label className="text-sm font-medium text-muted-foreground">Y-Axis 1 Field {y1IsOptional ? '(Optional for Count)' : ''}</label>
                <Select 
                    value={yAxisField1 || NO_FIELD_SELECTED_VALUE}
                    onValueChange={(val) => handleYFieldChange('yAxisField1', 'yAxisAggregation1', val === NO_FIELD_SELECTED_VALUE ? undefined : val)}
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
            </div>
            <div className="space-y-1 md:col-span-1">
                <label className="text-sm font-medium text-muted-foreground">Y-Axis 1 Aggregation</label>
                <Select 
                    value={yAxisAggregation1} 
                    onValueChange={(val: AggregationType) => handleAggregationChange('yAxisField1', 'yAxisAggregation1', val)} 
                    disabled={!yAxisField1 && !y1IsOptional}
                >
                <SelectTrigger className="w-full bg-input focus:bg-background">
                    <SelectValue placeholder="Aggregation" />
                </SelectTrigger>
                <SelectContent>
                    {aggregationOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} 
                        disabled={opt.numericOnly && yAxisField1 && !numericFields.includes(yAxisField1) && !(y1IsOptional && opt.value === 'count')}>
                        {opt.label} {opt.numericOnly && yAxisField1 && !numericFields.includes(yAxisField1) && !y1IsOptional ? "(N)" : ""}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
           {isComposedChart && yAxisField1 && (
            <div className="space-y-1 md:col-span-1">
                <label className="text-sm font-medium text-muted-foreground">Y-Axis 1 Series Type</label>
                <Select value={yAxisSeriesType1} onValueChange={(val: SeriesChartType) => updateChartConfig('yAxisSeriesType1', val)}>
                    <SelectTrigger className="w-full bg-input focus:bg-background">
                        <SelectValue placeholder="Series Type" />
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(seriesChartTypeIcons) as SeriesChartType[]).map(type => {
                            const Icon = seriesChartTypeIcons[type];
                            return <SelectItem key={type} value={type} className="capitalize"><div className="flex items-center gap-2"><Icon className="w-4 h-4" />{type}</div></SelectItem>;
                        })}
                    </SelectContent>
                </Select>
            </div>
            )}
        </div>

        {/* Section 3: Y-Axis 2 Configuration (Optional) */}
        {chartType !== 'pie' && chartType !== 'radar' && chartType !== 'scatter' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-start">
                <div className="space-y-1 md:col-span-1">
                    <label className="text-sm font-medium text-muted-foreground">Y-Axis 2 Field (Optional)</label>
                    <Select
                        value={yAxisField2 || NO_FIELD_SELECTED_VALUE}
                        onValueChange={(val) => handleYFieldChange('yAxisField2', 'yAxisAggregation2', val === NO_FIELD_SELECTED_VALUE ? undefined : val)}
                        disabled={y2Disabled || dataFields.filter(f => f !== yAxisField1).length === 0}
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
                </div>
                <div className="space-y-1 md:col-span-1">
                    <label className="text-sm font-medium text-muted-foreground">Y-Axis 2 Aggregation</label>
                    <Select 
                        value={yAxisAggregation2} 
                        onValueChange={(val: AggregationType) => handleAggregationChange('yAxisField2', 'yAxisAggregation2', val)} 
                        disabled={!yAxisField2 || y2Disabled}
                    >
                    <SelectTrigger className="w-full bg-input focus:bg-background">
                        <SelectValue placeholder="Aggregation" />
                    </SelectTrigger>
                    <SelectContent>
                        {aggregationOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}
                            disabled={opt.numericOnly && yAxisField2 && !numericFields.includes(yAxisField2)}>
                            {opt.label} {opt.numericOnly && yAxisField2 && !numericFields.includes(yAxisField2) ? "(N)" : ""}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                {isComposedChart && yAxisField2 && (
                <div className="space-y-1 md:col-span-1">
                    <label className="text-sm font-medium text-muted-foreground">Y-Axis 2 Series Type</label>
                    <Select value={yAxisSeriesType2} onValueChange={(val: SeriesChartType) => updateChartConfig('yAxisSeriesType2', val)}>
                        <SelectTrigger className="w-full bg-input focus:bg-background">
                            <SelectValue placeholder="Series Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(seriesChartTypeIcons) as SeriesChartType[]).map(type => {
                                const Icon = seriesChartTypeIcons[type];
                                return <SelectItem key={type} value={type} className="capitalize"><div className="flex items-center gap-2"><Icon className="w-4 h-4" />{type}</div></SelectItem>;
                            })}
                        </SelectContent>
                    </Select>
                </div>
                )}
            </div>
        )}
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
        <Card className="bg-background/30 shadow-md">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <CardTitle className="text-xl font-headline text-primary-foreground flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />Chart 1
                </CardTitle>
                <Button
                    onClick={() => handleExport(displayDataChart1, chart1, 1)}
                    variant="outline"
                    size="sm"
                    disabled={!canVisualize || displayDataChart1.length === 0 || !chart1.xAxisField || (!chart1.yAxisField1 && chart1.yAxisAggregation1 !== 'count')}
                >
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Chart 1 Data
                </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {canVisualize && renderConfigControls(1, chart1, setChart1)}
            <ChartContainer config={chart1Config} className="h-[450px] w-full mt-6">
                {renderChartContent(chart1, displayDataChart1, chart1Config, 1)}
            </ChartContainer>
          </CardContent>
        </Card>
        

        <Separator className="my-12 bg-border/50" />

        {/* Chart 2 Section */}
         <Card className="bg-background/30 shadow-md">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                 <CardTitle className="text-xl font-headline text-primary-foreground flex items-center gap-2">
                    <BarChartHorizontal className="h-5 w-5 text-secondary" />Chart 2
                </CardTitle>
                <Button
                    onClick={() => handleExport(displayDataChart2, chart2, 2)}
                    variant="outline"
                    size="sm"
                    disabled={!canVisualize || displayDataChart2.length === 0 || !chart2.xAxisField || (!chart2.yAxisField1 && chart2.yAxisAggregation1 !== 'count')}
                >
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Chart 2 Data
                </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
           {canVisualize && renderConfigControls(2, chart2, setChart2)}
            <ChartContainer config={chart2Config} className="h-[450px] w-full mt-6">
                {renderChartContent(chart2, displayDataChart2, chart2Config, 2)}
            </ChartContainer>
          </CardContent>
        </Card>

      </CardContent>
       <CardFooter className="pt-6 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Chart rendering is optimized for clarity. For very large datasets, consider filtering or summarizing data first for best performance.
          Tooltips display values formatted to {appSettings.dataPrecision} decimal place(s).
        </p>
      </CardFooter>
    </Card>
  );
}
