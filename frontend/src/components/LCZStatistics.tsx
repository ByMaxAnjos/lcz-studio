import React, { useMemo } from 'react'
import './LCZStatistics.css'

export interface LCZStats {
  lczClass: number
  name: string
  area?: number
  percentage?: number
  temperature?: number
  humidity?: number
  windSpeed?: number
  count?: number
}

export interface LCZStatisticsProps {
  data: LCZStats[]
  title?: string
}

export const LCZStatistics: React.FC<LCZStatisticsProps> = ({
  data,
  title = 'LCZ Statistics',
}) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null

    const totalArea = data.reduce((sum, item) => sum + (item.area || 0), 0)
    const avgTemp = data.reduce((sum, item) => sum + (item.temperature || 0), 0) / data.length
    const maxTemp = Math.max(...data.map((item) => item.temperature || 0))
    const minTemp = Math.min(...data.map((item) => item.temperature || 0))

    return {
      totalArea,
      avgTemp: avgTemp.toFixed(2),
      maxTemp: maxTemp.toFixed(2),
      minTemp: minTemp.toFixed(2),
      classCount: data.length,
    }
  }, [data])

  if (!stats) {
    return <div className="lcz-stats-empty">No data available</div>
  }

  return (
    <div className="lcz-statistics">
      <h3 className="stats-title">{title}</h3>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Area</div>
          <div className="stat-value">{stats.totalArea.toFixed(2)} km²</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Avg Temperature</div>
          <div className="stat-value">{stats.avgTemp}°C</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Max Temperature</div>
          <div className="stat-value">{stats.maxTemp}°C</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Min Temperature</div>
          <div className="stat-value">{stats.minTemp}°C</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">LCZ Classes</div>
          <div className="stat-value">{stats.classCount}</div>
        </div>
      </div>

      <div className="stats-table">
        <table>
          <thead>
            <tr>
              <th>Class</th>
              <th>Name</th>
              <th>Area (km²)</th>
              <th>%</th>
              <th>Temp (°C)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx}>
                <td className="class-number">{item.lczClass}</td>
                <td>{item.name}</td>
                <td>{(item.area || 0).toFixed(2)}</td>
                <td>{(item.percentage || 0).toFixed(1)}</td>
                <td>{(item.temperature || 0).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
