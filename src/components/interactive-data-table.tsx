"use client";

import React, { useState, useMemo } from 'react';
import { Table2, Search, Filter, Download, FileSpreadsheet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const initialData = [
  { id: 'USR001', name: 'Alice Wonderland', email: 'alice@example.com', city: 'New York', country: 'USA', sales: 1500, date: '2023-01-15' },
  { id: 'USR002', name: 'Bob The Builder', email: 'bob@example.com', city: 'London', country: 'UK', sales: 2200, date: '2023-02-20' },
  { id: 'USR003', name: 'Charlie Chaplin', email: 'charlie@example.com', city: 'Paris', country: 'France', sales: 1800, date: '2023-03-10' },
  { id: 'USR004', name: 'Diana Prince', email: 'diana@example.com', city: 'Berlin', country: 'Germany', sales: 2500, date: '2023-04-05' },
  { id: 'USR005', name: 'Edward Scissorhands', email: 'edward@example.com', city: 'Tokyo', country: 'Japan', sales: 3100, date: '2023-05-25' },
];

type DataItem = typeof initialData[0];
type DataKey = keyof DataItem;

export function InteractiveDataTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<DataItem[]>(initialData);
  const [visibleColumns, setVisibleColumns] = useState<Record<DataKey, boolean>>({
    id: true, name: true, email: true, city: true, country: true, sales: true, date: true
  });
  const { toast } = useToast();

  const columnKeys = Object.keys(initialData[0] || {}) as DataKey[];

  const filteredData = useMemo(() => {
    return data.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  const handleExport = () => {
    toast({ title: "Exporting Data", description: "Data export to Excel started..." });
    // Placeholder for actual export logic
    console.log("Exporting data:", filteredData);
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Table2 className="text-primary" />
          Explore Your Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input focus:bg-background"
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columnKeys.map(key => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={visibleColumns[key]}
                    onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, [key]: !!checked }))}
                    className="capitalize"
                  >
                    {key.replace(/([A-Z])/g, ' $1')}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleExport} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export to Excel
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableCaption>A list of your recent data entries.</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-muted/20">
                {columnKeys.filter(key => visibleColumns[key]).map(key => (
                  <TableHead key={key} className="capitalize font-semibold text-foreground">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/10">
                    {columnKeys.filter(key => visibleColumns[key]).map(key => (
                      <TableCell key={key} className="py-3">
                        {typeof item[key] === 'number' ? (item[key] as number).toLocaleString() : String(item[key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columnKeys.filter(key => visibleColumns[key]).length} className="h-24 text-center text-muted-foreground">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
