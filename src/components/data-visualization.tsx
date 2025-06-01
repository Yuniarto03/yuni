

"use client";

import React, { useState, useMemo, useEffect, useCallback, ReactNode, useRef } from 'react';
import { BarChart3, PieChart as PieIcon, ScatterChart as ScatterIcon, Radar as RadarIcon, AreaChart as AreaIcon, LineChart as LineChartIcon, Settings2, FileSpreadsheet, Info, Palette, LayoutDashboard, Droplets, BarChartHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart as ReBarChart, CartesianGrid, XAxis, YAxis, Line, LineChart as ReLineChart, Pie, PieChart as RePieChart, Area, AreaChart as ReAreaChart, Scatter, ScatterChart as ReScatterChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadarChart as ReRadarChart, Radar as ReRadar, Label as RechartsLabel, Tooltip as RechartsTooltip, Cell, ZAxis, ComposedChart, LabelList } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { useSettings } from '@/contexts/settings-context'; 

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
  composed: LayoutDashboard,
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

const chartMargin = { top: 20, right: 30, left: 20, bottom: 80 }; 

const CustomActiveDot = (props: any) => {
  const { cx, cy, stroke, settings: hookSettings } = props; 
  const dotRadius = hookSettings.chartAnimationsEnabled ? 5 : 4; // Slightly larger base
  const pulseRadius = hookSettings.chartAnimationsEnabled ? 8 : 5; // Slightly larger pulse

  if (!cx || !cy) return null;

  return (
    <g>
      <circle cx={cx} cy={cy} r={pulseRadius} fill={stroke} fillOpacity={0.2} stroke="none">
        {hookSettings.chartAnimationsEnabled && (
          <>
            <animate attributeName="r" from={pulseRadius} to={pulseRadius + 4} dur="1.2s" begin="0s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" from={0.3} to={0} dur="1.2s" begin="0s" repeatCount="indefinite" />
          </>
        )}
      </circle>
      <circle cx={cx} cy={cy} r={dotRadius + 1.5} fill="hsl(var(--background))" /> 
      <circle cx={cx} cy={cy} r={dotRadius} fill={stroke} stroke="hsl(var(--background))" strokeWidth={1.5} />
    </g>
  );
};

const SimpleDataLabel = (props: any) => {
  const { x, y, width, value, fill } = props;
  if (value === undefined || value === null) return null;
  // For bar charts, position label above the bar
  const yPos = y - 5; 
  return (
    <text x={x + width / 2} y={yPos} fill={fill || "hsl(var(--chart-text-light))"} textAnchor="middle" dy={0} fontSize={10} fontFamily="Rajdhani, sans-serif">
      {Number(value).toLocaleString(undefined, {maximumFractionDigits: 1})}
    </text>
  );
};


