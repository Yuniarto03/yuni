
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, Rows, Columns, Sigma, FileSpreadsheet, ChevronDown, PlusCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DataSummarizationProps {
  uploadedData: Record<string, any>[];
  dataFields: string[];
}

type AggregationType = 'sum' | 'count' | 'average' | 'min' | 'max' | 'uniqueCount' | 'sdev';

const aggregationOptions: { value: AggregationType; label: string; numericOnly: boolean }[] = [
  { value: 'sum', label: 'Sum', numericOnly: true },
  { value: 'count', label: 'Count', numericOnly: false },
  { value: 'average', label: 'Average', numericOnly: true },
  { value: 'min', label: 'Min', numericOnly: true },
  { value: 'max', label: 'Max', numericOnly: true },
  { value: 'uniqueCount', label: 'Unique Count', numericOnly: false },
  { value: 'sdev', label: 'Standard Deviation', numericOnly: true },
];

interface ValueFieldConfig {
  id: string; // Unique ID for React key
  field: string;
  aggregation: AggregationType;
}

interface AggregationState {
  sum: number;
  sumOfSquares: number;
  countNumeric: number;
  countTotal: number;
  uniqueValues: Set<any>;
  min: number;
  max: number;
}

function calculateSdev(sum: number, sumOfSquares: number, countNumeric: number): number {
  if (countNumeric < 2) return 0;
  const variance = (sumOfSquares - (sum * sum) / countNumeric) / (countNumeric - 1);
  return Math.sqrt(Math.max(0, variance));
}

const MAX_ROW_FIELDS = 2;
const MAX_COL_FIELDS = 1; // Simplified for now
const MAX_VALUE_FIELDS = 3;


