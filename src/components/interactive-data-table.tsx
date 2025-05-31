
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table2, Search, Filter, FileSpreadsheet, CheckSquare, XSquare, Palette, ListFilter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import {
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const [activeContentFilters, setActiveContentFilters] = useState<Record<DataKey, Set<string>>>({});
  const [uniqueColumnValuesWithCounts, setUniqueColumnValuesWithCounts] = useState<Record<DataKey, { value: string; count: number }[]>>({});

  useEffect(() => {
    const initialVisibility: Record<DataKey, boolean> = {};
    const initialContentFilters: Record<DataKey, Set<string>> = {};
    dataFields.forEach(key => {
      initialVisibility[key] = true;
      initialContentFilters[key] = new Set();
    });
    setVisibleColumns(initialVisibility);
    setActiveContentFilters(initialContentFilters);
  }, [dataFields]);

  useEffect(() => {
    if (uploadedData.length === 0) {
      setUniqueColumnValuesWithCounts({});
      return;
    }

    const newUniqueValues: Record<DataKey, { value: string; count: number }[]> = {};
    const currentVisibleKeys = dataFields.filter(key => visibleColumns[key]);

    let dataAfterSearch = uploadedData;
    if (searchTerm) {
      dataAfterSearch = uploadedData.filter(item =>
        currentVisibleKeys.some(key =>
          String(item[key]).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    currentVisibleKeys.forEach(targetColumnKey => {
      const valueMap = new Map<string, number>();
      const dataFilteredByOtherColumns = dataAfterSearch.filter(item => {
        return currentVisibleKeys.every(filterColumnKey => {
          if (filterColumnKey === targetColumnKey) return true;
          const selectedValues = activeContentFilters[filterColumnKey];
          if (!selectedValues || selectedValues.size === 0) {
            return true;
          }
          return selectedValues.has(String(item[filterColumnKey]));
        });
      });

      dataFilteredByOtherColumns.forEach(item => {
        const val = String(item[targetColumnKey]);
        valueMap.set(val, (valueMap.get(val) || 0) + 1);
      });

      newUniqueValues[targetColumnKey] = Array.from(valueMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));
    });

    setUniqueColumnValuesWithCounts(newUniqueValues);

  }, [uploadedData, dataFields, visibleColumns, searchTerm, activeContentFilters]);


  const filteredData = useMemo(() => {
    if (!uploadedData || uploadedData.length === 0) return [];

    const currentVisibleKeys = dataFields.filter(key => visibleColumns[key]);

    let dataAfterSearch = uploadedData;
    if (searchTerm) {
      dataAfterSearch = uploadedData.filter(item =>
        currentVisibleKeys.some(key =>
          String(item[key]).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    const contentFilteredData = dataAfterSearch.filter(item => {
      return currentVisibleKeys.every(key => {
        const selectedValues = activeContentFilters[key];
        if (!selectedValues || selectedValues.size === 0) {
          return true;
        }
        return selectedValues.has(String(item[key]));
      });
    });
    return contentFilteredData;
  }, [uploadedData, searchTerm, visibleColumns, dataFields, activeContentFilters]);


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
        let value = String(row[field]); 
        if (value.includes(',')) {
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
  
  const currentVisibleColumnKeys = dataFields.filter(key => visibleColumns[key]);

  const handleSelectAllColumns = () => {
    const newVisibility: Record<DataKey, boolean> = {};
    dataFields.forEach(key => {
      newVisibility[key] = true;
    });
    setVisibleColumns(newVisibility);
  };

  const handleUnselectAllColumns = () => {
    const newVisibility: Record<DataKey, boolean> = {};
    const newContentFilters: Record<DataKey, Set<string>> = { ...activeContentFilters };
    dataFields.forEach(key => {
      newVisibility[key] = false;
      newContentFilters[key] = new Set(); 
    });
    setVisibleColumns(newVisibility);
    setActiveContentFilters(newContentFilters);
  };
  
  const handleColumnVisibilityChange = (key: DataKey, checked: boolean) => {
    setVisibleColumns(prev => ({ ...prev, [key]: checked }));
    if (!checked) {
      setActiveContentFilters(prev => {
        const newFilters = { ...prev };
        newFilters[key] = new Set();
        return newFilters;
      });
    }
  };

  const handleContentFilterChange = (columnKey: DataKey, value: string, isChecked: boolean) => {
    setActiveContentFilters(prev => {
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

  const handleSelectAllContentValues = (columnKey: DataKey) => {
    const allValues = new Set(uniqueColumnValuesWithCounts[columnKey]?.filter(uv => uv.count > 0).map(uv => uv.value) || []);
    setActiveContentFilters(prev => ({ ...prev, [columnKey]: allValues }));
  };

  const handleUnselectAllContentValues = (columnKey: DataKey) => {
    setActiveContentFilters(prev => ({ ...prev, [columnKey]: new Set() }));
  };
  
  const activeContentFilterCount = Object.values(activeContentFilters).reduce((acc, columnSet) => acc + (columnSet.size > 0 ? 1 : 0), 0);


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
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9">
                            <Palette className="mr-2 h-4 w-4" /> Font & Size
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2 space-y-2">
                        <div>
                            <Label htmlFor="fontFamilySelect" className="text-xs text-muted-foreground whitespace-nowrap block mb-1">Font Family:</Label>
                            <Select value={selectedFontFamily} onValueChange={setSelectedFontFamily}>
                                <SelectTrigger id="fontFamilySelect" className="h-9 w-full bg-input focus:bg-background text-xs">
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
                        <div>
                            <Label htmlFor="fontSizeSelect" className="text-xs text-muted-foreground whitespace-nowrap block mb-1">Font Size:</Label>
                            <Select value={selectedFontSizeClass} onValueChange={setSelectedFontSizeClass}>
                                <SelectTrigger id="fontSizeSelect" className="h-9 w-full bg-input focus:bg-background text-xs">
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
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <Filter className="mr-2 h-4 w-4" /> Columns ({currentVisibleColumnKeys.length}/{dataFields.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 max-h-96">
                      <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handleSelectAllColumns} className="cursor-pointer">
                      <CheckSquare className="mr-2 h-4 w-4" /> Select All
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={handleUnselectAllColumns} className="cursor-pointer">
                      <XSquare className="mr-2 h-4 w-4" /> Unselect All
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <ScrollArea className="max-h-80"> {/* Max height for the scrollable list of columns */}
                        <div className="px-1"> {/* Add padding if ScrollArea children need it, usually items have their own */}
                          {dataFields.map(key => (
                          <DropdownMenuCheckboxItem
                              key={key}
                              checked={visibleColumns[key] || false}
                              onCheckedChange={(checked) => handleColumnVisibilityChange(key, !!checked)}
                              className="capitalize"
                          >
                              {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
                          </DropdownMenuCheckboxItem>
                          ))}
                        </div>
                      </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <ListFilter className="mr-2 h-4 w-4" />
                      Filter Content {activeContentFilterCount > 0 && `(${activeContentFilterCount})`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 max-h-[70vh] p-0">
                     <Accordion type="multiple" className="w-full">
                        {currentVisibleColumnKeys.filter(key => uniqueColumnValuesWithCounts[key]?.some(uv => uv.count > 0)).map(columnKey => {
                            const uniqueValues = uniqueColumnValuesWithCounts[columnKey]?.filter(uv => uv.count > 0) || [];
                            const activeFiltersInColumn = activeContentFilters[columnKey]?.size || 0;
                            return (
                            <AccordionItem value={columnKey} key={columnKey}>
                                <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                                    <div className="flex justify-between w-full items-center">
                                        <span className="capitalize truncate pr-2">{columnKey.replace(/_/g, ' ')}</span>
                                        {activeFiltersInColumn > 0 && <span className="text-xs text-muted-foreground">({activeFiltersInColumn} selected)</span>}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-0">
                                    <div className="p-2 border-t">
                                    <div className="flex justify-between mb-2">
                                        <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllContentValues(columnKey)}>Select All Visible ({uniqueValues.length})</Button>
                                        <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleUnselectAllContentValues(columnKey)}>Unselect All</Button>
                                    </div>
                                    <ScrollArea className="h-48">
                                        <div className="space-y-1 pr-3">
                                        {uniqueValues.map(({ value, count }) => (
                                            <Label key={value} className="flex items-center space-x-2 p-1 rounded hover:bg-muted/50 text-xs font-normal">
                                            <Checkbox
                                                checked={activeContentFilters[columnKey]?.has(value) || false}
                                                onCheckedChange={(checked) => handleContentFilterChange(columnKey, value, !!checked)}
                                                id={`content-filter-${columnKey}-${value.replace(/\s+/g, '-')}`}
                                            />
                                            <span className="flex-grow truncate" title={value}>{value || "(empty)"}</span>
                                            <span className="text-muted-foreground">({count})</span>
                                            </Label>
                                        ))}
                                        {uniqueValues.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No filterable values with current criteria.</p>}
                                        </div>
                                    </ScrollArea>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            );
                        })}
                        {currentVisibleColumnKeys.filter(key => uniqueColumnValuesWithCounts[key]?.some(uv => uv.count > 0)).length === 0 && (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                                No columns with filterable content for current criteria.
                            </div>
                        )}
                     </Accordion>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={handleExport} size="sm" className="h-9 bg-accent hover:bg-accent/90 text-accent-foreground" disabled={filteredData.length === 0}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Export View
                </Button>
              </div>
            </div>

            <div className="h-[60vh] w-full max-w-screen-xl mx-auto overflow-auto rounded-md border">
              <table className={cn("w-full min-w-max caption-bottom", selectedFontFamily, selectedFontSizeClass)}>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="hover:bg-muted/20">
                    {currentVisibleColumnKeys.map(key => (
                      <TableHead
                        key={`header-${key}`}
                        className={cn(
                           "whitespace-nowrap capitalize font-semibold text-foreground h-12 px-4 text-left align-middle"
                        )}
                      >
                        {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}
                      </TableHead>
                    ))}
                     {currentVisibleColumnKeys.length === 0 && <TableHead className="h-12 px-4 text-left align-middle">No columns selected</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.slice(0, 100).map((item, rowIndex) => (
                      <TableRow
                        key={`row-${rowIndex}-${fileName || 'nofile'}-${sheetName || 'nosheet'}-${item[dataFields[0]] || rowIndex}`}
                        className="hover:bg-muted/10"
                      >
                        {currentVisibleColumnKeys.map((key, cellIndex) => (
                          <TableCell
                            key={`cell-${rowIndex}-${key}-${cellIndex}`}
                            className="whitespace-nowrap p-4 align-middle"
                          >
                            {String(item[key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={currentVisibleColumnKeys.length || 1} className="h-24 text-center text-muted-foreground">
                        {uploadedData.length > 0 ? "No results found for your search term or filters." : "No data available."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                 <TableCaption className="sticky bottom-0 bg-card/80 backdrop-blur-sm py-2">
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

    