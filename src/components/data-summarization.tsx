
"use client";

import React, { useState, useEffect } from 'react';
import { LayoutGrid, Rows, Columns, Sigma, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface DataSummarizationProps {
  uploadedData: Record<string, any>[];
  dataFields: string[];
}

type AggregationType = 'sum' | 'count' | 'average' | 'min' | 'max' | 'uniqueCount' | 'sdev';

const aggregationOptions: { value: AggregationType; label: string }[] = [
  { value: 'sum', label: 'Sum' },
  { value: 'count', label: 'Count' },
  { value: 'average', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
  { value: 'uniqueCount', label: 'Unique Count' },
  { value: 'sdev', label: 'Standard Deviation' },
];

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
  if (countNumeric < 2) {
    return 0; // Or NaN, depending on desired behavior for insufficient data
  }
  // Sample standard deviation
  const variance = (sumOfSquares - (sum * sum) / countNumeric) / (countNumeric - 1);
  return Math.sqrt(Math.max(0, variance)); // Math.max to prevent sqrt of tiny negative due to precision
}


export function DataSummarization({ uploadedData, dataFields }: DataSummarizationProps) {
  const [rows, setRows] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]); // Stores the field name for aggregation
  const [aggregationType, setAggregationType] = useState<AggregationType>('sum');
  const [summaryData, setSummaryData] = useState<Record<string, any>[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Reset configuration when new data/fields are loaded
    setRows([]);
    setColumns([]);
    setValues([]);
    setAggregationType('sum');
    setSummaryData([]);
  }, [uploadedData, dataFields]);
  
  useEffect(() => {
    if (uploadedData.length > 0 && rows.length > 0 && values.length > 0) {
      const rowField = rows[0];
      const valueField = values[0];
      const colField = columns.length > 0 ? columns[0] : null;

      const groupedData: Record<string, Record<string, AggregationState>> = {};

      uploadedData.forEach(item => {
        const rowValue = String(item[rowField] ?? '');
        const colValue = colField ? String(item[colField] ?? '') : '_default_';
        const originalValue = item[valueField]; // Keep original for unique count, count
        const numValue = parseFloat(String(item[valueField]));

        if (!groupedData[rowValue]) {
          groupedData[rowValue] = {};
        }
        if (!groupedData[rowValue][colValue]) {
          groupedData[rowValue][colValue] = {
            sum: 0,
            sumOfSquares: 0,
            countNumeric: 0,
            countTotal: 0,
            uniqueValues: new Set(),
            min: Infinity,
            max: -Infinity,
          };
        }
        
        const currentGroupState = groupedData[rowValue][colValue];

        currentGroupState.countTotal++;
        currentGroupState.uniqueValues.add(originalValue);

        if (!isNaN(numValue)) {
          currentGroupState.sum += numValue;
          currentGroupState.sumOfSquares += numValue * numValue;
          currentGroupState.countNumeric++;
          currentGroupState.min = Math.min(currentGroupState.min, numValue);
          currentGroupState.max = Math.max(currentGroupState.max, numValue);
        }
      });

      const newSummary: Record<string, any>[] = [];
      for (const rVal in groupedData) {
        for (const cVal in groupedData[rVal]) {
            const summaryRow: Record<string, any> = {};
            summaryRow[rowField] = rVal;
            if (colField && cVal !== '_default_') summaryRow[colField] = cVal;
            
            const groupState = groupedData[rVal][cVal];
            let aggregatedValue: number | string = 0;

            switch (aggregationType) {
              case 'sum':
                aggregatedValue = groupState.sum;
                break;
              case 'count':
                aggregatedValue = groupState.countTotal;
                break;
              case 'average':
                aggregatedValue = groupState.countNumeric > 0 ? groupState.sum / groupState.countNumeric : 0;
                break;
              case 'min':
                aggregatedValue = groupState.min === Infinity ? 0 : groupState.min;
                break;
              case 'max':
                aggregatedValue = groupState.max === -Infinity ? 0 : groupState.max;
                break;
              case 'uniqueCount':
                aggregatedValue = groupState.uniqueValues.size;
                break;
              case 'sdev':
                aggregatedValue = calculateSdev(groupState.sum, groupState.sumOfSquares, groupState.countNumeric);
                break;
              default:
                aggregatedValue = groupState.sum;
            }
            summaryRow[valueField] = aggregatedValue;
            newSummary.push(summaryRow);
        }
      }
      setSummaryData(newSummary.slice(0,50)); 
    } else {
      setSummaryData([]);
    }
  }, [uploadedData, rows, columns, values, aggregationType]);


  const handleDrop = (area: 'rows' | 'columns' | 'values', field: string) => {
    if (area === 'rows' && !rows.includes(field)) setRows(prev => [...prev, field].slice(0, 1));
    if (area === 'columns' && !columns.includes(field)) setColumns(prev => [...prev, field].slice(0, 1)); 
    if (area === 'values' && !values.includes(field)) {
      const isNumericFieldRequired = ['sum', 'average', 'min', 'max', 'sdev'].includes(aggregationType);
      const sampleValue = uploadedData[0]?.[field];
      if (isNumericFieldRequired && typeof sampleValue !== 'number') {
         toast({title: "Invalid Field Type", description: `Field '${field}' must be numeric for ${aggregationType} aggregation. Count/Unique Count can be used.`, variant: "destructive", duration: 4000});
         // Optionally, allow drop but switch aggregation, or just block
         // For now, we block if numeric is strictly needed.
         if (typeof sampleValue !== 'number' && (aggregationType !== 'count' && aggregationType !== 'uniqueCount')) return;
      }
      setValues(prev => [...prev, field].slice(0, 1));
    }
    toast({title: `Field Added`, description: `${field} added to ${area}.`})
  };

  const removeFromArea = (area: 'rows' | 'columns' | 'values', field: string) => {
    if (area === 'rows') setRows(prev => prev.filter(f => f !== field));
    if (area === 'columns') setColumns(prev => prev.filter(f => f !== field));
    if (area === 'values') {
        setValues(prev => prev.filter(f => f !== field));
        if (values.length === 1) { // If we are removing the last value field
            // Optionally reset aggregation type or handle as needed
            // setAggregationType('sum');
        }
    }
    toast({title: `Field Removed`, description: `${field} removed from ${area}.`})
  }

  const handleExport = () => {
     if (summaryData.length === 0) {
      toast({ title: "No Summary Data", description: "No summary data to export.", variant: "destructive" });
      return;
    }
    toast({ title: "Exporting Summary", description: "Summary table export to CSV started..." });
    
    const valueFieldLabel = values.length > 0 ? `${values[0]} (${aggregationOptions.find(opt => opt.value === aggregationType)?.label || aggregationType})` : 'Aggregated Value';
    const headers = [rows[0], columns.length > 0 ? columns[0] : null, valueFieldLabel].filter(Boolean) as string[];
    const csvHeaderRow = headers.join(',');

    const dataRows = summaryData.map(row => {
      const rowValues: (string | number | undefined)[] = [];
      if (rows.length > 0) rowValues.push(row[rows[0]]);
      if (columns.length > 0 && colField) rowValues.push(row[colField]);
      if (values.length > 0) rowValues.push(row[values[0]]);
      
      return rowValues.map(val => {
        let cellValue = String(val ?? '');
        if (cellValue.includes(',')) {
          return `"${cellValue}"`;
        }
        return cellValue;
      }).join(',');
    });
    
    const csvContent = [csvHeaderRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", "data_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const valueFieldConfigDescription = () => {
    if (['sum', 'average', 'min', 'max', 'sdev'].includes(aggregationType)) {
      return "Value Field (1 Max, Numeric)";
    }
    return "Value Field (1 Max)";
  }
  
  const colField = columns.length > 0 ? columns[0] : null;


  if (uploadedData.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <LayoutGrid className="text-primary" />
            Summarize Your Data
          </CardTitle>
          <CardDescription>Drag and drop fields to configure your summary table. Select aggregation for value field.</CardDescription>
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
          Summarize Your Data
        </CardTitle>
        <CardDescription>Drag and drop fields. Select aggregation for the value field. (Max 1 row, 1 column, 1 value field).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="md:col-span-1 bg-background/50 max-h-96 overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Available Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dataFields.map(field => (
                <Badge 
                  key={field} 
                  variant="secondary" 
                  className="cursor-grab p-2 text-sm mr-2 mb-2 capitalize"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', field)}
                >
                  {field.replace(/_/g, ' ')}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { title: 'Row Field (1 Max)', icon: Rows, items: rows, area: 'rows', description: "" },
              { title: 'Column Field (1 Max, Optional)', icon: Columns, items: columns, area: 'columns', description: "" },
              { title: valueFieldConfigDescription(), icon: Sigma, items: values, area: 'values', description: "" },
            ] as const).map(({ title, icon: Icon, items, area }) => (
              <Card 
                key={title} 
                className="min-h-[150px] bg-background/50 flex flex-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const field = e.dataTransfer.getData('text/plain');
                  if (field) {
                     handleDrop(area, field);
                  }
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-md font-medium flex items-center gap-2">
                    <Icon className="w-5 h-5 text-accent" /> {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-3 pt-0 flex-grow">
                  {items.map(item => (
                    <Badge key={item} variant="outline" className="cursor-pointer p-1.5 text-xs mr-1 mb-1 capitalize" onClick={() => removeFromArea(area, item)}>
                      {item.replace(/_/g, ' ')} &times;
                    </Badge>
                  ))}
                  {items.length === 0 && <p className="text-xs text-muted-foreground">Drop field here</p>}
                  
                  {area === 'values' && items.length > 0 && (
                    <div className="mt-3">
                      <Label htmlFor="aggregationSelect" className="text-xs text-muted-foreground">Aggregation:</Label>
                      <Select value={aggregationType} onValueChange={(value: AggregationType) => setAggregationType(value)}>
                        <SelectTrigger id="aggregationSelect" className="h-9 w-full bg-input focus:bg-background text-xs mt-1">
                          <SelectValue placeholder="Select Aggregation" />
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <h3 className="font-headline text-xl mb-4 text-primary-foreground">Summary Table</h3>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableCaption>
              {summaryData.length > 0 ? `Displaying first ${summaryData.length} summary rows.` : "Configure fields to see summary."}
              {values.length > 0 && !['count', 'uniqueCount'].includes(aggregationType) && typeof uploadedData[0]?.[values[0]] !== 'number' && 
                <span className="block text-destructive text-xs mt-1">Warning: Selected value field for {aggregationType} is not strictly numeric. Results may be 0 or NaN.</span>
              }
            </TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-muted/20">
                {rows.length > 0 && <TableHead className="capitalize">{rows[0].replace(/_/g, ' ')}</TableHead>}
                {columns.length > 0 && <TableHead className="capitalize">{columns[0].replace(/_/g, ' ')}</TableHead>}
                {values.length > 0 && <TableHead className="text-right capitalize">{values[0].replace(/_/g, ' ')} ({aggregationOptions.find(opt => opt.value === aggregationType)?.label || aggregationType})</TableHead>}
                 {(rows.length === 0 || values.length === 0) && <TableHead>Configuration Needed</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map((item, index) => (
                <TableRow key={index} className="hover:bg-muted/10">
                  {rows.length > 0 && <TableCell className="capitalize">{String(item[rows[0]])}</TableCell>}
                  {columns.length > 0 && colField && <TableCell className="capitalize">{String(item[colField])}</TableCell>}
                  {values.length > 0 && <TableCell className="text-right">
                    {typeof item[values[0]] === 'number' 
                      ? Number(item[values[0]]).toLocaleString(undefined, {maximumFractionDigits: 2}) 
                      : String(item[values[0]])}
                  </TableCell>}
                </TableRow>
              ))}
              {summaryData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={ (rows.length > 0 ? 1:0) + (columns.length > 0 ? 1:0) + (values.length > 0 ? 1:0) || 1} className="h-24 text-center text-muted-foreground">
                    { (rows.length > 0 && values.length > 0) ? "No summary data to display." : "Please select at least one Row field and one Value field."}
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
