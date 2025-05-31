
import { SidebarProvider, Sidebar, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { PageHeader } from "@/components/shared/page-header";

import { DataUpload } from "@/components/data-upload";
import { InteractiveDataTable } from "@/components/interactive-data-table";
import { DataSummarization } from "@/components/data-summarization";
import { AIInsights } from "@/components/ai-insights";
import { ForecastAnalysis } from "@/components/forecast-analysis";
import { DataVisualization } from "@/components/data-visualization";

import { LayoutDashboard, UploadCloud, Table2, LayoutGrid, Brain, LineChart, BarChart3 } from "lucide-react";

const sections = [
  { id: "dashboard", title: "Dashboard Overview", icon: LayoutDashboard, component: null, description: "Welcome to InsightFlow! Here's a quick overview." },
  { id: "data-upload", title: "Upload Data", icon: UploadCloud, component: DataUpload, description: "Upload your CSV or Excel files to get started." },
  { id: "data-table", title: "Explore Data", icon: Table2, component: InteractiveDataTable, description: "Interact with your dataset using search, sort, and filters." },
  { id: "data-summary", title: "Summarize Data", icon: LayoutGrid, component: DataSummarization, description: "Create dynamic pivot-table like summaries." },
  { id: "ai-insights", title: "AI Insights", icon: Brain, component: AIInsights, description: "Leverage AI to uncover insights from your data." },
  { id: "forecast-analysis", title: "Forecast Analysis", icon: LineChart, component: ForecastAnalysis, description: "Generate future projections based on your data." },
  { id: "data-visualization", title: "Data Visualization", icon: BarChart3, component: DataVisualization, description: "Create various charts to visualize your findings." },
];


export default function InsightFlowPage() {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarNav />
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <div className="min-h-screen p-4 md:p-8 space-y-12 overflow-y-auto">
          {sections.map(section => (
            <section key={section.id} id={section.id} className="scroll-mt-20 py-8 first:pt-0">
              <PageHeader title={section.title} icon={section.icon} description={section.description} />
              {section.component ? (
                <section.component />
              ) : (
                section.id === "dashboard" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-card/50 p-6 rounded-lg shadow-lg">
                      <h3 className="font-headline text-xl text-primary mb-2">Quick Stats</h3>
                      <p className="text-muted-foreground">Datasets Uploaded: 3</p>
                      <p className="text-muted-foreground">Reports Generated: 12</p>
                      <p className="text-muted-foreground">Active Visualizations: 5</p>
                    </div>
                     <div className="bg-card/50 p-6 rounded-lg shadow-lg">
                      <h3 className="font-headline text-xl text-accent mb-2">Recent Activity</h3>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                        <li>Uploaded 'sales_data_q4.csv'</li>
                        <li>Generated forecast for 'Product Alpha'</li>
                        <li>Shared 'Customer Segmentation' report</li>
                      </ul>
                    </div>
                     <div className="bg-card/50 p-6 rounded-lg shadow-lg">
                      <h3 className="font-headline text-xl text-secondary mb-2">Tips & Tricks</h3>
                      <p className="text-muted-foreground text-sm">Use <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Ctrl/Cmd + B</kbd> to toggle the sidebar.</p>
                       <p className="text-muted-foreground text-sm mt-1">Try dragging column headers to reorder in the data table (feature coming soon!).</p>
                    </div>
                  </div>
                )
              )}
            </section>
          ))}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
