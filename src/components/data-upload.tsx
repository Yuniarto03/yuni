
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, SheetIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface DataUploadProps {
  onDataUploaded: (data: Record<string, any>[], fields: string[], fileName: string, sheetName?: string) => void;
}

export function DataUpload({ onDataUploaded }: DataUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setSheetNames([]);
    setSelectedSheetName('');
    setUploadProgress(0);
    setUploadStatus('idle');
    setParsing(false);
  };

  useEffect(() => {
    if (file) {
      setSelectedSheetName('');
    }
  }, [file]);


  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processFileSelection = useCallback(async (selectedFile: File) => {
    resetState();
    setFile(selectedFile);
    setUploadStatus('idle');
    
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (fileExtension === '.xls' || fileExtension === '.xlsx') {
      toast({
        title: "Excel File Selected",
        description: "Reading sheet names... Please select a sheet to process.",
        variant: "default",
      });
      try {
        setParsing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            setSheetNames(workbook.SheetNames);
            if (workbook.SheetNames.length > 0) {
              setSelectedSheetName(workbook.SheetNames[0]);
            }
            toast({ title: "Sheets Loaded", description: "Please select a sheet and click 'Process File'." });
          } catch (error) {
            console.error("Error reading Excel sheet names:", error);
            toast({ title: "Error Reading Sheets", description: "Could not read sheet names from the Excel file.", variant: "destructive" });
            resetState();
          } finally {
             setParsing(false);
          }
        };
        reader.onerror = () => {
          toast({ title: "File Read Error", description: "Could not read the selected Excel file.", variant: "destructive" });
          resetState();
          setParsing(false);
        };
        reader.readAsArrayBuffer(selectedFile);
      } catch (error) {
          console.error("Error processing Excel file for sheets:", error);
          toast({ title: "Excel Processing Error", description: "An error occurred while trying to read sheet names.", variant: "destructive" });
          resetState();
          setParsing(false);
      }
    } else if (fileExtension === '.csv') {
      toast({ title: "CSV File selected", description: selectedFile.name });
      setSheetNames([]);
      setSelectedSheetName('');
    } else {
      toast({ title: "Invalid file type", description: "Please upload a CSV, XLS, or XLSX file.", variant: "destructive" });
      resetState();
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileSelection(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [processFileSelection]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileSelection(e.target.files[0]);
    }
  };

  const parseCSV = (csvText: string): { data: Record<string, any>[], fields: string[] } => {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return { data: [], fields: [] };
    const headers = lines[0].split(',').map(header => header.trim().replace(/^"|"$/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
      const entry: Record<string, any> = {};
      headers.forEach((header, index) => {
        const rawValue = values[index] === undefined ? '' : values[index];
        if (rawValue.trim() !== '') {
            const numValue = Number(rawValue);
            if (!isNaN(numValue)) {
                if (/^[-+]?\d*\.?\d+$/.test(rawValue)) {
                    entry[header] = numValue;
                } else {
                    entry[header] = rawValue;
                }
            } else {
                entry[header] = rawValue;
            }
        } else {
             entry[header] = rawValue; 
        }
      });
      return entry;
    });
    return { data, fields: headers };
  };

  const handleUploadAndParse = () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if ((fileExtension === '.xls' || fileExtension === '.xlsx') && !selectedSheetName) {
        toast({ title: "No sheet selected", description: "Please select a sheet to process for the Excel file.", variant: "destructive" });
        return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setParsing(true);

    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded * 100) / event.total);
        setUploadProgress(progress);
      }
    };
    reader.onloadend = () => { 
        setUploadProgress(100);
    };

    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result;
        let parsedData: Record<string, any>[] = [];
        let parsedFields: string[] = [];

        if (fileExtension === '.csv' && typeof fileContent === 'string') {
          const { data, fields } = parseCSV(fileContent);
          parsedData = data;
          parsedFields = fields;
        } else if ((fileExtension === '.xls' || fileExtension === '.xlsx') && fileContent instanceof ArrayBuffer) {
          const workbook = XLSX.read(fileContent, { type: 'array', cellDates: true });
          if (!workbook.SheetNames.includes(selectedSheetName)) {
            throw new Error(`Sheet "${selectedSheetName}" not found in the workbook.`);
          }
          const worksheet = workbook.Sheets[selectedSheetName];
          const jsonDataRaw = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, blankrows: false, defval: null, raw: true });
          
          if (jsonDataRaw.length === 0) {
            parsedFields = [];
            parsedData = [];
          } else {
            parsedFields = jsonDataRaw[0].map(headerCell => String(headerCell === null ? "" : headerCell));
            parsedData = jsonDataRaw.slice(1).map(rowArray => {
              const rowObject: Record<string, any> = {};
              parsedFields.forEach((header, index) => {
                rowObject[header] = rowArray[index]; // Value should have correct type (Date, number, boolean, string, or null)
              });
              return rowObject;
            });
          }
        } else {
            throw new Error("Unsupported file type or content for parsing.");
        }
        
        if (parsedFields.length === 0 && parsedData.length === 0 && file.size > 0) {
            toast({ title: "Parsing Issue", description: `Could not effectively parse ${file.name}${selectedSheetName ? ` (Sheet: ${selectedSheetName})` : ''}. The sheet might be empty or the format unrecognized.`, variant: "destructive" });
            setUploadStatus('error');
            setParsing(false);
            return;
        }

        onDataUploaded(parsedData, parsedFields, file.name, selectedSheetName || undefined);
        setUploadStatus('success');
        toast({ title: "Processing complete", description: `${file.name}${selectedSheetName ? ` (Sheet: ${selectedSheetName})` : ''} has been processed.` });
      } catch (error: any) {
        console.error("Error parsing file:", error);
        toast({ title: "Parsing Error", description: `An error occurred while processing ${file.name}: ${error.message || 'Unknown error'}. It might be an unsupported format or corrupted.`, variant: "destructive" });
        setUploadStatus('error');
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => {
      toast({ title: "File Read Error", description: "Could not read the selected file.", variant: "destructive" });
      setUploadStatus('error');
      setParsing(false);
    };

    if (fileExtension === '.csv') {
        reader.readAsText(file);
    } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
        reader.readAsArrayBuffer(file);
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <UploadCloud className="text-primary" />
          Upload Your Data
        </CardTitle>
        <CardDescription>Upload a CSV, XLS, or XLSX file. For Excel files, select the sheet to process. Ensure the first row contains headers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors duration-200
            ${dragging ? 'border-primary bg-primary/10' : 'border-border hover:border-accent'}
            ${file && uploadStatus !== 'error' ? 'border-green-500 bg-green-500/10' : ''}
            ${uploadStatus === 'error' ? 'border-red-500 bg-red-500/10' : ''}`}
        >
          <UploadCloud className={`w-16 h-16 mb-4 ${dragging ? 'text-primary' : file && uploadStatus !== 'error' ? 'text-green-500' : 'text-muted-foreground'}`} />
          <p className="text-lg font-semibold mb-1">
            {dragging ? 'Drop your file here' : file ? file.name : 'Drag & drop CSV, XLS, XLSX file'}
          </p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
          <input
            type="file"
            id="fileUpload"
            className="hidden"
            accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
          />
          <Button variant="outline" size="sm" className="mt-4" onClick={() => document.getElementById('fileUpload')?.click()} disabled={parsing || uploadStatus === 'uploading'}>
            Browse Files
          </Button>
        </div>

        {file && sheetNames.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="sheetSelect" className="flex items-center gap-2 text-sm font-medium">
                <SheetIcon className="w-4 h-4 text-muted-foreground"/> Select Sheet:
            </Label>
            <Select value={selectedSheetName} onValueChange={setSelectedSheetName} disabled={parsing}>
              <SelectTrigger id="sheetSelect" className="w-full bg-input focus:bg-background">
                <SelectValue placeholder="Select a sheet" />
              </SelectTrigger>
              <SelectContent>
                {sheetNames.map(name => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {file && uploadStatus !== 'uploading' && uploadStatus !== 'success' && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{file.name} ({Math.round(file.size / 1024)} KB)
                {sheetNames.length > 0 && selectedSheetName && ` - Sheet: ${selectedSheetName}`}
              </span>
            </div>
            <Button 
              onClick={handleUploadAndParse} 
              className="bg-magentaAccent hover:bg-magentaAccent/90 text-magenta-accent-foreground" 
              disabled={parsing || (sheetNames.length > 0 && !selectedSheetName)}
            >
              {parsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {parsing ? 'Processing...' : 'Process File'}
            </Button>
          </div>
        )}

        {(uploadStatus === 'uploading' || parsing) && uploadProgress < 100 && !sheetNames.length && ( 
          <div className="space-y-2">
            <p className="text-sm text-center">{parsing && file?.name.endsWith('.xls') || file?.name.endsWith('.xlsx') ? `Reading sheets from ${file?.name}...` : (uploadStatus === 'uploading' && !parsing ? `Reading ${file?.name}...` : `Processing ${file?.name}...`)}</p>
            <Progress value={uploadProgress} className="w-full [&>div]:bg-primary" />
          </div>
        )}
         {parsing && (file?.name.endsWith('.xls') || file?.name.endsWith('.xlsx')) && sheetNames.length === 0 && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                Reading sheet names from Excel file...
            </div>
        )}


        {uploadStatus === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-400 rounded-md">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{file?.name}{selectedSheetName ? ` (Sheet: ${selectedSheetName})` : ''} processed successfully! View data in other sections.</span>
          </div>
        )}

        {uploadStatus === 'error' && !parsing && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-400 rounded-md">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Processing failed for {file?.name}. Please check file or console and try again.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    