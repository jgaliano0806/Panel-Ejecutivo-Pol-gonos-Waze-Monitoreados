// Custom type declarations for third-party libraries with type issues

// Fix recharts JSX component type issues with React 18
declare module "recharts" {
  import * as React from "react";

  // Re-export everything from recharts but with correct React component types
  export const AreaChart: React.FC<any>;
  export const Area: React.FC<any>;
  export const BarChart: React.FC<any>;
  export const Bar: React.FC<any>;
  export const LineChart: React.FC<any>;
  export const Line: React.FC<any>;
  export const PieChart: React.FC<any>;
  export const Pie: React.FC<any>;
  export const ScatterChart: React.FC<any>;
  export const Scatter: React.FC<any>;
  export const XAxis: React.FC<any>;
  export const YAxis: React.FC<any>;
  export const ZAxis: React.FC<any>;
  export const CartesianGrid: React.FC<any>;
  export const Tooltip: React.FC<any>;
  export const Legend: React.FC<any>;
  export const Cell: React.FC<any>;
  export const ResponsiveContainer: React.FC<any>;
  export const ReferenceLine: React.FC<any>;
  export const ReferenceArea: React.FC<any>;
  export const ComposedChart: React.FC<any>;
  export const Brush: React.FC<any>;
  export const RadarChart: React.FC<any>;
  export const Radar: React.FC<any>;
  export const RadialBarChart: React.FC<any>;
  export const RadialBar: React.FC<any>;
  export const Treemap: React.FC<any>;
  export const Funnel: React.FC<any>;
  export const FunnelChart: React.FC<any>;
  export const Sankey: React.FC<any>;
  export const Label: React.FC<any>;
  export const LabelList: React.FC<any>;
  export const ErrorBar: React.FC<any>;
  export const Surface: React.FC<any>;
  export const Symbols: React.FC<any>;
  export const Layer: React.FC<any>;
  export const Rectangle: React.FC<any>;
  export const Sector: React.FC<any>;
  export const Curve: React.FC<any>;
  export const Cross: React.FC<any>;
  export const Dot: React.FC<any>;
  export const Polygon: React.FC<any>;
  export const Text: React.FC<any>;
  export const Global: React.FC<any>;
}

// Fix vitest types
declare module "vitest" {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(value: any): any;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export const vi: any;
}
