import React, { useState, useMemo } from 'react'
import './DataTable.css'

export interface DataTableProps {
  data: any[]
  columns?: string[]
  maxRows?: number
  sortable?: boolean
  filterable?: boolean
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  maxRows = 100,
  sortable = true,
  filterable = true,
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterText, setFilterText] = useState('')

  // Determine columns from data if not provided
  const tableColumns = useMemo(() => {
    if (columns) return columns
    if (data.length === 0) return []
    return Object.keys(data[0])
  }, [data, columns])

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data]

    // Filter
    if (filterText) {
      const lowerFilter = filterText.toLowerCase()
      result = result.filter((row) =>
        tableColumns.some((col) =>
          String(row[col]).toLowerCase().includes(lowerFilter)
        )
      )
    }

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        }

        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        return sortDirection === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr)
      })
    }

    return result.slice(0, maxRows)
  }, [data, sortColumn, sortDirection, filterText, tableColumns, maxRows])

  const handleSort = (column: string) => {
    if (!sortable) return

    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  if (tableColumns.length === 0) {
    return <div className="data-table-empty">No data to display</div>
  }

  return (
    <div className="data-table-container">
      {filterable && (
        <div className="data-table-filter">
          <input
            type="text"
            placeholder="Filter data..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="filter-input"
          />
        </div>
      )}

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {tableColumns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className={sortable ? 'sortable' : ''}
                >
                  <div className="column-header">
                    <span>{col}</span>
                    {sortable && sortColumn === col && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {tableColumns.map((col) => (
                  <td key={`${rowIndex}-${col}`}>
                    {typeof row[col] === 'number'
                      ? row[col].toFixed(4)
                      : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="data-table-info">
        Showing {processedData.length} of {data.length} rows
      </div>
    </div>
  )
}