export function DataSummarization({ uploadedData, dataFields }: DataSummarizationProps) {
  const [rowFields, setRowFields] = useState<string[]>([]);
  const [columnFields, setColumnFields] = useState<string[]>([]); // Max 1 for now
  const [valueFieldConfigs, setValueFieldConfigs] = useState<ValueFieldConfig[]>([]);
  
  const [summaryData, setSummaryData] = useState<Record<string, any>[]>([]);
  const [dynamicColumnHeaders, setDynamicColumnHeaders] = useState<string[]>([]);
  const [effectiveColumnFieldValues, setEffectiveColumnFieldValues] = useState<string[]>([]);


  const { toast } = useToast();

  useEffect(() => {
    setRowFields([]);
    setColumnFields([]);
    setValueFieldConfigs([]);
    setSummaryData([]);
    setDynamicColumnHeaders([]);
    setEffectiveColumnFieldValues([]);
  }, [uploadedData, dataFields]);
  
  useEffect(() => {
    if (uploadedData.length === 0 || rowFields.length === 0 || valueFieldConfigs.length === 0) {
      setSummaryData([]);
      setDynamicColumnHeaders([]);
      setEffectiveColumnFieldValues([]);
      return;
    }

    // Step 1: Group data and perform aggregations
    const groupedData = new Map<string, Map<string, AggregationState[]>>();
    const uniqueColFieldValues = new Set<string>();

    uploadedData.forEach(item => {
      const rowKey = rowFields.map(rf => String(item[rf] ?? '')).join('||');
      
      let colKeyValue = "_TOTAL_"; // Default if no column field
      if (columnFields.length > 0) {
        colKeyValue = String(item[columnFields[0]] ?? '');
        uniqueColFieldValues.add(colKeyValue);
      }

      if (!groupedData.has(rowKey)) {
        groupedData.set(rowKey, new Map<string, AggregationState[]>());
      }
      const rowGroup = groupedData.get(rowKey)!;

      if (!rowGroup.has(colKeyValue)) {
        rowGroup.set(colKeyValue, valueFieldConfigs.map(() => ({
          sum: 0, sumOfSquares: 0, countNumeric: 0, countTotal: 0,
          uniqueValues: new Set(), min: Infinity, max: -Infinity,
        })));
      }
      const aggStates = rowGroup.get(colKeyValue)!;

      valueFieldConfigs.forEach((vfConfig, index) => {
        const state = aggStates[index];
        const originalValue = item[vfConfig.field];
        const numValue = parseFloat(String(originalValue));

        state.countTotal++;
        state.uniqueValues.add(originalValue);

        if (!isNaN(numValue)) {
          state.sum += numValue;
          state.sumOfSquares += numValue * numValue;
          state.countNumeric++;
          state.min = Math.min(state.min, numValue);
          state.max = Math.max(state.max, numValue);
        }
      });
    });

    const sortedUniqueColFieldValues = Array.from(uniqueColFieldValues).sort();
    setEffectiveColumnFieldValues(columnFields.length > 0 ? sortedUniqueColFieldValues : ["_TOTAL_"]);

    // Step 2: Transform grouped data into flat summaryData for table rendering
    const newSummaryData: Record<string, any>[] = [];
    const newDynamicColumnHeaders: string[] = [];

    if (columnFields.length > 0) {
      sortedUniqueColFieldValues.forEach(colVal => {
        valueFieldConfigs.forEach(vfConfig => {
          const aggInfo = aggregationOptions.find(opt => opt.value === vfConfig.aggregation)?.label || vfConfig.aggregation;
          newDynamicColumnHeaders.push(`${colVal} - ${vfConfig.field} (${aggInfo})`);
        });
      });
    } else { // No column fields, headers are just value fields
      valueFieldConfigs.forEach(vfConfig => {
        const aggInfo = aggregationOptions.find(opt => opt.value === vfConfig.aggregation)?.label || vfConfig.aggregation;
        newDynamicColumnHeaders.push(`${vfConfig.field} (${aggInfo})`);
      });
    }
    setDynamicColumnHeaders(newDynamicColumnHeaders);
    
    groupedData.forEach((colGroups, rowKey) => {
      const summaryRow: Record<string, any> = {};
      const rowKeyParts = rowKey.split('||');
      rowFields.forEach((rf, idx) => summaryRow[rf] = rowKeyParts[idx]);

      const targetColFieldValues = columnFields.length > 0 ? sortedUniqueColFieldValues : ["_TOTAL_"];

      targetColFieldValues.forEach(colVal => {
        const aggStates = colGroups.get(colVal);
        valueFieldConfigs.forEach((vfConfig, index) => {
          let aggregatedValue: number | string = 0;
          if (aggStates && aggStates[index]) {
            const state = aggStates[index];
            switch (vfConfig.aggregation) {
              case 'sum': aggregatedValue = state.sum; break;
              case 'count': aggregatedValue = state.countTotal; break;
              case 'average': aggregatedValue = state.countNumeric > 0 ? state.sum / state.countNumeric : 0; break;
              case 'min': aggregatedValue = state.min === Infinity ? 0 : state.min; break;
              case 'max': aggregatedValue = state.max === -Infinity ? 0 : state.max; break;
              case 'uniqueCount': aggregatedValue = state.uniqueValues.size; break;
              case 'sdev': aggregatedValue = calculateSdev(state.sum, state.sumOfSquares, state.countNumeric); break;
              default: aggregatedValue = state.sum;
            }
          }
          
          const headerKeyBase = columnFields.length > 0 ? `${colVal} - ${vfConfig.field}` : vfConfig.field;
          const aggInfo = aggregationOptions.find(opt => opt.value === vfConfig.aggregation)?.label || vfConfig.aggregation;
          summaryRow[`${headerKeyBase} (${aggInfo})`] = aggregatedValue;
        });
      });
      newSummaryData.push(summaryRow);
    });
    
    // Sort summaryData by row fields
    newSummaryData.sort((a, b) => {
      for (const field of rowFields) {
        if (a[field] < b[field]) return -1;
        if (a[field] > b[field]) return 1;
      }
      return 0;
    });

    setSummaryData(newSummaryData.slice(0, 100)); // Limit display rows

  }, [uploadedData, rowFields, columnFields, valueFieldConfigs]);


  const handleDrop = (area: 'rows' | 'columns' | 'values', field: string) => {
    if (area === 'rows') {
      if (rowFields.length < MAX_ROW_FIELDS && !rowFields.includes(field)) {
        setRowFields(prev => [...prev, field]);
        toast({title: `Field Added`, description: `${field} added to Rows.`});
      } else if (rowFields.length >= MAX_ROW_FIELDS) {
        toast({title: "Limit Reached", description: `Maximum ${MAX_ROW_FIELDS} row fields allowed.`, variant: "destructive"});
      }
    } else if (area === 'columns') {
      if (columnFields.length < MAX_COL_FIELDS && !columnFields.includes(field)) {
        setColumnFields(prev => [...prev, field]);
        toast({title: `Field Added`, description: `${field} added to Columns.`});
      } else if (columnFields.length >= MAX_COL_FIELDS) {
         toast({title: "Limit Reached", description: `Maximum ${MAX_COL_FIELDS} column field allowed.`, variant: "destructive"});
      }
    } else if (area === 'values') {
      if (valueFieldConfigs.length < MAX_VALUE_FIELDS && !valueFieldConfigs.find(vf => vf.field === field)) {
        const newId = Date.now().toString(); // simple unique id
        const newFieldConfig: ValueFieldConfig = { id: newId, field, aggregation: 'sum' };
        
        // Check if numeric for default 'sum'
        const aggOption = aggregationOptions.find(opt => opt.value === 'sum')!;
        const sampleValue = uploadedData[0]?.[field];
        if (aggOption.numericOnly && typeof sampleValue !== 'number') {
            newFieldConfig.aggregation = 'count'; // Switch to count if non-numeric
             toast({title: "Field Type Note", description: `Field '${field}' is not strictly numeric. Defaulting aggregation to 'Count'. You can change this.`, duration: 5000});
        }
        setValueFieldConfigs(prev => [...prev, newFieldConfig]);
        toast({title: `Field Added`, description: `${field} added to Values.`});
      } else if (valueFieldConfigs.length >= MAX_VALUE_FIELDS) {
         toast({title: "Limit Reached", description: `Maximum ${MAX_VALUE_FIELDS} value fields allowed.`, variant: "destructive"});
      }
    }
  };

  const removeFromArea = (area: 'rows' | 'columns' | 'values', identifier: string) => { // identifier can be field name or ValueFieldConfig.id
    if (area === 'rows') setRowFields(prev => prev.filter(f => f !== identifier));
    if (area === 'columns') setColumnFields(prev => prev.filter(f => f !== identifier));
    if (area === 'values') setValueFieldConfigs(prev => prev.filter(vf => vf.id !== identifier));
    toast({title: `Field Removed`, description: `${identifier.split('-')[0]} removed from ${area}.`}); // Show field name if ID
  };

  const handleValueFieldAggregationChange = (id: string, newAggregation: AggregationType) => {
    setValueFieldConfigs(prev => prev.map(vf => {
      if (vf.id === id) {
        const aggOption = aggregationOptions.find(opt => opt.value === newAggregation)!;
        const sampleValue = uploadedData[0]?.[vf.field];
        if (aggOption.numericOnly && typeof sampleValue !== 'number') {
          toast({title: "Invalid Aggregation", description: `Aggregation '${aggOption.label}' requires a numeric field. '${vf.field}' is not numeric.`, variant: "destructive", duration: 5000});
          return vf; // Don't change if invalid
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
    const csvHeaderRow = headers.map(h => `"${h.replace(/_/g, ' ').replace(/"/g, '""')}"`).join(',');

    const dataRows = summaryData.map(row => {
      return headers.map(header => {
        let cellValue = String(row[header] ?? '');
        if (cellValue.includes(',')) {
          return `"${cellValue.replace(/"/g, '""')}"`;
        }
        return cellValue;
      }).join(',');
    });
    
    const csvContent = [csvHeaderRow, ...dataRows].join('\n');
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
        <CardDescription>Drag fields to Row, Column (Max {MAX_COL_FIELDS}), or Value areas. Max {MAX_ROW_FIELDS} Row fields, Max {MAX_VALUE_FIELDS} Value fields.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="md:col-span-1 bg-background/50 max-h-96 overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Available Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {dataFields.map(field => (
                <Badge 
                  key={field} 
                  variant="secondary" 
                  className="cursor-grab p-2 text-sm mr-1 mb-1 capitalize hover:bg-primary/20"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', field)}
                >
                  {field.replace(/_/g, ' ')}
                </Badge>
              ))}
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
        
        <h3 className="font-headline text-xl mb-4 text-primary-foreground">Summary Table</h3>
        <div className="overflow-x-auto rounded-md border max-h-[70vh]">
          <Table>
            <TableCaption>
              {summaryData.length > 0 ? `Displaying first ${Math.min(summaryData.length, 100)} summary rows.` : "Configure fields to see summary."}
            </TableCaption>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="hover:bg-muted/20">
                {rowFields.map(rf => <TableHead key={rf} className="capitalize whitespace-nowrap">{rf.replace(/_/g, ' ')}</TableHead>)}
                {columnFields.length > 0 && effectiveColumnFieldValues[0] !== '_TOTAL_' ? (
                    effectiveColumnFieldValues.map(colVal => (
                        valueFieldConfigs.map(vfConfig => {
                            const aggInfo = aggregationOptions.find(opt => opt.value === vfConfig.aggregation)?.label || vfConfig.aggregation;
                            const headerText = `${colVal} - ${vfConfig.field} (${aggInfo})`;
                            return <TableHead key={headerText} className="text-right capitalize whitespace-nowrap">{headerText.replace(/_/g, ' ')}</TableHead>;
                        })
                    ))
                ) : (
                    valueFieldConfigs.map(vfConfig => {
                        const aggInfo = aggregationOptions.find(opt => opt.value === vfConfig.aggregation)?.label || vfConfig.aggregation;
                        const headerText = `${vfConfig.field} (${aggInfo})`;
                         return <TableHead key={headerText} className="text-right capitalize whitespace-nowrap">{headerText.replace(/_/g, ' ')}</TableHead>;
                    })
                )}
                 {(rowFields.length === 0 || valueFieldConfigs.length === 0) && <TableHead>Configuration Needed</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map((item, index) => (
                <TableRow key={index} className="hover:bg-muted/10">
                  {rowFields.map(rf => <TableCell key={`${rf}-${index}`} className="capitalize whitespace-nowrap">{String(item[rf] ?? '')}</TableCell>)}
                  {dynamicColumnHeaders.map(dh => (
                    <TableCell key={`${dh}-${index}`} className="text-right whitespace-nowrap">
                      {typeof item[dh] === 'number' 
                        ? Number(item[dh]).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) 
                        : String(item[dh] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {summaryData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={rowFields.length + dynamicColumnHeaders.length || 1} className="h-24 text-center text-muted-foreground">
                    { (rowFields.length > 0 && valueFieldConfigs.length > 0) ? "No summary data to display for current configuration." : "Please select Row and Value fields."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-6 flex justify-end">
            <Button onClick={handleExport} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={summaryData.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Summary
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

