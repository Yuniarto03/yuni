"use client";

import React, { useState, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function DataUpload() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
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

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv') || droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || droppedFile.name.endsWith('.xlsx')) {
        setFile(droppedFile);
        setUploadStatus('idle');
        toast({ title: "File selected", description: droppedFile.name });
      } else {
        toast({ title: "Invalid file type", description: "Please upload a CSV or Excel file.", variant: "destructive" });
      }
      e.dataTransfer.clearData();
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
       if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv') || selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile);
        setUploadStatus('idle');
        toast({ title: "File selected", description: selectedFile.name });
      } else {
        toast({ title: "Invalid file type", description: "Please upload a CSV or Excel file.", variant: "destructive" });
      }
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }
    setUploadStatus('uploading');
    setUploadProgress(0);

    // Simulate upload
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress <= 100) {
        setUploadProgress(progress);
      } else {
        clearInterval(interval);
        // Simulate success/error
        const success = Math.random() > 0.2; // 80% success rate
        if (success) {
          setUploadStatus('success');
          toast({ title: "Upload successful", description: `${file.name} has been uploaded.` });
        } else {
          setUploadStatus('error');
          toast({ title: "Upload failed", description: `Could not upload ${file.name}.`, variant: "destructive" });
        }
      }
    }, 200);
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <UploadCloud className="text-primary" />
          Upload Your Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors duration-200
            ${dragging ? 'border-primary bg-primary/10' : 'border-border hover:border-accent'}
            ${file ? 'border-green-500 bg-green-500/10' : ''}`}
        >
          <UploadCloud className={`w-16 h-16 mb-4 ${dragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-lg font-semibold mb-1">
            {dragging ? 'Drop your file here' : file ? file.name : 'Drag & drop CSV or Excel file'}
          </p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
          <input
            type="file"
            id="fileUpload"
            className="hidden"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
          />
          <Button variant="outline" size="sm" className="mt-4" onClick={() => document.getElementById('fileUpload')?.click()}>
            Browse Files
          </Button>
        </div>

        {file && uploadStatus !== 'uploading' && uploadStatus !== 'success' && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{file.name}</span>
            </div>
            <Button onClick={handleUpload} className="bg-magentaAccent hover:bg-magentaAccent/90 text-magenta-accent-foreground">
              Upload File
            </Button>
          </div>
        )}

        {uploadStatus === 'uploading' && (
          <div className="space-y-2">
            <p className="text-sm text-center">Uploading {file?.name}...</p>
            <Progress value={uploadProgress} className="w-full [&>div]:bg-primary" />
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-400 rounded-md">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{file?.name} uploaded successfully!</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-400 rounded-md">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Upload failed for {file?.name}. Please try again.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
