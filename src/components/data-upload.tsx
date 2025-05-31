
"use client";

import React, { useState, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface DataUploadProps {
  onDataUploaded: (data: Record<string, any>[], fields: string[], fileName: string) => void;
}

export function DataUpload({ onDataUploaded }: DataUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const { toast } = useToast();

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

  const processFile = useCallback((selectedFile: File) => {
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (allowedExtensions.includes(fileExtension)) {
      setFile(selectedFile);
      setUploadStatus('idle');
      toast({ title: "File selected", description: selectedFile.name });
      if (fileExtension === '.xls' || fileExtension === '.xlsx') {
        toast({
          title: "Excel File Selected",
          description: "Parsing for .xls/.xlsx is basic and may not work for complex files. For best results, please convert to CSV. The system will attempt to process it.",
          variant: "default",
          duration: 7000, // Longer duration for this warning
        });
      }
    } else {
      toast({ title: "Invalid file type", description: "Please upload a CSV, XLS, or XLSX file.", variant: "destructive" });
      setFile(null);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const parseCSV = (csvText: string): { data: Record<string, any>[], fields: string[] } => {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return { data: [], fields: [] };

    // Basic CSV parsing, assumes comma delimiter.
    // More robust parsing might be needed for Excel-like CSVs (e.g., handling quotes, other delimiters)
    const headers = lines[0].split(',').map(header => header.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
    const data = lines.slice(1).map(line => {
      // This is a simplified CSV value parser. It doesn't handle complex cases
      // like commas within quoted fields, or escaped quotes perfectly.
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
      const entry: Record<string, any> = {};
      headers.forEach((header, index) => {
        const value = values[index] || ''; // Ensure value exists
        if (value !== "" && !isNaN(Number(value))) {
          entry[header] = Number(value);
        } else {
          entry[header] = value;
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
    }
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string;
        // The existing parseCSV function will be used.
        // For XLS/XLSX, this will likely interpret the binary content as text, leading to garbled data or errors.
        // A proper Excel parser would be needed here for robust handling.
        const { data, fields } = parseCSV(fileContent); 
        
        if (fields.length === 0 && data.length === 0 && fileContent.length > 0) {
            // This condition suggests parsing might have failed significantly for a non-empty file
            toast({ title: "Parsing Issue", description: `Could not effectively parse ${file.name}. If it's an Excel file, try converting to CSV.`, variant: "destructive" });
            setUploadStatus('error');
            setParsing(false);
            return;
        }
         if (fields.length === 0 || (data.length === 0 && linesToExpectDataFrom(fileContent) > 1) ) {
            // If there are no fields, or no data rows when we expected some (e.g. more than just a header row)
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            let errorDesc = "Could not parse the file. Ensure it's valid and non-empty.";
            if (ext === '.xls' || ext === '.xlsx') {
                errorDesc = `Could not properly parse ${file.name}. The current parser is optimized for CSV. Please try converting complex Excel files to CSV for best results.`;
            }
            toast({ title: "Parsing Error", description: errorDesc, variant: "destructive" });
            setUploadStatus('error');
            setParsing(false);
            return;
        }

        onDataUploaded(data, fields, file.name);
        setUploadStatus('success');
        toast({ title: "Processing complete", description: `${file.name} has been processed.` });
      } catch (error) {
        console.error("Error parsing file:", error);
        toast({ title: "Parsing Error", description: `An error occurred while processing ${file.name}. It might be an unsupported format or corrupted.`, variant: "destructive" });
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
    // For XLS/XLSX, readAsText will read the binary content as text.
    // A library approach would use readAsArrayBuffer or similar then pass to the library.
    reader.readAsText(file); 
  };

  // Helper to check if we should expect data rows based on lines
  const linesToExpectDataFrom = (content: string) => {
    return content.split(/\r\n|\n/).filter(line => line.trim() !== '').length;
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <UploadCloud className="text-primary" />
          Upload Your Data
        </CardTitle>
        <CardDescription>Upload a CSV, XLS, or XLSX file to begin analysis. Ensure the first row contains headers. Parsing for XLS/XLSX is basic; CSV is recommended for complex files.</CardDescription>
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

        {file && uploadStatus !== 'uploading' && uploadStatus !== 'success' && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{file.name} ({Math.round(file.size / 1024)} KB)</span>
            </div>
            <Button onClick={handleUploadAndParse} className="bg-magentaAccent hover:bg-magentaAccent/90 text-magenta-accent-foreground" disabled={parsing}>
              {parsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {parsing ? 'Processing...' : 'Process File'}
            </Button>
          </div>
        )}

        {(uploadStatus === 'uploading' || parsing) && uploadProgress < 100 && (
          <div className="space-y-2">
            <p className="text-sm text-center">{uploadStatus === 'uploading' && !parsing ? `Reading ${file?.name}...` : `Processing ${file?.name}...`}</p>
            <Progress value={uploadProgress} className="w-full [&>div]:bg-primary" />
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-400 rounded-md">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{file?.name} processed successfully! View data in other sections.</span>
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
