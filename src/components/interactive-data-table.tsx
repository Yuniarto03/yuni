
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Table2, Search, Filter, FileSpreadsheet, Type, CaseSensitive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import {
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption
} from '@/components/ui/table'; // Direct import of table parts
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface InteractiveDataTableProps {
  uploadedData: Record<string, any>[];
  dataFields: string[];
  fileName: string | null;
  sheetName?: string | null;
}

type DataItem = Record<string, any>;
type DataKey = string;

const fontFamilyOptions = [
  { value: 'font-body', label: 'Rajdhani (Body)' },
  { value: 'font-headline', label: 'Orbitron (Headline)' },
  { value: 'font-sans', label: 'System Sans-Serif' },
  { value: 'font-serif', label: 'System Serif' },
  { value: 'font-mono', label: 'System Monospace' },
];

const fontSizeOptions = [
  { value: 'text-xs', label: 'Extra Small' },
  { value: 'text-sm', label: 'Small' },
  { value: 'text-base', label: 'Medium' },
  { value: 'text-lg', label: 'Large' },
];

export function InteractiveDataTable({ uploadedData, dataFields, fileName, sheetName }: InteractiveDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Record<DataKey, boolean>>({});
  const [selectedFontFamily, setSelectedFontFamily] = useState<string>('font-body');
  const [selectedFontSizeClass, setSelectedFontSizeClass] = useState<string>('text-sm');
  const { toast } = useToast();

  useEffect(() => {
    const initialVisibility: Record<DataKey, boolean> = {};
    dataFields.forEach(key => {
      initialVisibility[key] = true;
    });
    setVisibleColumns(initialVisibility);
  }, [dataFields]);

  const filteredData = useMemo(() => {
    if (!uploadedData || uploadedData.length === 0) return [];
    return uploadedData.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [uploadedData, searchTerm]);

  const currentDatasetIdentifier = fileName ? `${fileName}${sheetName ? ` (Sheet: ${sheetName})` : ''}` : "your data";

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast({ title: "No Data", description: "No data available to export.", variant: "destructive" });
      return;
    }
    toast({ title: "Exporting Data", description: "Data export to CSV started..." });
    
    const activeFields = dataFields.filter(key => visibleColumns[key]);
    const headerRow = activeFields.join(',');
    const dataRows = filteredData.map(row => 
      activeFields.map(field => {
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
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const exportFileName = `${(fileName || 'exported_data').replace(/[^a-z0-9]/gi, '_')}${sheetName ? `_${sheetName.replace(/[^a-z0-9]/gi, '_')}` : ''}_table.csv`;
        link.setAttribute("download", exportFileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
  };
  
  const currentVisibleColumns = dataFields.filter(key => visibleColumns[key]);

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Table2 className="text-primary" />
          Explore Your Data
        </CardTitle>
        <CardDescription>
          {fileName ? `Displaying data from: ${currentDatasetIdentifier}. ` : "Upload a file (CSV, XLS, XLSX) to see your data. "}
          For Excel files (XLS, XLSX), ensure the correct sheet is selected for accurate table display.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {uploadedData.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No data uploaded or data is empty. Please upload a file in the 'Upload Data' section.</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center flex-wrap">
              <div className="relative w-full sm:w-auto sm:flex-grow-[2] sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search table..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input focus:bg-background"
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center sm:ml-auto sm:flex-grow-[1]">
                <div className="flex items-center gap-2">
                  <Label htmlFor="fontFamilySelect" className="text-xs text-muted-foreground whitespace-nowrap">Font:</Label>
                  <Select value={selectedFontFamily} onValueChange={setSelectedFontFamily}>
                    <SelectTrigger id="fontFamilySelect" className="h-9 w-auto min-w-[140px] bg-input focus:bg-background text-xs">
                      <SelectValue placeholder="Select Font" />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilyOptions.map(option => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="fontSizeSelect" className="text-xs text-muted-foreground whitespace-nowrap">Size:</Label>
                  <Select value={selectedFontSizeClass} onValueChange={setSelectedFontSizeClass}>
                    <SelectTrigger id="fontSizeSelect" className="h-9 w-auto min-w-[120px] bg-input focus:bg-background text-xs">
                      <SelectValue placeholder="Select Size" />
                    </SelectTrigger>
                    <SelectContent>
                      {fontSizeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" /> Columns ({currentVisibleColumns.length}/{dataFields.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 max-h-96 overflow-y-auto">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {dataFields.map(key => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={visibleColumns[key] || false}
                        onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, [key]: !!checked }))}
                        className="capitalize"
                      >
                        {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={handleExport} size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={filteredData.length === 0}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Export View
                </Button>
              </div>
            </div>

            <div className="h-[60vh] w-full max-w-screen-xl mx-auto overflow-auto rounded-md border">
              <table className={cn("w-full min-w-max caption-bottom", selectedFontFamily, selectedFontSizeClass)}>
                <TableHeader>
                  <TableRow className="hover:bg-muted/20">
                    {currentVisibleColumns.map(key => (
                      <TableHead 
                        key={`header-${key}`} 
                        className={cn(
                          "sticky top-0 z-10 bg-card whitespace-nowrap capitalize font-semibold text-foreground h-12 px-4 text-left align-middle"
                        )}
                      >
                        {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.slice(0, 100).map((item, rowIndex) => ( 
                      <TableRow 
                        key={`row-${rowIndex}-${fileName || 'nofile'}-${sheetName || 'nosheet'}-${item[dataFields[0]] || rowIndex}`} 
                        className="hover:bg-muted/10"
                      >
                        {currentVisibleColumns.map((key, cellIndex) => (
                          <TableCell 
                            key={`cell-${rowIndex}-${key}-${cellIndex}`} 
                            className="whitespace-nowrap p-4 align-middle" 
                          >
                            {typeof item[key] === 'number' ? (item[key] as number).toLocaleString() : String(item[key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={currentVisibleColumns.length || 1} className="h-24 text-center text-muted-foreground">
                        No results found for your search term or filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                 <TableCaption>
                  A view of {currentDatasetIdentifier}. Displaying {Math.min(filteredData.length, 100)} of {filteredData.length} matching rows (total {uploadedData.length} rows).
                </TableCaption>
              </table>
               {filteredData.length > 100 && (
                <p className="text-sm text-muted-foreground text-center py-2">Displaying first 100 matching rows. Export to see all data.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

