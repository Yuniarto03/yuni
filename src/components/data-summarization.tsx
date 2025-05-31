
"use client";

import React, { useState, useEffect } from 'react';
import { LayoutGrid, Rows, Columns, Sigma, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';

interface DataSummarizationProps {
  uploadedData: Record<string, any>[];
  dataFields: string[];
}

export function DataSummarization({ uploadedData, dataFields }: DataSummarizationProps) {
  const [rows, setRows] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [summaryData, setSummaryData] = useState<Record<string, any>[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Reset configuration when new data/fields are loaded
    setRows([]);
    setColumns([]);
    setValues([]);
    setSummaryData([]);
  }, [uploadedData, dataFields]);
  
  // Basic summarization logic (placeholder for more advanced pivoting)
  useEffect(() => {
    if (uploadedData.length > 0 && rows.length > 0 && values.length > 0) {
      // This is a very simplified aggregation. Real pivot table logic is complex.
      // Example: Group by the first row field, sum the first value field.
      const rowField = rows[0];
      const valueField = values[0];
      const colField = columns.length > 0 ? columns[0] : null;

      const groupedData: Record<string, Record<string, number>> = {};

      uploadedData.forEach(item => {
        const rowValue = String(item[rowField]);
        const colValue = colField ? String(item[colField]) : '_default_';
        const numValue = parseFloat(item[valueField]);

        if (!isNaN(numValue)) {
          if (!groupedData[rowValue]) {
            groupedData[rowValue] = {};
          }
          if (!groupedData[rowValue][colValue]) {
            groupedData[rowValue][colValue] = 0;
          }
          groupedData[rowValue][colValue] += numValue;
        }
      });

      const newSummary = [];
      for (const rVal in groupedData) {
        for (const cVal in groupedData[rVal]) {
            const summaryRow: Record<string, any> = {};
            summaryRow[rowField] = rVal;
            if (colField && cVal !== '_default_') summaryRow[colField] = cVal;
            summaryRow[valueField] = groupedData[rVal][cVal];
            newSummary.push(summaryRow);
        }
      }
      setSummaryData(newSummary.slice(0,50)); // Limit display for performance
    } else {
      setSummaryData([]);
    }
  }, [uploadedData, rows, columns, values]);


  const handleDrop = (area: 'rows' | 'columns' | 'values', field: string) => {
    if (area === 'rows' && !rows.includes(field)) setRows(prev => [...prev, field].slice(0, 1)); // Limit to 1 for simplicity
    if (area === 'columns' && !columns.includes(field)) setColumns(prev => [...prev, field].slice(0, 1)); // Limit to 1
    if (area === 'values' && !values.includes(field)) setValues(prev => [...prev, field].slice(0, 1)); // Limit to 1
    toast({title: `Field Added`, description: `${field} added to ${area}.`})
  };

  const removeFromArea = (area: 'rows' | 'columns' | 'values', field: string) => {
    if (area === 'rows') setRows(prev => prev.filter(f => f !== field));
    if (area === 'columns') setColumns(prev => prev.filter(f => f !== field));
    if (area === 'values') setValues(prev => prev.filter(f => f !== field));
    toast({title: `Field Removed`, description: `${field} removed from ${area}.`})
  }

  const handleExport = () => {
     if (summaryData.length === 0) {
      toast({ title: "No Summary Data", description: "No summary data to export.", variant: "destructive" });
      return;
    }
    toast({ title: "Exporting Summary", description: "Summary table export to CSV started..." });
    
    const headers = [rows[0], columns.length > 0 ? columns[0] : null, values[0]].filter(Boolean) as string[];
    const headerRow = headers.join(',');
    const dataRows = summaryData.map(row => 
      headers.map(field => {
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
    link.setAttribute("download", "data_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };


  if (uploadedData.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <LayoutGrid className="text-primary" />
            Summarize Your Data
          </CardTitle>
          <CardDescription>Drag and drop fields to configure your summary table.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">No data uploaded. Please upload a CSV file in the 'Upload Data' section to use this feature.</p>
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
        <CardDescription>Drag and drop fields to configure your summary table. (Simplified: 1 row, 1 column, 1 value field)</CardDescription>
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
              { title: 'Row Field (1 Max)', icon: Rows, items: rows, area: 'rows' },
              { title: 'Column Field (1 Max, Optional)', icon: Columns, items: columns, area: 'columns' },
              { title: 'Value Field (1 Max, Numeric)', icon: Sigma, items: values, area: 'values' },
            ] as const).map(({ title, icon: Icon, items, area }) => (
              <Card 
                key={title} 
                className="min-h-[150px] bg-background/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const field = e.dataTransfer.getData('text/plain');
                  if (field && (area === 'values' ? typeof uploadedData[0]?.[field] === 'number' : true)) {
                     handleDrop(area, field);
                  } else if (field && area === 'values') {
                    toast({title: "Invalid Field", description: "Value field must be numeric.", variant: "destructive"});
                  }
                }}
              >
                <CardHeader>
                  <CardTitle className="text-md font-medium flex items-center gap-2">
                    <Icon className="w-5 h-5 text-accent" /> {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-3 pt-0">
                  {items.map(item => (
                    <Badge key={item} variant="outline" className="cursor-pointer p-1.5 text-xs mr-1 mb-1 capitalize" onClick={() => removeFromArea(area, item)}>
                      {item.replace(/_/g, ' ')} &times;
                    </Badge>
                  ))}
                  {items.length === 0 && <p className="text-xs text-muted-foreground">Drop field here</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <h3 className="font-headline text-xl mb-4 text-primary-foreground">Summary Table</h3>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableCaption>
              {summaryData.length > 0 ? `Displaying first ${summaryData.length} summary rows.` : "Configure fields to see summary. Ensure value field is numeric."}
            </TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-muted/20">
                {rows.length > 0 && <TableHead className="capitalize">{rows[0].replace(/_/g, ' ')}</TableHead>}
                {columns.length > 0 && <TableHead className="capitalize">{columns[0].replace(/_/g, ' ')}</TableHead>}
                {values.length > 0 && <TableHead className="text-right capitalize">{values[0].replace(/_/g, ' ')} (Sum)</TableHead>}
                 {(rows.length === 0 || values.length === 0) && <TableHead>Configuration Needed</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map((item, index) => (
                <TableRow key={index} className="hover:bg-muted/10">
                  {rows.length > 0 && <TableCell className="capitalize">{String(item[rows[0]])}</TableCell>}
                  {columns.length > 0 && <TableCell className="capitalize">{String(item[columns[0]])}</TableCell>}
                  {values.length > 0 && <TableCell className="text-right">{Number(item[values[0]]).toLocaleString()}</TableCell>}
                </TableRow>
              ))}
              {summaryData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={ (rows.length > 0 ? 1:0) + (columns.length > 0 ? 1:0) + (values.length > 0 ? 1:0) || 1} className="h-24 text-center text-muted-foreground">
                    { (rows.length > 0 && values.length > 0) ? "No summary data to display or values are non-numeric." : "Please select at least one Row field and one Value field (numeric)."}
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
