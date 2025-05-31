"use client";

import React, { useState } from 'react';
import { LayoutGrid, Rows, Columns, Sigma, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';

// Mock data fields
const mockFields = ['Country', 'City', 'Product Category', 'Sales', 'Quantity', 'Profit', 'Order Date'];

// Mock summary data (replace with actual logic)
const mockSummaryData = [
  { row: 'USA', column: 'Electronics', value: 120000 },
  { row: 'USA', column: 'Clothing', value: 85000 },
  { row: 'Canada', column: 'Electronics', value: 75000 },
  { row: 'Canada', column: 'Clothing', value: 60000 },
];


export function DataSummarization() {
  const [rows, setRows] = useState<string[]>(['Country']);
  const [columns, setColumns] = useState<string[]>(['Product Category']);
  const [values, setValues] = useState<string[]>(['Sales']);
  const { toast } = useToast();

  // Placeholder for drag-and-drop functionality
  const handleDrop = (area: 'rows' | 'columns' | 'values', field: string) => {
    if (area === 'rows') setRows(prev => [...prev, field]);
    if (area === 'columns') setColumns(prev => [...prev, field]);
    if (area === 'values') setValues(prev => [...prev, field]);
    toast({title: `Field Added`, description: `${field} added to ${area}.`})
  };

  const removeFromArea = (area: 'rows' | 'columns' | 'values', field: string) => {
    if (area === 'rows') setRows(prev => prev.filter(f => f !== field));
    if (area === 'columns') setColumns(prev => prev.filter(f => f !== field));
    if (area === 'values') setValues(prev => prev.filter(f => f !== field));
    toast({title: `Field Removed`, description: `${field} removed from ${area}.`})
  }

  const handleExport = () => {
    toast({ title: "Exporting Summary", description: "Summary table export to Excel started..." });
    // Placeholder for actual export logic
    console.log("Exporting summary:", mockSummaryData);
  };


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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Available Fields */}
          <Card className="md:col-span-1 bg-background/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Available Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mockFields.map(field => (
                <Badge 
                  key={field} 
                  variant="secondary" 
                  className="cursor-grab p-2 text-sm mr-2 mb-2"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', field)}
                >
                  {field}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {/* Configuration Areas */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { title: 'Rows', icon: Rows, items: rows, area: 'rows' },
              { title: 'Columns', icon: Columns, items: columns, area: 'columns' },
              { title: 'Values', icon: Sigma, items: values, area: 'values' },
            ] as const).map(({ title, icon: Icon, items, area }) => (
              <Card 
                key={title} 
                className="min-h-[150px] bg-background/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const field = e.dataTransfer.getData('text/plain');
                  if (field && !items.includes(field)) handleDrop(area, field);
                }}
              >
                <CardHeader>
                  <CardTitle className="text-md font-medium flex items-center gap-2">
                    <Icon className="w-5 h-5 text-accent" /> {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-3 pt-0">
                  {items.map(item => (
                    <Badge key={item} variant="outline" className="cursor-pointer p-1.5 text-xs mr-1 mb-1" onClick={() => removeFromArea(area, item)}>
                      {item} &times;
                    </Badge>
                  ))}
                  {items.length === 0 && <p className="text-xs text-muted-foreground">Drop fields here</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Summary Table */}
        <h3 className="font-headline text-xl mb-4 text-primary-foreground">Summary Table</h3>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/20">
                <TableHead>{rows.join('/') || 'Row'}</TableHead>
                <TableHead>{columns.join('/') || 'Column'}</TableHead>
                <TableHead className="text-right">{values.join('/') || 'Value'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSummaryData.map((item, index) => (
                <TableRow key={index} className="hover:bg-muted/10">
                  <TableCell>{item.row}</TableCell>
                  <TableCell>{item.column}</TableCell>
                  <TableCell className="text-right">{item.value.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {mockSummaryData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Configure fields to see summary.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-6 flex justify-end">
            <Button onClick={handleExport} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Summary
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