export function DataVisualization({ uploadedData, dataFields, currentDatasetIdentifier }: DataVisualizationProps) {
  const appSettings = useSettings();
  const { toast } = useToast();
  const justLoadedDataRef = useRef(false);
  
  const initialChartState = useMemo(() => ({
    type: 'bar' as ChartType,
    xAxisField: undefined as string | undefined,
    yAxisField1: undefined as string | undefined,
    yAxisAggregation1: 'sum' as AggregationType,
    yAxisSeriesType1: 'bar' as SeriesChartType,
    yAxisField2: undefined as string | undefined,
    yAxisAggregation2: 'sum' as AggregationType,
    yAxisSeriesType2: 'line' as SeriesChartType,
    theme: appSettings.theme,
  }), [appSettings.theme]);

  const [chart1, setChart1] = useState(() => ({...initialChartState}));
  const [chart2, setChart2] = useState(() => ({ ...initialChartState, type: 'line' as ChartType, theme: appSettings.chartThemes[appSettings.theme] ? appSettings.theme : 'default', yAxisSeriesType1: 'line' as SeriesChartType }));


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

  const getXAxisOptions = useCallback((chartType: ChartType) => {
    if (chartType === 'pie' || chartType === 'radar') return categoricalFields.length > 0 ? categoricalFields : dataFields.filter(f => !numericFields.includes(f));
    if (chartType === 'composed') return dataFields; 
    return dataFields;
  }, [dataFields, categoricalFields, numericFields]);

  useEffect(() => {
    const createResetState = (currentType: ChartType, currentTheme: keyof typeof appSettings.chartThemes) => {
        let seriesType1 = currentType as SeriesChartType;
        if (currentType === 'composed') seriesType1 = 'bar';

        return {
          type: currentType,
          theme: currentTheme,
          xAxisField: undefined as string | undefined,
          yAxisField1: undefined as string | undefined,
          yAxisAggregation1: 'sum' as AggregationType,
          yAxisSeriesType1: seriesType1,
          yAxisField2: undefined as string | undefined,
          yAxisAggregation2: 'sum' as AggregationType,
          yAxisSeriesType2: 'line' as SeriesChartType,
        };
      };

    if (uploadedData.length > 0 && dataFields.length > 0) {
      setChart1(prev => createResetState(prev.type, prev.theme));
      setChart2(prev => createResetState(prev.type, prev.theme));
      justLoadedDataRef.current = true;

      const toastTimerId = setTimeout(() => {
        toast({
          title: "Data Loaded & Charts Reset",
          description: "Data is ready. Please select fields for X and Y axes to build your charts. All previous selections have been cleared.",
          duration: 6000,
        });
      }, 0);


      const justLoadedTimerId = setTimeout(() => {
        justLoadedDataRef.current = false;
      }, 100); 
      
      return () => {
        clearTimeout(justLoadedTimerId);
        clearTimeout(toastTimerId);
      };

    } else if (uploadedData.length === 0) {
      setChart1(initialChartState);
      setChart2({ ...initialChartState, type: 'line' as ChartType, theme: appSettings.chartThemes[appSettings.theme] ? appSettings.theme : 'default', yAxisSeriesType1: 'line' as SeriesChartType });
      justLoadedDataRef.current = false;
    }
  }, [uploadedData, dataFields, initialChartState, appSettings.theme, toast]);


  const setDefaultFields = useCallback((
    currentChartConfig: typeof chart1, 
    setChartConfig: React.Dispatch<React.SetStateAction<typeof chart1>>
  ) => {
    if (dataFields.length > 0) {
        const newXOptions = getXAxisOptions(currentChartConfig.type);
        let updatedX = currentChartConfig.xAxisField;
        
        if (!updatedX || !newXOptions.includes(updatedX)) {
            updatedX = newXOptions[0] || dataFields[0];
        }

        let updatedY1 = currentChartConfig.yAxisField1;
        const y1IsOptionalForCurrentAgg = (currentChartConfig.type === 'pie' || currentChartConfig.type === 'radar') && currentChartConfig.yAxisAggregation1 === 'count';
        const y1IsRequired = !y1IsOptionalForCurrentAgg;
        
        if (y1IsRequired && (!updatedY1 || !dataFields.includes(updatedY1))) {
            updatedY1 = numericFields[0] || dataFields.find(f => f !== updatedX);
        } else if (y1IsRequired && updatedY1 && !numericFields.includes(updatedY1) && aggregationOptions.find(opt => opt.value === currentChartConfig.yAxisAggregation1)?.numericOnly) {
            updatedY1 = numericFields[0] || dataFields.find(f => f !== updatedX);
        }

        let updatedY2 = currentChartConfig.yAxisField2;
        const availableY2 = numericFields.filter(f => f !== updatedY1 && dataFields.includes(f));
        if (updatedY2 && !availableY2.includes(updatedY2)) {
             updatedY2 = availableY2[0] || undefined;
        }
        
        const updatedSeriesType1 = (currentChartConfig.type === 'composed' ? currentChartConfig.yAxisSeriesType1 : currentChartConfig.type) as SeriesChartType;
        const updatedSeriesType2 = (currentChartConfig.type === 'composed' ? currentChartConfig.yAxisSeriesType2 : 'line') as SeriesChartType;
        
        setChartConfig(prev => ({
            ...prev,
            xAxisField: updatedX,
            yAxisField1: updatedY1,
            yAxisSeriesType1: updatedSeriesType1,
            yAxisField2: updatedY2,
            yAxisSeriesType2: updatedSeriesType2,
        }));
    }
  }, [dataFields, numericFields, getXAxisOptions]);


  useEffect(() => {
    if (justLoadedDataRef.current) return;
    if (dataFields.length > 0 && chart1.type) {
        const xOptions = getXAxisOptions(chart1.type);
        const y1IsOptionalForCurrentAgg = (chart1.type === 'pie' || chart1.type === 'radar') && chart1.yAxisAggregation1 === 'count';
        const y1IsEffectivelyMissingOrInvalid =
            (!chart1.yAxisField1 && !y1IsOptionalForCurrentAgg) || 
            (chart1.yAxisField1 && !dataFields.includes(chart1.yAxisField1)) ||
            (chart1.yAxisField1 && aggregationOptions.find(opt => opt.value === chart1.yAxisAggregation1)?.numericOnly && !numericFields.includes(chart1.yAxisField1));
        
        if ((!chart1.xAxisField || (chart1.xAxisField && !xOptions.includes(chart1.xAxisField)) || y1IsEffectivelyMissingOrInvalid)) {
             setDefaultFields(chart1, setChart1);
        }
    }
  }, [dataFields, chart1.type, chart1.xAxisField, chart1.yAxisField1, chart1.yAxisAggregation1, numericFields, chart1.yAxisSeriesType1, setDefaultFields, getXAxisOptions]);

  useEffect(() => {
    if (justLoadedDataRef.current) return;
     if (dataFields.length > 0 && chart2.type) {
        const xOptions = getXAxisOptions(chart2.type);
        const y1IsOptionalForCurrentAgg = (chart2.type === 'pie' || chart2.type === 'radar') && chart2.yAxisAggregation1 === 'count';
        const y1IsEffectivelyMissingOrInvalid =
            (!chart2.yAxisField1 && !y1IsOptionalForCurrentAgg) ||
            (chart2.yAxisField1 && !dataFields.includes(chart2.yAxisField1)) ||
            (chart2.yAxisField1 && aggregationOptions.find(opt => opt.value === chart2.yAxisAggregation1)?.numericOnly && !numericFields.includes(chart2.yAxisField1));

        if ((!chart2.xAxisField || (chart2.xAxisField && !xOptions.includes(chart2.xAxisField)) || y1IsEffectivelyMissingOrInvalid)) {
            setDefaultFields(chart2, setChart2);
        }
    }
  }, [dataFields, chart2.type, chart2.xAxisField, chart2.yAxisField1, chart2.yAxisAggregation1, numericFields, chart2.yAxisSeriesType1, setDefaultFields, getXAxisOptions]);
  
  useEffect(() => {
    setChart1(prev => ({ ...prev, theme: appSettings.theme }));
    setChart2(prev => {
      if (prev.theme === 'default' || !Object.keys(appSettings.chartThemes).includes(prev.theme)) {
        return { ...prev, theme: appSettings.theme };
      }
      return prev;
    });
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
        if((chartTypeForProcessing === 'pie' || chartTypeForProcessing === 'composed' || chartTypeForProcessing === 'radar') && xField && yAgg1 === 'count'){ // Adjusted to include radar
             const categoryCounts: Record<string, number> = {};
             data.forEach(item => {
                 const categoryValue = item[xField];
                 if (categoryValue !== null && categoryValue !== undefined && String(categoryValue).trim() !== "") {
                    const category = String(categoryValue);
                    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                 }
             });
             const effectiveYField1ForCount = 'count';
             return Object.entries(categoryCounts).map(([name, value]) => ({ [xField]: name, [effectiveYField1ForCount]: value }));
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
      } else if (yAgg2 === 'count' && chartTypeForProcessing === 'composed') { 
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
          return Math.sqrt(Math.max(0, variance)); 
        default: return 0;
      }
    };
    
    let result = Object.entries(groupedData).map(([xValue, group]) => {
      const aggregated: Record<string, any> = { [xField]: xValue };
      const effectiveYField1 = yField1 || (yAgg1 === 'count' ? 'count' : 'value1');
      const effectiveYField2 = yField2 || (yAgg2 === 'count' ? 'count2' : 'value2');

      aggregated[effectiveYField1] = aggregate(group.values1, group.numericValues1, group.uniqueSet1, yAgg1);
      
      if (yField2 || (yAgg2 === 'count' && chartTypeForProcessing === 'composed')) { 
         aggregated[effectiveYField2] = aggregate(group.values2, group.numericValues2, group.uniqueSet2, yAgg2);
      }
      return aggregated;
    });
    
    if (['line', 'area', 'bar', 'composed'].includes(chartTypeForProcessing) && xField && dataFields.includes(xField)) {
        const sampleXValue = uploadedData.find(d => d[xField] !== null && d[xField] !== undefined)?.[xField];
        if (sampleXValue && !isNaN(new Date(sampleXValue).getTime())) {
            result.sort((a, b) => {
                const dateA = new Date(a[xField]).getTime();
                const dateB = new Date(b[xField]).getTime();
                return (isNaN(dateA) || isNaN(dateB)) ? 0 : dateA - dateB;
            });
        } else if (typeof sampleXValue === 'number') {
            result.sort((a,b) => (a[xField] as number) - (b[xField] as number));
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
    } else if (effectiveYField2 && effectiveYField2 === effectiveYField1 && yField1 && yField2) { 
      const label2 = effectiveYField2.replace(/_/g, ' ');
      const aggLabel2 = aggregationOptions.find(a => a.value === yAgg2)?.label || yAgg2;
      config[`${effectiveYField2}-agg2`] = { label: `${label2}${yAgg2 !== 'count' || yField2 ? ` (${aggLabel2})` : ''}`, color: currentThemeCSS.chart2 };
    }
    return config;
  };

  const chart1Config = useMemo(() => getChartConfig(chart1.yAxisField1, chart1.yAxisField2, chart1.theme, chart1.yAxisAggregation1, chart1.yAxisAggregation2), [chart1, appSettings.chartThemes]);
  const chart2Config = useMemo(() => getChartConfig(chart2.yAxisField1, chart2.yAxisField2, chart2.theme, chart2.yAxisAggregation1, chart2.yAxisAggregation2), [chart2, appSettings.chartThemes]);

  const canVisualize = uploadedData.length > 0 && dataFields.length > 0;

  const getGradientId = (chartNum: 1 | 2, seriesNum: 1 | 2) => `chart${chartNum}Gradient${seriesNum}`;

  const renderGradientDefs = (
    chartNum: 1 | 2,
    yField1?: string, yField2?: string,
    yAgg1?: AggregationType, yAgg2?: AggregationType,
    themeKey: keyof typeof appSettings.chartThemes = 'default'
  ) => {
    const currentThemeCSS = appSettings.chartThemes[themeKey] || appSettings.chartThemes.default;
    const defs: ReactNode[] = [];
  
    const createGradient = (field: string | undefined, colorCssVarKey: keyof typeof currentThemeCSS, gradientId: string) => {
      if (field) {
        const color = currentThemeCSS[colorCssVarKey] || currentThemeCSS.chart1; // Fallback to chart1
        // Using HSL string directly in stopColor, opacity controlled by stopOpacity
        defs.push(
          <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.6} /> {/* Semi-transparent start */}
            <stop offset="95%" stopColor={color} stopOpacity={0.1} /> {/* More transparent end */}
          </linearGradient>
        );
      }
    };
  
    const effectiveYField1 = yField1 || (yAgg1 === 'count' ? 'count' : undefined);
    createGradient(effectiveYField1, 'chart1', getGradientId(chartNum, 1));
  
    const effectiveYField2 = yField2 || (yAgg2 === 'count' ? 'count2' : undefined);
    if (effectiveYField2 && effectiveYField2 !== effectiveYField1) {
      createGradient(effectiveYField2, 'chart2', getGradientId(chartNum, 2));
    }
    return defs.length > 0 ? <defs>{defs}</defs> : null;
  };
  
  const renderSeriesElement = (
    seriesType: SeriesChartType, 
    dataKey: string, 
    strokeColor: string, // For lines, and border of bars/areas
    fillColor: string, // For fills (can be a gradient URL)
    name: string, 
    yAxisId: "left" | "right"
  ) => {
    const animationProps = { 
        isAnimationActive: appSettings.chartAnimationsEnabled, 
        animationDuration: 1500, 
        animationEasing: 'easeOutQuart' as const 
    };
    const radiusSetting: [number, number, number, number] = appSettings.chartAnimationsEnabled ? [6, 6, 0, 0] : [0,0,0,0]; // Rounded top corners for bars
    
    const commonDataLabelProps = {
        fill: "hsl(var(--chart-text-light))",
        fontSize: 10,
        fontFamily: "Rajdhani, sans-serif",
        formatter: (value: number) => value.toLocaleString(undefined, {maximumFractionDigits: 1}),
    };

    switch (seriesType) {
      case 'bar':
        return <Bar dataKey={dataKey} fill={fillColor} stroke={strokeColor} strokeWidth={1} radius={radiusSetting} name={name} yAxisId={yAxisId} {...animationProps} label={<LabelList dataKey={dataKey} position="top" {...commonDataLabelProps} />} />;
      case 'line':
        return <Line type="monotone" dataKey={dataKey} stroke={strokeColor} name={name} connectNulls={true} yAxisId={yAxisId} strokeWidth={2.5} dot={{ r: 3, fill: strokeColor, strokeWidth:1, stroke: 'hsl(var(--background))' }} activeDot={<CustomActiveDot settings={appSettings} />} {...animationProps} label={<LabelList dataKey={dataKey} position="top" {...commonDataLabelProps} offset={8} />} />;
      case 'area':
        return <Area type="monotone" dataKey={dataKey} stroke={strokeColor} fill={fillColor} fillOpacity={1} name={name} connectNulls={true} yAxisId={yAxisId} strokeWidth={2.5} dot={{ r: 3, fill: strokeColor, strokeWidth:1, stroke: 'hsl(var(--background))' }} activeDot={<CustomActiveDot settings={appSettings} />} {...animationProps} label={<LabelList dataKey={dataKey} position="top" {...commonDataLabelProps} offset={8} />} />;
      default:
        return null;
    }
  };


  const renderChartContent = (
    chartConfigState: typeof chart1, 
    displayData: any[],
    currentChartDisplayConfig: ChartConfig, 
    chartNum: 1 | 2
  ) => {
    const { type: chartType, xAxisField, 
            yAxisField1, yAxisAggregation1, yAxisSeriesType1,
            yAxisField2, yAxisAggregation2, yAxisSeriesType2,
            theme: themeKey } = chartConfigState;

    const currentThemeCSS = appSettings.chartThemes[themeKey] || appSettings.chartThemes.default;

    const effectiveYField1 = yAxisField1 || (yAxisAggregation1 === 'count' ? 'count' : undefined);
    const effectiveYField2 = yAxisField2 || (yAxisAggregation2 === 'count' ? 'count2' : undefined);
    
    const yField2DataKey = (yAxisField1 && yAxisField2 && yAxisField1 === yAxisField2 && yAxisAggregation1 !== yAxisAggregation2) 
                         ? `${yAxisField2}-agg2` 
                         : effectiveYField2;


    if (!canVisualize) {
      return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">No data uploaded. Please upload a file in the 'Upload Data' section.</p>;
    }
    
    const pieRadarMissingReqs = (chartType === 'pie' || chartType === 'radar') && (!xAxisField || (!effectiveYField1 && yAxisAggregation1 !== 'count'));
    const otherChartsMissingReqs = (chartType !== 'pie' && chartType !== 'radar' && chartType !== 'composed') && (!xAxisField || !effectiveYField1);
    const composedChartMissingReqs = chartType === 'composed' && (!xAxisField || (!effectiveYField1 && !effectiveYField2));

    if ( pieRadarMissingReqs || otherChartsMissingReqs || composedChartMissingReqs || displayData.length === 0 ) {
       return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Please select valid X and Y axis fields. Ensure Y axis field is numeric for certain aggregations.</p>;
    }
    
    const yLabel1Base = yAxisField1 ? yAxisField1.replace(/_/g, ' ') : (yAxisAggregation1 === 'count' ? 'Count' : '');
    const aggLabel1 = aggregationOptions.find(a=>a.value === yAxisAggregation1)?.label || yAxisAggregation1;
    const finalYLabel1 = `${yLabel1Base}${yAxisAggregation1 !== 'count' || yAxisField1 ? ` (${aggLabel1})` : ''}`;

    const yLabel2Base = yAxisField2 ? yAxisField2.replace(/_/g, ' ') : (yAxisAggregation2 === 'count' ? 'Count' : '');
    const aggLabel2 = aggregationOptions.find(a=>a.value === yAxisAggregation2)?.label || yAxisAggregation2;
    const finalYLabel2 = `${yLabel2Base}${yAxisAggregation2 !== 'count' || yAxisField2 ? ` (${aggLabel2})` : ''}`;
    
    const commonFontStyle = { fontFamily: 'Rajdhani, sans-serif', fontSize: 11 };
    const titleFontStyle = { fontFamily: 'Orbitron, sans-serif', fontSize: 12, fill: 'hsl(var(--primary))' };


    const commonXAxisProps = {
      dataKey: xAxisField,
      stroke: "hsl(var(--chart-text-light))",
      tick: { ...commonFontStyle, fill: "hsl(var(--chart-text-light))" },
      angle: -45,
      textAnchor: "end" as const,
      height: 60, 
      interval: 'preserveStartEnd' as const, 
      allowDuplicatedCategory: chartType !== 'bar' && chartType !== 'line' && chartType !== 'area' && chartType !== 'composed',
    };
    const commonYAxisProps1 = {
        yAxisId: "left" as const,
        stroke: "hsl(var(--chart-text-light))",
        tick: { ...commonFontStyle, fill: "hsl(var(--chart-text-light))" },
        tickFormatter: formatValue,
    };
     const commonYAxisProps2 = {
        yAxisId: "right" as const,
        orientation:"right" as const,
        stroke: "hsl(var(--chart-text-light))",
        tick: { ...commonFontStyle, fill: "hsl(var(--chart-text-light))" },
        tickFormatter: formatValue,
    };

    const mainChartElementY1 = effectiveYField1 
        ? renderSeriesElement(
            chartType === 'composed' ? yAxisSeriesType1 : chartType as SeriesChartType, 
            effectiveYField1, 
            currentChartDisplayConfig[effectiveYField1]?.color || currentThemeCSS.chart1, // stroke color
            chartType === 'line' ? (currentChartDisplayConfig[effectiveYField1]?.color || currentThemeCSS.chart1) : `url(#${getGradientId(chartNum, 1)})`, // fill color (gradient for bar/area)
            currentChartDisplayConfig[effectiveYField1]?.label as string || finalYLabel1, 
            "left"
          )
        : null;
    
    const overlayChartElementY2 = yField2DataKey && effectiveYField2 && chartType === 'composed' 
        ? renderSeriesElement(
            yAxisSeriesType2, 
            yField2DataKey, 
            currentChartDisplayConfig[yField2DataKey]?.color || currentThemeCSS.chart2, // stroke color
            yAxisSeriesType2 === 'line' ? (currentChartDisplayConfig[yField2DataKey]?.color || currentThemeCSS.chart2) : `url(#${getGradientId(chartNum, 2)})`, // fill color
            currentChartDisplayConfig[yField2DataKey]?.label as string || finalYLabel2, 
            "right"
          )
        : null;
    
    let ChartComponent: any = ReBarChart; 
    if (chartType === 'line') ChartComponent = ReLineChart;
    else if (chartType === 'area') ChartComponent = ReAreaChart;
    else if (chartType === 'composed') ChartComponent = ComposedChart;


    switch (chartType) {
      case 'bar':
      case 'line':
      case 'area':
      case 'composed':
        return (
            <ChartComponent data={displayData} margin={chartMargin} barGap={(chartType === 'bar' || (chartType === 'composed' && yAxisSeriesType1 === 'bar' && yAxisSeriesType2 === 'bar')) && overlayChartElementY2 ? 2 : undefined} barCategoryGap={(chartType === 'bar' || (chartType === 'composed' && yAxisSeriesType1 === 'bar' && yAxisSeriesType2 === 'bar')) && overlayChartElementY2 ? '10%' : undefined}>
              {renderGradientDefs(chartNum, yAxisField1, yAxisField2, yAxisAggregation1, yAxisAggregation2, themeKey)}
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.1)" />
              <XAxis {...commonXAxisProps} label={{ value: xAxisField?.replace(/_/g, ' '), ...titleFontStyle, position: 'insideBottom', offset: 15, dy:15 }}/>
              <YAxis {...commonYAxisProps1} label={{ value: finalYLabel1, angle: -90, ...titleFontStyle, position: 'insideLeft', style: {textAnchor: 'middle', ...titleFontStyle}, dy: 60 }}/>
              {overlayChartElementY2 && <YAxis {...commonYAxisProps2} label={{ value: finalYLabel2, angle: -90, ...titleFontStyle, position: 'insideRight', style: {textAnchor: 'middle', ...titleFontStyle}, dy: -60 }}/>}
              <RechartsTooltip 
                content={<ChartTooltipContent formatter={formatValue} />} 
                cursor={{fill: 'hsl(var(--accent)/0.1)'}}
                wrapperStyle={{ outline: 'none' }}
                itemStyle={{fontFamily: 'Rajdhani, sans-serif', fontSize: '12px'}}
                labelStyle={{fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: 'hsl(var(--primary))'}}
                payloadCreator={(payload) => payload.map(p => ({...p, color: p.stroke || p.fill }))} // Ensure color for legend in tooltip
              />
              <ChartLegend content={<ChartLegendContent nameKey="label" itemStyle={{fontFamily: 'Orbitron, sans-serif', fontSize: '12px', color: 'hsl(var(--chart-text-light))'}}/>} verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}}/>
              {mainChartElementY1}
              {overlayChartElementY2}
            </ChartComponent>
        );
      case 'pie':
         if (!xAxisField || !effectiveYField1 || displayData.length === 0) return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Pie chart requires X-Axis (category) and Y-Axis (value or count aggregation).</p>;
        const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, ...rest }: any) => {
          const RADIAN = Math.PI / 180;
          const radius = innerRadius + (outerRadius - innerRadius) * 0.6; // Position label further inside
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);
          const percentValue = (percent * 100).toFixed(appSettings.dataPrecision);

          return (
            <text
              x={x}
              y={y}
              fill={"hsl(var(--chart-text-light))"} 
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10 }}
            >
              {`${name}: ${percentValue}%`}
            </text>
          );
        };
        return (
            <RePieChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
              <RechartsTooltip 
                content={<ChartTooltipContent formatter={formatValue} />}
                wrapperStyle={{ outline: 'none' }}
                itemStyle={{fontFamily: 'Rajdhani, sans-serif', fontSize: '12px'}}
                labelStyle={{fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: 'hsl(var(--primary))'}}
              />
              <Pie 
                data={displayData} 
                dataKey={effectiveYField1} 
                nameKey={xAxisField} 
                cx="50%" cy="50%" 
                outerRadius={Math.min(130, window.innerHeight / 4.5, window.innerWidth / 7)} 
                labelLine={false} 
                label={renderCustomizedPieLabel}
                animationDuration={1500}
                animationEasing="easeOutQuart"
                isAnimationActive={appSettings.chartAnimationsEnabled}
              >
                {displayData.map((entry, index) => {
                    const itemDataKey = entry[xAxisField] || `item-${index}`; 
                    const colorKey = `chart${(index % 5) + 1}` as keyof typeof currentThemeCSS; 
                    const cellColor = currentChartDisplayConfig[itemDataKey]?.color || currentThemeCSS[colorKey] || currentThemeCSS.chart1;
                    return (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={cellColor}
                            stroke={"hsl(var(--card))"}
                            strokeWidth={2}
                        />
                    );
                })}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="label" itemStyle={{fontFamily: 'Orbitron, sans-serif', fontSize: '12px', color: 'hsl(var(--chart-text-light))'}}/>} verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}}/>
            </RePieChart>
        );
      case 'scatter':
        if (!xAxisField || !effectiveYField1 ) return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Scatter plot requires an X-Axis field and at least one Y-axis field.</p>;
        return (
            <ReScatterChart margin={chartMargin} animationDuration={1500} animationEasing="easeOutQuart">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.1)" />
              <XAxis type="category" {...commonXAxisProps} dataKey={xAxisField} name={xAxisField?.replace(/_/g, ' ')} label={{ value: xAxisField?.replace(/_/g, ' '), ...titleFontStyle, position: 'insideBottom', offset: 15, dy:15 }}>
              </XAxis>
              <YAxis type="number" {...commonYAxisProps1} dataKey={effectiveYField1} name={currentChartDisplayConfig[effectiveYField1]?.label as string || finalYLabel1} label={{ value: finalYLabel1, angle: -90, ...titleFontStyle, position: 'insideLeft', style: {textAnchor: 'middle', ...titleFontStyle}, dy: 60 }}/>
              { yAxisField2 && yField2DataKey && <YAxis yAxisId="right" type="number" {...commonYAxisProps2} dataKey={yField2DataKey} name={currentChartDisplayConfig[yField2DataKey]?.label as string || finalYLabel2} label={{ value: finalYLabel2, angle: -90, ...titleFontStyle, position: 'insideRight', style: {textAnchor: 'middle', ...titleFontStyle}, dy: -60 }}/>}
              <ZAxis type="number" range={[50, 400]} dataKey="z" name="size" /> 
              <RechartsTooltip 
                content={<ChartTooltipContent formatter={formatValue} />} 
                cursor={{ strokeDasharray: '3 3', fill: 'hsl(var(--accent)/0.1)' }}
                wrapperStyle={{ outline: 'none' }}
                itemStyle={{fontFamily: 'Rajdhani, sans-serif', fontSize: '12px'}}
                labelStyle={{fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: 'hsl(var(--primary))'}}
              />
              <ChartLegend content={<ChartLegendContent nameKey="label" itemStyle={{fontFamily: 'Orbitron, sans-serif', fontSize: '12px', color: 'hsl(var(--chart-text-light))'}}/>} verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}}/>
              {effectiveYField1 && <Scatter name={currentChartDisplayConfig[effectiveYField1]?.label as string || finalYLabel1} data={displayData} fill={currentChartDisplayConfig[effectiveYField1]?.color || currentThemeCSS.chart1} shape={<circle r={5} />} isAnimationActive={appSettings.chartAnimationsEnabled} yAxisId="left" />}
              {yAxisField2 && yField2DataKey && effectiveYField2 && <Scatter name={currentChartDisplayConfig[yField2DataKey]?.label as string || finalYLabel2} data={displayData} fill={currentChartDisplayConfig[yField2DataKey]?.color || currentThemeCSS.chart2} shape={<circle r={5} />} isAnimationActive={appSettings.chartAnimationsEnabled} yAxisId="right" />}
            </ReScatterChart>
        );
      case 'radar':
        if (!xAxisField || !effectiveYField1 || displayData.length === 0) return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Radar chart requires X-Axis (category) and Y-Axis (value).</p>;
        return (
            <ReRadarChart cx="50%" cy="50%" outerRadius="70%" data={displayData} animationDuration={1500} animationEasing="easeOutQuart">
              {renderGradientDefs(chartNum, yAxisField1, yAxisField2, yAxisAggregation1, yAxisAggregation2, themeKey)}
              <PolarGrid stroke="hsl(var(--primary) / 0.2)" />
              <PolarAngleAxis dataKey={xAxisField} stroke="hsl(var(--chart-text-light))" tick={{ ...commonFontStyle, fill: "hsl(var(--chart-text-light))" }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="hsl(var(--chart-text-light))" tick={{ ...commonFontStyle, fill: "hsl(var(--chart-text-light))", showBackdrop: false }} tickFormatter={formatValue}/>
              <RechartsTooltip 
                content={<ChartTooltipContent formatter={formatValue} />}
                wrapperStyle={{ outline: 'none' }}
                itemStyle={{fontFamily: 'Rajdhani, sans-serif', fontSize: '12px'}}
                labelStyle={{fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: 'hsl(var(--primary))'}}
              />
              {effectiveYField1 && <ReRadar name={currentChartDisplayConfig[effectiveYField1]?.label as string || finalYLabel1} dataKey={effectiveYField1} stroke={currentChartDisplayConfig[effectiveYField1]?.color || currentThemeCSS.chart1} fill={`url(#${getGradientId(chartNum, 1)})`} fillOpacity={0.7} strokeWidth={2.5} isAnimationActive={appSettings.chartAnimationsEnabled} />}
              {effectiveYField2 && effectiveYField2 !== effectiveYField1 && yField2DataKey && <ReRadar name={currentChartDisplayConfig[yField2DataKey]?.label as string || finalYLabel2} dataKey={yField2DataKey} stroke={currentChartDisplayConfig[yField2DataKey]?.color || currentThemeCSS.chart2} fill={`url(#${getGradientId(chartNum, 2)})`} fillOpacity={0.7} strokeWidth={2.5} isAnimationActive={appSettings.chartAnimationsEnabled} />}
              <ChartLegend content={<ChartLegendContent nameKey="label" itemStyle={{fontFamily: 'Orbitron, sans-serif', fontSize: '12px', color: 'hsl(var(--chart-text-light))'}}/>} verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}}/>
            </ReRadarChart>
        );
      default:
        return <p className="text-muted-foreground text-center p-10 h-full flex items-center justify-center">Select a chart type to visualize data.</p>;
    }
  };

  const handleExport = (chartDataToExport: any[], chartConfigForExport: typeof chart1, chartNum: 1 | 2 = 1) => {
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
    currentChartConfig: typeof chart1,
    setChartConfig: React.Dispatch<React.SetStateAction<typeof chart1>>
  ) => {
    const { type: chartType, xAxisField, 
            yAxisField1, yAxisAggregation1, yAxisSeriesType1,
            yAxisField2, yAxisAggregation2, yAxisSeriesType2,
            theme: chartTheme } = currentChartConfig;

    const updateChartConfig = (key: keyof typeof chart1, value: any) => {
      setChartConfig(prev => {
        const newState = {...prev, [key]: value};
        if (key === 'type') {
            if (value !== 'composed') {
                newState.yAxisSeriesType1 = value as SeriesChartType; 
                 if (value === 'pie' || value === 'radar' || value === 'scatter') {
                    newState.yAxisField2 = undefined; // Reset Y2 for non-composed or specific types
                    newState.yAxisAggregation2 = 'sum'; 
                    newState.yAxisSeriesType2 = 'line';
                }
            } else { // composed
                newState.yAxisSeriesType1 = newState.yAxisSeriesType1 || 'bar';
                newState.yAxisSeriesType2 = newState.yAxisSeriesType2 || 'line';
            }
           
            if (newState.xAxisField && !getXAxisOptions(newState.type).includes(newState.xAxisField)) {
                newState.xAxisField = undefined;
            }
            if (newState.yAxisField1 && aggregationOptions.find(opt => opt.value === newState.yAxisAggregation1)?.numericOnly && !numericFields.includes(newState.yAxisField1)) {
                 newState.yAxisField1 = undefined; 
            }
             if (newState.yAxisField2 && aggregationOptions.find(opt => opt.value === newState.yAxisAggregation2)?.numericOnly && !numericFields.includes(newState.yAxisField2)) {
                 newState.yAxisField2 = undefined;
            }
        }
        if (key === 'yAxisField1' && (value === NO_FIELD_SELECTED_VALUE || !value)) { 
            newState.yAxisAggregation1 = 'sum'; 
            if (newState.type === 'composed') newState.yAxisSeriesType1 = 'bar';
        }
        if (key === 'yAxisField2' && (value === NO_FIELD_SELECTED_VALUE || !value)) {
            newState.yAxisAggregation2 = 'sum';
            if (newState.type === 'composed') newState.yAxisSeriesType2 = 'line';
        }
        
        return newState;
      });
    };


    const xAxisOptions = getXAxisOptions(chartType);
    const y1IsOptional = (chartType === 'pie' || chartType === 'radar') && yAxisAggregation1 === 'count';
    const y2IsConfigurable = chartType === 'composed' || chartType === 'scatter'; 
    
    const handleYFieldChange = (
        fieldKey: 'yAxisField1' | 'yAxisField2',
        aggKey: 'yAxisAggregation1' | 'yAxisAggregation2',
        newFieldVal: string | undefined
    ) => {
        const newField = newFieldVal === NO_FIELD_SELECTED_VALUE ? undefined : newFieldVal;
        setChartConfig(prev => {
            const updatedState = { ...prev, [fieldKey]: newField };
            const currentAgg = prev[aggKey];
            const isNumericOnlyAgg = aggregationOptions.find(opt => opt.value === currentAgg)?.numericOnly;
            if (isNumericOnlyAgg && newField && !numericFields.includes(newField)) {
                updatedState[aggKey] = 'count'; 
                toast({
                    title: "Aggregation Switched",
                    description: `Field '${newField}' is not primarily numeric. Switched aggregation to 'Count (Non-Empty)'.`,
                    variant: "default",
                    duration: 5000,
                });
            }
            if (!newField) { 
              updatedState[aggKey] = 'sum'; 
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
                    variant: "default", 
                    duration: 7000,
                });
            }
            
            if (newAgg === 'count' && (updatedState.type === 'pie' || updatedState.type === 'radar') && fieldKey === 'yAxisField1') {
                // Allow yAxisField1 to be undefined
            } else if (!currentField && fieldKey === 'yAxisField1' && newAgg !== 'count') { 
                 updatedState[fieldKey] = numericFields[0] || dataFields.find(f => f !== updatedState.xAxisField);
            }
            return updatedState;
        });
    };


    return (
      <div className="space-y-4">
        {/* Section 1: Chart Type, X-Axis, Theme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-start">
          {/* Menu: Chart Type */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Chart Type</label>
            <Select value={chartType} onValueChange={(val: ChartType) => updateChartConfig('type', val)}>
              <SelectTrigger className="w-full bg-input focus:bg-background">
                <SelectValue placeholder="Please select" />
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

          {/* Menu: X-Axis Field */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">X-Axis Field</label>
            <Select value={xAxisField || NO_FIELD_SELECTED_VALUE} onValueChange={(val) => updateChartConfig('xAxisField', val === NO_FIELD_SELECTED_VALUE ? undefined : val)} disabled={dataFields.length === 0}>
              <SelectTrigger className="w-full bg-input focus:bg-background">
                <SelectValue placeholder="Please select" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={NO_FIELD_SELECTED_VALUE}>Please select</SelectItem>
                {(xAxisOptions.length > 0 ? xAxisOptions : dataFields).map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)}
                {dataFields.length === 0 && <p className="p-2 text-xs text-muted-foreground text-center">No fields available</p>}
              </SelectContent>
            </Select>
          </div>
          
          {/* Menu: Theme */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Theme</label>
            <Select value={chartTheme} onValueChange={(val: keyof typeof appSettings.chartThemes) => updateChartConfig('theme', val)}>
              <SelectTrigger className="w-full bg-input focus:bg-background">
                <SelectValue placeholder="Please select" />
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
            {/* Menu: Y-Axis 1 Field */}
            <div className="space-y-1 md:col-span-1">
                <label className="text-sm font-medium text-muted-foreground">Y-Axis 1 Field {y1IsOptional ? '(Optional for Count)' : ''}</label>
                <Select 
                    value={yAxisField1 || NO_FIELD_SELECTED_VALUE}
                    onValueChange={(val) => handleYFieldChange('yAxisField1', 'yAxisAggregation1', val)}
                    disabled={dataFields.length === 0}
                >
                <SelectTrigger className="w-full bg-input focus:bg-background">
                    <SelectValue placeholder="Please select" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                    <SelectItem value={NO_FIELD_SELECTED_VALUE}>Please select</SelectItem>
                    {dataFields.map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)}
                    {dataFields.length === 0 && <p className="p-2 text-xs text-muted-foreground text-center">No fields available</p>}
                </SelectContent>
                </Select>
            </div>
            {/* Menu: Y-Axis 1 Aggregation */}
            <div className="space-y-1 md:col-span-1">
                <label className="text-sm font-medium text-muted-foreground">Y-Axis 1 Aggregation</label>
                <Select 
                    value={yAxisAggregation1} 
                    onValueChange={(val: AggregationType) => handleAggregationChange('yAxisField1', 'yAxisAggregation1', val)} 
                    disabled={(!yAxisField1 && !y1IsOptional)}
                >
                <SelectTrigger className="w-full bg-input focus:bg-background">
                    <SelectValue placeholder="Please select" />
                </SelectTrigger>
                <SelectContent>
                    {aggregationOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} 
                        disabled={opt.numericOnly && yAxisField1 && !numericFields.includes(yAxisField1) && !(y1IsOptional && opt.value === 'count')}>
                        {opt.label} {opt.numericOnly && yAxisField1 && !numericFields.includes(yAxisField1) && !y1IsOptional ? "(Requires Numeric)" : ""}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
           {/* Menu: Y-Axis 1 Series Chart Type */}
           {chartType === 'composed' && yAxisField1 && (
            <div className="space-y-1 md:col-span-1">
                <label className="text-sm font-medium text-muted-foreground">Y-Axis 1 Series Type</label>
                <Select value={yAxisSeriesType1} onValueChange={(val: SeriesChartType) => updateChartConfig('yAxisSeriesType1', val)}>
                    <SelectTrigger className="w-full bg-input focus:bg-background">
                        <SelectValue placeholder="Please select" />
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

        {/* Section 3: Y-Axis 2 Configuration (Optional for Composed or Scatter Chart) */}
        {y2IsConfigurable && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-start">
                {/* Menu: Y-Axis 2 Field */}
                <div className="space-y-1 md:col-span-1">
                    <label className="text-sm font-medium text-muted-foreground">Y-Axis 2 Field (Optional)</label>
                    <Select
                        value={yAxisField2 || NO_FIELD_SELECTED_VALUE}
                        onValueChange={(val) => handleYFieldChange('yAxisField2', 'yAxisAggregation2', val)}
                        disabled={dataFields.filter(f => f !== yAxisField1).length === 0}
                    >
                    <SelectTrigger className="w-full bg-input focus:bg-background">
                        <SelectValue placeholder="Please select" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                        <SelectItem value={NO_FIELD_SELECTED_VALUE}>Please select</SelectItem>
                        {dataFields.filter(f => f !== yAxisField1).map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace(/_/g, ' ')}</SelectItem>)}
                        {(dataFields.filter(f => f !== yAxisField1).length === 0 && dataFields.length > 0) && <p className="p-2 text-xs text-muted-foreground text-center">No other fields</p>}
                    </SelectContent>
                    </Select>
                </div>
                {/* Menu: Y-Axis 2 Aggregation */}
                <div className="space-y-1 md:col-span-1">
                    <label className="text-sm font-medium text-muted-foreground">Y-Axis 2 Aggregation</label>
                    <Select 
                        value={yAxisAggregation2} 
                        onValueChange={(val: AggregationType) => handleAggregationChange('yAxisField2', 'yAxisAggregation2', val)} 
                        disabled={!yAxisField2}
                    >
                    <SelectTrigger className="w-full bg-input focus:bg-background">
                        <SelectValue placeholder="Please select" />
                    </SelectTrigger>
                    <SelectContent>
                        {aggregationOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}
                            disabled={opt.numericOnly && yAxisField2 && !numericFields.includes(yAxisField2)}>
                            {opt.label} {opt.numericOnly && yAxisField2 && !numericFields.includes(yAxisField2) ? "(Requires Numeric)" : ""}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                {/* Menu: Y-Axis 2 Series Chart Type */}
                {chartType === 'composed' && yAxisField2 && (
                <div className="space-y-1 md:col-span-1">
                    <label className="text-sm font-medium text-muted-foreground">Y-Axis 2 Series Type</label>
                    <Select value={yAxisSeriesType2} onValueChange={(val: SeriesChartType) => updateChartConfig('yAxisSeriesType2', val)}>
                        <SelectTrigger className="w-full bg-input focus:bg-background">
                            <SelectValue placeholder="Please select" />
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
                    disabled={!canVisualize || displayDataChart1.length === 0 || !chart1.xAxisField || (!chart1.yAxisField1 && !(chart1.type === 'pie' && chart1.yAxisAggregation1 === 'count'))}
                >
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Chart 1 Data
                </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {canVisualize && renderConfigControls(1, chart1, setChart1)}
            {/* Chart 1 Rendering Area */}
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
                    disabled={!canVisualize || displayDataChart2.length === 0 || !chart2.xAxisField || (!chart2.yAxisField1 && !(chart2.type === 'pie' && chart2.yAxisAggregation1 === 'count'))}
                >
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Chart 2 Data
                </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
           {canVisualize && renderConfigControls(2, chart2, setChart2)}
           {/* Chart 2 Rendering Area */}
            <ChartContainer config={chart2Config} className="h-[450px] w-full mt-6">
                {renderChartContent(chart2, displayDataChart2, chart2Config, 2)}
            </ChartContainer>
          </CardContent>
        </Card>

      </CardContent>
       <CardFooter className="pt-6 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Chart rendering is optimized for clarity. For very large datasets, consider filtering or summarizing data first for best performance.
          Tooltips display values formatted to {appSettings.dataPrecision} decimal place(s). Data labels show values with 1 decimal place.
        </p>
      </CardFooter>
    </Card>
  );
}
