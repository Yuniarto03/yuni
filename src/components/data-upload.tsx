
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
    if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setUploadStatus('idle');
      toast({ title: "File selected", description: selectedFile.name });
    } else {
      toast({ title: "Invalid file type", description: "Please upload a CSV file. Excel (.xlsx) is not yet supported.", variant: "destructive" });
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

    const headers = lines[0].split(',').map(header => header.trim());
    const data = lines.slice(1).map(line => {
      const values = line.split(',');
      const entry: Record<string, any> = {};
      headers.forEach((header, index) => {
        const value = values[index] ? values[index].trim() : '';
        // Attempt to convert to number if possible
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
    reader.onloadend = () => { // Fired when the read is completed, successfully or not.
        setUploadProgress(100); // Ensure progress hits 100 before parsing starts visually
    }
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const { data, fields } = parseCSV(csvText);
        if (fields.length === 0 || data.length === 0) {
          toast({ title: "Parsing Error", description: "Could not parse CSV. Ensure it's valid and non-empty.", variant: "destructive" });
          setUploadStatus('error');
          setParsing(false);
          return;
        }
        onDataUploaded(data, fields, file.name);
        setUploadStatus('success');
        toast({ title: "Upload successful", description: `${file.name} has been processed.` });
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast({ title: "Parsing Error", description: "An error occurred while parsing the CSV file.", variant: "destructive" });
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
    reader.readAsText(file);
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <UploadCloud className="text-primary" />
          Upload Your Data
        </CardTitle>
        <CardDescription>Upload a CSV file to begin analysis. Ensure the first row contains headers. (Max 5MB)</CardDescription>
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
            {dragging ? 'Drop your CSV file here' : file ? file.name : 'Drag & drop CSV file'}
          </p>
          <p className="text-sm text-muted-foreground">or click to browse (max 5MB)</p>
          <input
            type="file"
            id="fileUpload"
            className="hidden"
            accept=".csv"
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
            <p className="text-sm text-center">{uploadStatus === 'uploading' && !parsing ? `Reading ${file?.name}...` : `Parsing ${file?.name}...`}</p>
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
