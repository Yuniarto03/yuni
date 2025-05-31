"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UploadCloud,
  Table2,
  LayoutGrid,
  Brain,
  LineChart,
  BarChart3, // Changed from BarChart3D
  Settings,
  Users
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { AppLogo } from './app-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  { href: '#dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '#data-upload', label: 'Upload Data', icon: UploadCloud },
  { href: '#data-table', label: 'Explore Data', icon: Table2 },
  { href: '#data-summary', label: 'Summarize Data', icon: LayoutGrid },
  { href: '#ai-insights', label: 'AI Insights', icon: Brain },
  { href: '#forecast-analysis', label: 'Forecast', icon: LineChart },
  { href: '#data-visualization', label: 'Visualize', icon: BarChart3 }, // Changed from BarChart3D
];

export function SidebarNav() {
  const pathname = usePathname(); // In a real app, this would be used to determine active link if not a single page app

  return (
    <>
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  // isActive={pathname === item.href} // Simplified for single page scroll
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip={{ children: 'User Profile', side: 'right', align: 'center' }}>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="user avatar" />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <span>User Name</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip={{ children: 'Settings', side: 'right', align: 'center' }}>
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
