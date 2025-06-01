
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LayoutGrid, Rows, Columns, Sigma, FileSpreadsheet, ChevronDown, PlusCircle, XCircle, ListFilter, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableHeader, TableBody, TableCell, TableHead, TableRow, TableCaption, TableFooter as ShadTableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';


interface DataSummarizationProps {
  uploadedData: Record<string, any>[];
  dataFields: string[];
}

type AggregationType = 'sum' | 'count' | 'average' | 'min' | 'max' | 'uniqueCount' | 'sdev';

const aggregationOptions: { value: AggregationType; label: string; numericOnly: boolean }[] = [
  { value: 'sum', label: 'Sum', numericOnly: true },
  { value: 'count', label: 'Count (Non-Empty)', numericOnly: false },
  { value: 'average', label: 'Average', numericOnly: true },
  { value: 'min', label: 'Min', numericOnly: true },
  { value: 'max', label: 'Max', numericOnly: true },
  { value: 'uniqueCount', label: 'Unique Count', numericOnly: false },
  { value: 'sdev', label: 'Standard Deviation', numericOnly: true },
];

interface ValueFieldConfig {
  id: string;
  field: string;
  aggregation: AggregationType;
}

interface AggregationState {
  sum: number;
  sumOfSquares: number; // For standard deviation
  countNumeric: number; // Count of numeric values for average, sdev
  countTotal: number; // Total count of non-empty items for 'count' aggregation
  uniqueValues: Set<any>; // For unique count
  min: number;
  max: number;
}

interface OverallGrandTotalEntry {
  state: AggregationState;
  aggregation: AggregationType;
}

// Helper function to initialize an AggregationState
function createInitialAggregationState(): AggregationState {
  return { sum: 0, sumOfSquares: 0, countNumeric: 0, countTotal: 0, uniqueValues: new Set(), min: Infinity, max: -Infinity };
}

// Helper function to update an AggregationState with a new value
function updateAggregationState(state: AggregationState, originalValue: any): AggregationState {
  // Only increment countTotal if the value is not null, undefined, or an empty/whitespace string
  if (originalValue !== null && originalValue !== undefined && String(originalValue).trim() !== "") {
    state.countTotal++;
  }
  state.uniqueValues.add(originalValue); // uniqueValues still tracks all values, including blanks if present

  let numValue = NaN;
  if (typeof originalValue === 'number') {
    numValue = originalValue;
  } else if (typeof originalValue === 'string') {
    // Attempt to parse string to number, handling potential commas
    const cleanedString = originalValue.replace(/,/g, '');
    if (cleanedString.trim() !== '') { // Ensure it's not empty after cleaning
        const parsed = parseFloat(cleanedString);
        if (!isNaN(parsed)) numValue = parsed;
    }
  }

  if (!isNaN(numValue)) {
    state.sum += numValue;
    state.sumOfSquares += numValue * numValue;
    state.countNumeric++;
    state.min = Math.min(state.min, numValue);
    state.max = Math.max(state.max, numValue);
  }
  return state;
}

// Helper to merge two aggregation states (useful for grand totals)
function mergeAggregationStates(stateA: AggregationState, stateB: AggregationState): AggregationState {
    const mergedState = createInitialAggregationState();
    mergedState.sum = stateA.sum + stateB.sum;
    mergedState.sumOfSquares = stateA.sumOfSquares + stateB.sumOfSquares;
    mergedState.countNumeric = stateA.countNumeric + stateB.countNumeric;
    mergedState.countTotal = stateA.countTotal + stateB.countTotal;
    
    stateA.uniqueValues.forEach(val => mergedState.uniqueValues.add(val));
    stateB.uniqueValues.forEach(val => mergedState.uniqueValues.add(val));
    mergedState.min = Math.min(stateA.min, stateB.min);
    mergedState.max = Math.max(stateA.max, stateB.max);
    return mergedState;
}


