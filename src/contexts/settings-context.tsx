
"use client";

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';

// Define available themes and their CSS variable mappings
export const chartThemes = {
  default: { // Based on globals.css :root
    chart1: 'hsl(var(--chart-1))', // Cyan
    chart2: 'hsl(var(--chart-2))', // Lighter Violet
    chart3: 'hsl(var(--chart-3))', // Lighter Magenta
    chart4: 'hsl(var(--chart-4))', // Blue
    chart5: 'hsl(var(--chart-5))', // Green
  },
  ocean: {
    chart1: 'hsl(205, 85%, 55%)', // Brighter Blue
    chart2: 'hsl(175, 70%, 45%)', // Teal
    chart3: 'hsl(220, 80%, 70%)', // Light Steel Blue
    chart4: 'hsl(190, 75%, 60%)', // Sky Blue
    chart5: 'hsl(240, 60%, 65%)', // Indigo
  },
  forest: {
    chart1: 'hsl(120, 60%, 40%)', // Dark Green
    chart2: 'hsl(90, 55%, 55%)',  // Olive Green
    chart3: 'hsl(140, 50%, 65%)', // Sea Green
    chart4: 'hsl(70, 45%, 50%)',  // Light Olive
    chart5: 'hsl(30, 65%, 60%)',  // Earthy Brown
  },
  sunset: {
    chart1: 'hsl(30, 90%, 55%)',  // Orange
    chart2: 'hsl(0, 85%, 60%)',   // Red
    chart3: 'hsl(50, 95%, 65%)',  // Yellow-Orange
    chart4: 'hsl(350, 80%, 70%)', // Pink-Red
    chart5: 'hsl(20, 75%, 50%)',  // Burnt Orange
  },
  pastel: {
    chart1: 'hsl(300, 70%, 80%)', // Light Lavender
    chart2: 'hsl(180, 60%, 75%)', // Light Aqua
    chart3: 'hsl(60, 80%, 80%)',  // Pale Yellow
    chart4: 'hsl(0, 75%, 85%)',   // Light Pink
    chart5: 'hsl(120, 50%, 80%)', // Mint Green
  }
};

export type ThemeKey = keyof typeof chartThemes;

interface SettingsContextType {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  chartAnimationsEnabled: boolean;
  setChartAnimationsEnabled: (enabled: boolean) => void;
  dataPrecision: number;
  setDataPrecision: (precision: number) => void;
  chartThemes: typeof chartThemes;
}

const defaultSettings: SettingsContextType = {
  theme: 'default',
  setTheme: () => {},
  chartAnimationsEnabled: true,
  setChartAnimationsEnabled: () => {},
  dataPrecision: 2, // Default to 2 decimal places
  setDataPrecision: () => {},
  chartThemes: chartThemes,
};

const SettingsContext = createContext<SettingsContextType>(defaultSettings);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('insightflow-theme') as ThemeKey) || 'default';
    }
    return 'default';
  });

  const [chartAnimationsEnabled, setChartAnimationsEnabledState] = useState<boolean>(() => {
     if (typeof window !== 'undefined') {
      const storedAnimations = localStorage.getItem('insightflow-chart-animations');
      return storedAnimations ? JSON.parse(storedAnimations) : true;
    }
    return true;
  });

  const [dataPrecision, setDataPrecisionState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedPrecision = localStorage.getItem('insightflow-data-precision');
      return storedPrecision ? parseInt(storedPrecision, 10) : 2;
    }
    return 2;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('insightflow-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('insightflow-chart-animations', JSON.stringify(chartAnimationsEnabled));
    }
  }, [chartAnimationsEnabled]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('insightflow-data-precision', String(dataPrecision));
    }
  }, [dataPrecision]);


  const setTheme = (newTheme: ThemeKey) => {
    setThemeState(newTheme);
  };

  const setChartAnimationsEnabled = (enabled: boolean) => {
    setChartAnimationsEnabledState(enabled);
  };
  
  const setDataPrecision = (precision: number) => {
    setDataPrecisionState(Math.max(0, Math.min(5, precision))); // Clamp precision between 0 and 5
  };

  const value = useMemo(() => ({
    theme,
    setTheme,
    chartAnimationsEnabled,
    setChartAnimationsEnabled,
    dataPrecision,
    setDataPrecision,
    chartThemes,
  }), [theme, chartAnimationsEnabled, dataPrecision]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
