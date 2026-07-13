import { AgCharts } from 'ag-charts-react'
import type { AgChartOptions } from 'ag-charts-community'

const data = [
  { month: 'Jan', apple: 36400, vendor: 14200 },
  { month: 'Feb', apple: 37800, vendor: 14900 },
  { month: 'Mar', apple: 39200, vendor: 15600 },
  { month: 'Apr', apple: 40100, vendor: 16100 },
  { month: 'May', apple: 41300, vendor: 16800 },
  { month: 'Jun', apple: 42400, vendor: 17200 },
  { month: 'Jul', apple: 42800, vendor: 17600 },
  { month: 'Aug', apple: 43200, vendor: 17900 },
  { month: 'Sep', apple: 43800, vendor: 18100 },
  { month: 'Oct', apple: 44200, vendor: 18400 },
  { month: 'Nov', apple: 44900, vendor: 18700 },
  { month: 'Dec', apple: 45100, vendor: 19000 },
]

const options: AgChartOptions = {
  theme: 'ag-default-dark',
  background: { fill: 'transparent' },
  data,
  series: [
    {
      type: 'area',
      xKey: 'month',
      yKey: 'apple',
      yName: 'Apple Employees',
      fill: 'rgba(64, 128, 255, 0.2)',
      stroke: '#4080ff',
      strokeWidth: 2.5,
      marker: { enabled: true, size: 5, fill: '#4080ff', stroke: '#111120', strokeWidth: 2 },
    },
    {
      type: 'area',
      xKey: 'month',
      yKey: 'vendor',
      yName: 'Vendor Partners',
      fill: 'rgba(157, 124, 255, 0.15)',
      stroke: '#9d7cff',
      strokeWidth: 2.5,
      marker: { enabled: true, size: 5, fill: '#9d7cff', stroke: '#111120', strokeWidth: 2 },
    },
  ],
  axes: [
    {
      type: 'category',
      position: 'bottom',
      label: { color: '#6b6b8a', fontFamily: 'Inter, sans-serif', fontSize: 12 },
      gridLine: { style: [{ stroke: 'transparent' }] },
      line: { stroke: 'rgba(255,255,255,0.08)' },
    },
    {
      type: 'number',
      position: 'left',
      label: {
        color: '#6b6b8a',
        fontFamily: 'Inter, sans-serif',
        fontSize: 12,
        formatter: ({ value }: { value: number }) => `${(value / 1000).toFixed(0)}K`,
      },
      gridLine: { style: [{ stroke: 'rgba(255,255,255,0.05)', lineDash: [4, 4] }] },
      line: { stroke: 'rgba(255,255,255,0.08)' },
    },
  ],
  legend: {
    position: 'bottom',
    item: {
      label: { color: '#8888aa', fontFamily: 'Inter, sans-serif', fontSize: 12 },
      marker: { size: 10 },
    },
  },
  tooltip: { enabled: true },
}

export default function AgChartsDemo() {
  return (
    <AgCharts
      options={options}
      style={{ height: '280px', width: '100%' }}
    />
  )
}