// Helper function to calculate final value based on aggregation type
function calculateFinalValue(state: AggregationState, aggregation: AggregationType): number | string {
  switch (aggregation) {
    case 'sum': return state.sum;
    case 'count': return state.countTotal;
    case 'average': return state.countNumeric > 0 ? state.sum / state.countNumeric : 0;
    case 'min': return state.min === Infinity ? 0 : state.min;
    case 'max': return state.max === -Infinity ? 0 : state.max;
    case 'uniqueCount': return state.uniqueValues.size;
    case 'sdev':
      if (state.countNumeric < 2) return 0;
      const variance = (state.sumOfSquares - (state.sum * state.sum) / state.countNumeric) / (state.countNumeric - 1);
      return Math.sqrt(Math.max(0, variance));
    default: return state.sum;
  }
}


const MAX_ROW_FIELDS = 2;
const MAX_COL_FIELDS = 1;
const MAX_VALUE_FIELDS = 3;


export function DataSummarization({ uploadedData, dataFields }: DataSummarizationProps) {
  const [rowFields, setRowFields] = useState<string[]>([]);
  const [columnFields, setColumnFields] = useState<string[]>([]);
  const [valueFieldConfigs, setValueFieldConfigs] = useState<ValueFieldConfig[]>([]);
  
  const [summaryData, setSummaryData] = useState<Record<string, any>[]>([]);
  const [dynamicColumnHeaders, setDynamicColumnHeaders] = useState<string[]>([]);
  const [effectiveColumnFieldValues, setEffectiveColumnFieldValues] = useState<string[]>([]);
  const [grandTotalRow, setGrandTotalRow] = useState<Record<string, any> | null>(null);
  
  const [contentFilters, setContentFilters] = useState<Record<string, Set<string>>>({});
  const [uniqueValuesForFilterUI, setUniqueValuesForFilterUI] = useState<Record<string, { value: string; count: number }[]>>({});
  const [showFilters, setShowFilters] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setRowFields([]);
    setColumnFields([]);
    setValueFieldConfigs([]);
    setSummaryData([]);
    setDynamicColumnHeaders([]);
    setEffectiveColumnFieldValues([]);
    setGrandTotalRow(null);
    
    const initialContentFilters: Record<string, Set<string>> = {};
    dataFields.forEach(key => initialContentFilters[key] = new Set());
    setContentFilters(initialContentFilters);

    if (uploadedData.length > 0) {
      const newUniqueValues: Record<string, { value: string; count: number }[]> = {};
      dataFields.forEach(field => {
        const valueMap = new Map<string, number>();
        uploadedData.forEach(item => {
          const cellValue = item[field];
          const val = cellValue === null || cellValue === undefined ? "" : String(cellValue);
          valueMap.set(val, (valueMap.get(val) || 0) + 1);
        });
        newUniqueValues[field] = Array.from(valueMap.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value));
      });
      setUniqueValuesForFilterUI(newUniqueValues);
    } else {
      setUniqueValuesForFilterUI({});
    }
  }, [uploadedData, dataFields]);

  const dataForPivot = useMemo(() => {
    if (uploadedData.length === 0) return [];
    const activeFilterKeys = Object.keys(contentFilters).filter(key => contentFilters[key].size > 0);
    if (activeFilterKeys.length === 0) return uploadedData;

    return uploadedData.filter(item => {
      return activeFilterKeys.every(key => {
        const selectedValues = contentFilters[key];
        const cellValue = item[key];
        const val = cellValue === null || cellValue === undefined ? "" : String(cellValue);
        return selectedValues.has(val);
      });
    });
  }, [uploadedData, contentFilters]);
  
  useEffect(() => {
    if (dataForPivot.length === 0 || valueFieldConfigs.length === 0) {
      setSummaryData([]);
      setDynamicColumnHeaders([]);
      setEffectiveColumnFieldValues([]);
      setGrandTotalRow(null);
      return;
    }

    const groupedData = new Map<string, Map<string, AggregationState[]>>();
    const uniqueColFieldValues = new Set<string>();
    const rowGrandTotalsMap = new Map<string, AggregationState[]>();
    const overallGrandTotalsAggStates = new Map<string, OverallGrandTotalEntry>();


    dataForPivot.forEach(item => {
      const rowKey = rowFields.map(rf => String(item[rf] ?? '')).join('||');
      
      let colKeyValue = "_TOTAL_"; 
      if (columnFields.length > 0 && columnFields[0]) {
        colKeyValue = String(item[columnFields[0]] ?? '');
        uniqueColFieldValues.add(colKeyValue);
      }

      if (!groupedData.has(rowKey)) {
        groupedData.set(rowKey, new Map<string, AggregationState[]>());
        rowGrandTotalsMap.set(rowKey, valueFieldConfigs.map(() => createInitialAggregationState()));
      }
      const rowGroup = groupedData.get(rowKey)!;
      const currentRowGrandTotalStates = rowGrandTotalsMap.get(rowKey)!;

      if (!rowGroup.has(colKeyValue)) {
        rowGroup.set(colKeyValue, valueFieldConfigs.map(() => createInitialAggregationState()));
      }
      const aggStatesForCell = rowGroup.get(colKeyValue)!;

      valueFieldConfigs.forEach((vfConfig, vfIndex) => {
        const originalValue = item[vfConfig.field];
        updateAggregationState(aggStatesForCell[vfIndex], originalValue);
        updateAggregationState(currentRowGrandTotalStates[vfIndex], originalValue); 
      });
    });

    const sortedUniqueColFieldValues = Array.from(uniqueColFieldValues).sort();
    const currentEffectiveColumnFieldValues = columnFields.length > 0 && columnFields[0] ? sortedUniqueColFieldValues : ["_TOTAL_"];
    setEffectiveColumnFieldValues(currentEffectiveColumnFieldValues);

    const newSummaryData: Record<string, any>[] = [];
    
    const targetColFieldValues = currentEffectiveColumnFieldValues.length > 0 ? currentEffectiveColumnFieldValues : ["_TOTAL_"];

    const valueColumnHeaders: string[] = [];
    targetColFieldValues.forEach(colVal => { // colVal is like "Electronics", "Clothing", or "_TOTAL_" if no col field
        valueFieldConfigs.forEach(vfConfig => {
            let headerText: string;
            const isEffectivelyNoColumnSegmentation = (targetColFieldValues.length === 1 && targetColFieldValues[0] === "_TOTAL_");

            if (isEffectivelyNoColumnSegmentation) {
                headerText = vfConfig.field; // Header is just "Sales"
            } else {
                if (valueFieldConfigs.length > 1) {
                    headerText = `${colVal} - ${vfConfig.field}`; // Headers: "Electronics - Sales", "Electronics - Profit"
                } else {
                    headerText = colVal; // Header is just "Electronics", "Clothing"
                }
            }
            valueColumnHeaders.push(headerText);
            if (!overallGrandTotalsAggStates.has(headerText)) {
                overallGrandTotalsAggStates.set(headerText, { state: createInitialAggregationState(), aggregation: vfConfig.aggregation });
            }
        });
    });
    
    const shouldShowRowGrandTotals = columnFields.length > 0 && valueFieldConfigs.length > 0;
    const grandTotalRowColumnHeaders: string[] = [];
    if (shouldShowRowGrandTotals) {
        valueFieldConfigs.forEach(vfConfig => {
            const headerText = `Grand Total - ${vfConfig.field}`;
            grandTotalRowColumnHeaders.push(headerText);
            if (!overallGrandTotalsAggStates.has(headerText)) {
                 overallGrandTotalsAggStates.set(headerText, { state: createInitialAggregationState(), aggregation: vfConfig.aggregation });
            }
        });
    }
    setDynamicColumnHeaders([...valueColumnHeaders, ...grandTotalRowColumnHeaders]);
    
    groupedData.forEach((colGroups, rowKey) => {
      const summaryRow: Record<string, any> = {};
      const rowKeyParts = rowKey.split('||');
      rowFields.forEach((rf, idx) => summaryRow[rf] = rowKeyParts[idx]);

      targetColFieldValues.forEach(colVal => {
        const aggStatesForCell = colGroups.get(colVal);
        valueFieldConfigs.forEach((vfConfig, vfIndex) => {
            let headerKey: string;
            const isEffectivelyNoColumnSegmentation = (targetColFieldValues.length === 1 && targetColFieldValues[0] === "_TOTAL_");

            if (isEffectivelyNoColumnSegmentation) {
                headerKey = vfConfig.field;
            } else {
                if (valueFieldConfigs.length > 1) {
                    headerKey = `${colVal} - ${vfConfig.field}`;
                } else {
                    headerKey = colVal;
                }
            }
          
          let finalValue: string | number = 0; 
          if (aggStatesForCell && aggStatesForCell[vfIndex]) {
            finalValue = calculateFinalValue(aggStatesForCell[vfIndex], vfConfig.aggregation);
            const existingEntry = overallGrandTotalsAggStates.get(headerKey)!; // Assumes headerKey exists
            overallGrandTotalsAggStates.set(headerKey, {
                state: mergeAggregationStates(existingEntry.state, aggStatesForCell[vfIndex]),
                aggregation: existingEntry.aggregation
            });
          }
          summaryRow[headerKey] = finalValue;
        });
      });

      if (shouldShowRowGrandTotals) {
        const currentRowGrandTotalStates = rowGrandTotalsMap.get(rowKey)!;
        grandTotalRowColumnHeaders.forEach((gtHeaderKey, vfIndex) => { // gtHeaderKey is "Grand Total - Sales"
            summaryRow[gtHeaderKey] = calculateFinalValue(currentRowGrandTotalStates[vfIndex], valueFieldConfigs[vfIndex].aggregation);
            
            const existingEntry = overallGrandTotalsAggStates.get(gtHeaderKey)!; // Assumes gtHeaderKey exists
            overallGrandTotalsAggStates.set(gtHeaderKey, {
                state: mergeAggregationStates(existingEntry.state, currentRowGrandTotalStates[vfIndex]),
                aggregation: existingEntry.aggregation
            });
        });
      }
      newSummaryData.push(summaryRow);
    });
    
    newSummaryData.sort((a, b) => {
      for (const field of rowFields) {
        if (a[field] < b[field]) return -1;
        if (a[field] > b[field]) return 1;
      }
      return 0;
    });
    setSummaryData(newSummaryData.slice(0, 100));

    const finalGrandTotalRow: Record<string, any> = {};
    rowFields.forEach((rf, idx) => finalGrandTotalRow[rf] = idx === 0 ? "Grand Total" : "");
    
    dynamicColumnHeaders.forEach(headerKey => {
        const entry = overallGrandTotalsAggStates.get(headerKey);
        if(entry) {
            finalGrandTotalRow[headerKey] = calculateFinalValue(entry.state, entry.aggregation);
        } else {
            finalGrandTotalRow[headerKey] = 0; // Should not happen if populated correctly
        }
    });
    setGrandTotalRow(finalGrandTotalRow);

  }, [dataForPivot, rowFields, columnFields, valueFieldConfigs]);

  const handleDrop = (area: 'rows' | 'columns' | 'values', field: string) => {
    const isFieldUsed = (f: string) => rowFields.includes(f) || columnFields.includes(f) || valueFieldConfigs.some(vf => vf.field === f);

    if (area === 'rows') {
      if (rowFields.length < MAX_ROW_FIELDS && !isFieldUsed(field)) {
        setRowFields(prev => [...prev, field]);
        toast({title: `Field Added`, description: `${field} added to Rows.`});
      } else if (rowFields.length >= MAX_ROW_FIELDS) {
        toast({title: "Limit Reached", description: `Maximum ${MAX_ROW_FIELDS} row fields allowed.`, variant: "destructive"});
      } else if (isFieldUsed(field)){
        toast({title: "Field In Use", description: `${field} is already used in another pivot area.`, variant: "destructive"});
      }
    } else if (area === 'columns') {
      if (columnFields.length < MAX_COL_FIELDS && !isFieldUsed(field)) {
        setColumnFields(prev => [...prev, field]);
        toast({title: `Field Added`, description: `${field} added to Columns.`});
      } else if (columnFields.length >= MAX_COL_FIELDS) {
         toast({title: "Limit Reached", description: `Maximum ${MAX_COL_FIELDS} column field allowed.`, variant: "destructive"});
      } else if (isFieldUsed(field)){
        toast({title: "Field In Use", description: `${field} is already used in another pivot area.`, variant: "destructive"});
      }
    } else if (area === 'values') {
      if (valueFieldConfigs.length < MAX_VALUE_FIELDS && !isFieldUsed(field)) {
        const newId = `${field}-${Date.now()}`;
        
        let initialAggregation: AggregationType = 'sum';
        const sampleValue = dataForPivot[0]?.[field];
        const aggOptionSum = aggregationOptions.find(opt => opt.value === 'sum')!;

        if (aggOptionSum.numericOnly && typeof sampleValue !== 'number' && (typeof sampleValue !== 'string' || isNaN(parseFloat(String(sampleValue).replace(/,/g, ''))))) {
            initialAggregation = 'count';
             toast({title: "Field Type Note", description: `Field '${field}' is not strictly numeric. Defaulting aggregation to 'Count (Non-Empty)'. You can change this.`, duration: 5000});
        }
        const newFieldConfig: ValueFieldConfig = { id: newId, field, aggregation: initialAggregation };
        setValueFieldConfigs(prev => [...prev, newFieldConfig]);
        toast({title: `Field Added`, description: `${field} added to Values with ${initialAggregation.replace('Non-Empty', '').trim()} aggregation.`});

      } else if (valueFieldConfigs.length >= MAX_VALUE_FIELDS) {
         toast({title: "Limit Reached", description: `Maximum ${MAX_VALUE_FIELDS} value fields allowed.`, variant: "destructive"});
      } else if (isFieldUsed(field)){
        toast({title: "Field In Use", description: `${field} is already used in another pivot area.`, variant: "destructive"});
      }
    }
  };

  const removeFromArea = (area: 'rows' | 'columns' | 'values', identifier: string) => {
    let fieldName = identifier;
    if (area === 'rows') setRowFields(prev => prev.filter(f => f !== identifier));
    if (area === 'columns') setColumnFields(prev => prev.filter(f => f !== identifier));
    if (area === 'values') {
        const configToRemove = valueFieldConfigs.find(vf => vf.id === identifier);
        if (configToRemove) fieldName = configToRemove.field;
        setValueFieldConfigs(prev => prev.filter(vf => vf.id !== identifier));
    }
    toast({title: `Field Removed`, description: `${fieldName} removed from ${area}.`});
  };

  const handleValueFieldAggregationChange = (id: string, newAggregation: AggregationType) => {
    setValueFieldConfigs(prev => prev.map(vf => {
      if (vf.id === id) {
        const aggOption = aggregationOptions.find(opt => opt.value === newAggregation)!;
        const sampleValue = dataForPivot[0]?.[vf.field];
        if (aggOption.numericOnly && typeof sampleValue !== 'number' && (typeof sampleValue !== 'string' || isNaN(parseFloat(String(sampleValue).replace(/,/g, ''))))) {
          toast({title: "Invalid Aggregation", description: `Aggregation '${aggOption.label}' requires a numeric field. '${vf.field}' is not numeric.`, variant: "destructive", duration: 5000});
          return vf; 
        }
        return { ...vf, aggregation: newAggregation };
      }
      return vf;
    }));
  };
  
  const handleExport = () => {
     if (summaryData.length === 0) {
      toast({ title: "No Summary Data", description: "No summary data to export.", variant: "destructive" });
      return;
    }
    toast({ title: "Exporting Summary", description: "Summary table export to CSV started..." });
    
    const headers = [...rowFields, ...dynamicColumnHeaders]; 
    const csvHeaderRow = headers.map(h => `"${String(h ?? '').replace(/_/g, ' ').replace(/"/g, '""')}"`).join(',');

    const dataRows = summaryData.map(row => {
      return headers.map(header => {
        let cellValue = row[header];
        if (cellValue === null || cellValue === undefined) {
            cellValue = "";
        } else if (typeof cellValue === 'number') {
            cellValue = cellValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}).replace(/,/g, ''); 
        } else {
            cellValue = String(cellValue);
        }
        
        if (cellValue.includes(',')) { 
          return `"${cellValue.replace(/"/g, '""')}"`;
        }
        return cellValue;
      }).join(',');
    });

    let csvContent = csvHeaderRow + '\n' + dataRows.join('\n');

    if (grandTotalRow) {
      const footerRowCsv = headers.map(header => {
        let cellValue = grandTotalRow[header];
         if (cellValue === null || cellValue === undefined) {
            cellValue = "";
        } else if (typeof cellValue === 'number') {
            cellValue = cellValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}).replace(/,/g, '');
        } else {
            cellValue = String(cellValue);
        }
        if (cellValue.includes(',')) {
          return `"${cellValue.replace(/"/g, '""')}"`;
        }
        return cellValue;
      }).join(',');
      csvContent += '\n' + footerRowCsv;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", "pivot_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const getFieldConfigDescription = (area: 'rows' | 'columns' | 'values') => {
    if (area === 'rows') return `Row Fields (Max ${MAX_ROW_FIELDS})`;
    if (area === 'columns') return `Column Field (Max ${MAX_COL_FIELDS})`;
    if (area === 'values') return `Value Fields (Max ${MAX_VALUE_FIELDS})`;
    return "";
  }

  const handleContentFilterChange = (columnKey: string, value: string, isChecked: boolean) => {
    setContentFilters(prev => {
      const newFilters = { ...prev };
      const currentSet = new Set(newFilters[columnKey] || []);
      if (isChecked) {
        currentSet.add(value);
      } else {
        currentSet.delete(value);
      }
      newFilters[columnKey] = currentSet;
      return newFilters;
    });
  };

  const handleSelectAllContentValues = (columnKey: string) => {
    const allValues = new Set(uniqueValuesForFilterUI[columnKey]?.map(uv => uv.value) || []);
    setContentFilters(prev => ({ ...prev, [columnKey]: allValues }));
  };

  const handleUnselectAllContentValues = (columnKey: string) => {
    setContentFilters(prev => ({ ...prev, [columnKey]: new Set() }));
  };

  const activeFilterCount = Object.values(contentFilters).reduce((acc, columnSet) => acc + (columnSet.size > 0 ? 1 : 0), 0);


  if (uploadedData.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <LayoutGrid className="text-primary" />
            Summarize Your Data (Pivot View)
          </CardTitle>
          <CardDescription>Drag and drop fields to configure your pivot table. Select aggregation for value fields.</CardDescription>
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
          <LayoutGrid className="text-primary" />
          Summarize Your Data (Pivot View)
        </CardTitle>
        <CardDescription>Filter data, then drag fields to Row, Column (Max {MAX_COL_FIELDS}), or Value areas. Max {MAX_ROW_FIELDS} Row fields, Max {MAX_VALUE_FIELDS} Value fields.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <Card className="bg-background/30">
          <CardHeader className="p-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ListFilter className="text-accent" /> Data Filters <span className="text-xs text-muted-foreground">(Applied before summarization)</span>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? 'Hide Filters' : `Show Filters ${activeFilterCount > 0 ? `(${activeFilterCount} active)` : ''}`}
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="p-4 pt-0">
              <Accordion type="multiple" className="w-full">
                {dataFields.map(fieldKey => {
                  const uniqueValues = uniqueValuesForFilterUI[fieldKey] || [];
                  const activeFiltersInColumn = contentFilters[fieldKey]?.size || 0;
                  return (
                    <AccordionItem value={fieldKey} key={`filter-${fieldKey}`}>
                      <AccordionTrigger className="text-sm hover:no-underline py-2">
                        <div className="flex justify-between w-full items-center">
                          <span className="capitalize truncate pr-2">{fieldKey.replace(/_/g, ' ')}</span>
                          {activeFiltersInColumn > 0 && <Badge variant="secondary" className="text-xs">{activeFiltersInColumn} selected</Badge>}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="p-2 border-t">
                          <div className="flex justify-between mb-2">
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllContentValues(fieldKey)}>Select All ({uniqueValues.length})</Button>
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleUnselectAllContentValues(fieldKey)}>Unselect All</Button>
                          </div>
                          <ScrollArea className="h-40">
                            <div className="space-y-1 pr-3">
                              {uniqueValues.map(({ value, count }) => (
                                <Label key={value} className="flex items-center space-x-2 p-1 rounded hover:bg-muted/50 text-xs font-normal">
                                  <Checkbox
                                    checked={contentFilters[fieldKey]?.has(value) || false}
                                    onCheckedChange={(checked) => handleContentFilterChange(fieldKey, value, !!checked)}
                                    id={`content-filter-${fieldKey}-${value.replace(/\s+/g, '-')}`}
                                  />
                                  <span className="flex-grow truncate" title={value}>{value || "(empty)"}</span>
                                  <span className="text-muted-foreground">({count})</span>
                                </Label>
                              ))}
                              {uniqueValues.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No filterable values.</p>}
                            </div>
                          </ScrollArea>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
               <p className="text-xs text-muted-foreground mt-2 text-center">Filtered data for pivot: {dataForPivot.length} rows out of {uploadedData.length}.</p>
            </CardContent>
          )}
        </Card>
        
        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1 bg-background/50 max-h-96">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Available Fields</CardTitle>
              <CardDescription className="text-xs">Drag to pivot areas. Fields in use are disabled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
             <ScrollArea className="h-72">
              {dataFields.map(field => {
                const isUsed = rowFields.includes(field) || columnFields.includes(field) || valueFieldConfigs.some(vf => vf.field === field);
                return(
                <Badge 
                  key={field} 
                  variant={isUsed ? "outline" : "secondary"}
                  className={cn(
                    "cursor-grab p-2 text-sm mr-1 mb-1 capitalize hover:bg-primary/20",
                    isUsed && "opacity-50 cursor-not-allowed line-through"
                  )}
                  draggable={!isUsed}
                  onDragStart={(e) => { if(!isUsed) e.dataTransfer.setData('text/plain', field); else e.preventDefault();}}
                  title={isUsed ? `${field} is already in use` : `Drag ${field}`}
                >
                  {field.replace(/_/g, ' ')}
                </Badge>
                );
              })}
              {dataFields.length === 0 && <p className="text-xs text-muted-foreground p-2">No fields available.</p>}
             </ScrollArea>
            </CardContent>
          </Card>

          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['rows', 'columns', 'values'] as const).map((area) => {
              let itemsToDisplay: {id: string, label: string, field?: string, aggregation?: AggregationType}[] = [];
              if (area === 'rows') itemsToDisplay = rowFields.map(f => ({id: f, label: f.replace(/_/g, ' ')}));
              if (area === 'columns') itemsToDisplay = columnFields.map(f => ({id: f, label: f.replace(/_/g, ' ')}));
              if (area === 'values') itemsToDisplay = valueFieldConfigs.map(vf => ({
                  id: vf.id, 
                  label: vf.field.replace(/_/g, ' '),
                  field: vf.field, 
                  aggregation: vf.aggregation
              }));
              
              const Icon = area === 'rows' ? Rows : area === 'columns' ? Columns : Sigma;

              return (
                <Card 
                  key={area} 
                  className="min-h-[150px] bg-background/50 flex flex-col"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const field = e.dataTransfer.getData('text/plain');
                    if (field) handleDrop(area, field);
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md font-medium flex items-center gap-2">
                      <Icon className="w-5 h-5 text-accent" /> {getFieldConfigDescription(area)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 p-3 pt-0 flex-grow">
                    {itemsToDisplay.map(item => (
                      <div key={item.id} className={cn("mb-1.5", area === 'values' ? 'p-2 border rounded-md bg-muted/30' : '')}>
                        <div className="flex items-center justify-between">
                            <Badge 
                                variant="outline" 
                                className="cursor-pointer p-1.5 text-xs mr-1 mb-1 capitalize hover:border-destructive"
                                onClick={() => removeFromArea(area, item.id)}
                                title={`Remove ${item.label}`}
                            >
                            {item.label} <XCircle className="ml-1.5 h-3 w-3" />
                            </Badge>
                        </div>
                        {area === 'values' && item.field && item.aggregation && (
                          <div className="mt-1.5">
                            <Label htmlFor={`aggregationSelect-${item.id}`} className="text-xs text-muted-foreground">Aggregation:</Label>
                            <Select 
                              value={item.aggregation} 
                              onValueChange={(value: AggregationType) => handleValueFieldAggregationChange(item.id, value)}
                            >
                              <SelectTrigger id={`aggregationSelect-${item.id}`} className="h-8 w-full bg-input focus:bg-background text-xs mt-0.5">
                                <SelectValue placeholder="Agg Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {aggregationOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    ))}
                    {itemsToDisplay.length === 0 && <p className="text-xs text-muted-foreground">Drop field(s) here</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
        
        <Separator />
        
        <h3 className="font-headline text-xl text-primary">Summary Table</h3>
        <div className="w-full overflow-x-auto rounded-md border max-h-[70vh]">
          <table className="min-w-max caption-bottom text-sm">
            <TableCaption>
              {summaryData.length > 0 ? `Displaying first ${Math.min(summaryData.length, 100)} summary rows from ${dataForPivot.length} filtered rows.` : "Configure fields and filters to see summary."}
            </TableCaption>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="hover:bg-muted/20">
                {rowFields.map((rf, idx) => 
                  <TableHead 
                    key={rf} 
                    className={cn(
                      "capitalize whitespace-nowrap",
                      idx === 0 && rowFields.length > 0 && "sticky left-0 z-[11] bg-card"
                    )}
                  >
                    {rf.replace(/_/g, ' ')}
                  </TableHead>
                )}
                {dynamicColumnHeaders.map(dh => (
                    <TableHead key={dh} className="text-right capitalize whitespace-nowrap">{String(dh ?? '').replace(/_/g, ' ')}</TableHead>
                ))}
                 {(rowFields.length === 0 || valueFieldConfigs.length === 0) && <TableHead>Configuration Needed</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map((item, index) => (
                <TableRow key={index} className="hover:bg-muted/10">
                  {rowFields.map((rf, idx) => 
                    <TableCell 
                      key={`${rf}-${index}`} 
                      className={cn(
                        "capitalize whitespace-nowrap",
                        idx === 0 && rowFields.length > 0 && "sticky left-0 z-[1] bg-card" // Use bg-card for consistent appearance of frozen column
                      )}
                    >
                      {String(item[rf] ?? '')}
                    </TableCell>
                  )}
                  {dynamicColumnHeaders.map(dh => (
                    <TableCell key={`${dh}-${index}`} className="text-right whitespace-nowrap">
                      {typeof item[dh] === 'number' 
                        ? Number(item[dh]).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) 
                        : String(item[dh] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {summaryData.length === 0 && valueFieldConfigs.length > 0 && (
                <TableRow>
                  <TableCell colSpan={rowFields.length + dynamicColumnHeaders.length || 1} className="h-24 text-center text-muted-foreground">
                    { (dataForPivot.length > 0 && rowFields.length > 0 && valueFieldConfigs.length > 0) ? "No summary data for current configuration/filters." : "Please select Row and Value fields, and adjust filters if needed."}
                  </TableCell>
                </TableRow>
              )}
               {valueFieldConfigs.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={rowFields.length + 1} className="h-24 text-center text-muted-foreground">
                    Please add at least one field to the 'Values' area to generate a summary.
                  </TableCell>
                </TableRow>
               )}
            </TableBody>
            {summaryData.length > 0 && valueFieldConfigs.length > 0 && grandTotalRow && (
                <ShadTableFooter className="sticky bottom-0 bg-card/95 backdrop-blur-sm z-10">
                    <TableRow className="hover:bg-muted/20 font-semibold">
                        {rowFields.map((rf, idx) => (
                            <TableCell 
                              key={`footer-${rf}`} 
                              className={cn(
                                "capitalize whitespace-nowrap",
                                idx === 0 && rowFields.length > 0 && "sticky left-0 z-[11] bg-card/95" // Match footer bg
                              )}
                            >
                                {idx === 0 ? grandTotalRow[rf] : ""}
                            </TableCell>
                        ))}
                        {dynamicColumnHeaders.map(dh => (
                             <TableCell key={`footer-${dh}`} className="text-right whitespace-nowrap">
                                {typeof grandTotalRow[dh] === 'number'
                                ? Number(grandTotalRow[dh]).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})
                                : String(grandTotalRow[dh] ?? '')}
                            </TableCell>
                        ))}
                    </TableRow>
                </ShadTableFooter>
            )}
          </table>
        </div>
        <CardFooter className="mt-6 flex justify-end p-0">
            <Button onClick={handleExport} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={summaryData.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Summary
            </Button>
        </CardFooter>
      </CardContent>
    </Card>
  );
}

