
"use client";
import React, { useState, useCallback } from 'react';
import { DataUpload } from "@/components/data-upload";
import { DataVisualization } from "@/components/data-visualization";
import { PageHeader } from "@/components/shared/page-header";
import { BarChart3 } from 'lucide-react'; // Using BarChart3 as per sidebar

export default function VisualizeDataPage() {
  const [uploadedData, setUploadedData] = useState<Record<string, any>[]>([]);
  const [dataFields, setDataFields] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheetName, setSheetName] = useState<string | null>(null);

  const handleDataUploaded = useCallback((data: Record<string, any>[], fields: string[], name: string, sName?: string) => {
    setUploadedData(data);
    setDataFields(fields);
    setFileName(name);
    setSheetName(sName || null);
    // Potentially reset visualization configurations if new data is uploaded
  }, []);

  const currentDatasetIdentifier = fileName ? `${fileName}${sheetName ? ` (Sheet: ${sheetName})` : ''}` : "N/A";

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-12 overflow-y-auto">
      <section id="data-upload-visualize" className="scroll-mt-20 py-8 first:pt-0">
        <PageHeader 
          title="Upload Data for Visualization" 
          icon={BarChart3} 
          description="Upload CSV or Excel files here to populate the charts below. Ensure your Excel sheet is selected." 
        />
        <DataUpload onDataUploaded={handleDataUploaded} />
      </section>
      
      <section id="data-visualization-charts" className="scroll-mt-20 py-8">
         {/* The PageHeader for DataVisualization component is handled internally by the component now */}
        <DataVisualization 
          uploadedData={uploadedData} 
          dataFields={dataFields} 
          currentDatasetIdentifier={currentDatasetIdentifier} 
        />
      </section>
    </div>
  );
}
