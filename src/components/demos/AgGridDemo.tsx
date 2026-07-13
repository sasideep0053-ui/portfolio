import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

const STATUS_COLOR: Record<string, string> = {
  Healthy: '#34d399',
  Monitoring: '#fb923c',
  Degraded: '#f87171',
}

const StatusCell = (p: { value: string }) => (
  <span style={{ color: STATUS_COLOR[p.value] ?? 'inherit', fontWeight: 600 }}>
    {p.value}
  </span>
)

const rowData = [
  { region: 'Americas',          users: 24800, reports: 4200, uptime: '99.98%', status: 'Healthy' },
  { region: 'Europe',            users: 18600, reports: 3100, uptime: '99.95%', status: 'Healthy' },
  { region: 'Asia Pacific',      users: 12400, reports: 2800, uptime: '99.97%', status: 'Healthy' },
  { region: 'Latin America',     users: 5200,  reports: 890,  uptime: '99.91%', status: 'Monitoring' },
  { region: 'Middle East & Africa', users: 3100, reports: 420, uptime: '99.88%', status: 'Degraded' },
]

const colDefs: ColDef[] = [
  { field: 'region',  headerName: 'Region',        flex: 1.4, minWidth: 150 },
  { field: 'users',   headerName: 'Active Users',   flex: 1,   minWidth: 120,
    valueFormatter: p => p.value?.toLocaleString() },
  { field: 'reports', headerName: 'Reports / Day',  flex: 1,   minWidth: 120,
    valueFormatter: p => p.value?.toLocaleString() },
  { field: 'uptime',  headerName: 'Uptime',         flex: 0.8, minWidth: 90 },
  { field: 'status',  headerName: 'Status',         flex: 0.9, minWidth: 110,
    cellRenderer: StatusCell },
]

export default function AgGridDemo() {
  return (
    <div
      className="ag-theme-quartz-dark ag-grid-override"
      style={{ height: '268px', width: '100%' }}
    >
      <AgGridReact
        rowData={rowData}
        columnDefs={colDefs}
        defaultColDef={{ sortable: true, filter: true, resizable: true }}
        suppressMovableColumns={false}
        animateRows={true}
      />
    </div>
  )
}
