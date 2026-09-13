import type { ReactNode, SVGProps } from 'react'

export const TOOL_ICON_NAMES = [
  'map-download', 'area', 'buildings', 'canopy', 'satellite', 'indices',
  'climate-grid', 'cache', 'time-series', 'anomaly', 'heat-island',
  'surface-heat', 'interpolation', 'ml-interpolation', 'drought', 'comfort',
] as const

export type ToolIconName = typeof TOOL_ICON_NAMES[number]
export type CategoryIconName = 'data' | 'analysis' | 'climate' | 'category-interpolation' | 'system'

type StudioIconName = ToolIconName | CategoryIconName

const iconPaths: Record<StudioIconName, ReactNode> = {
  data: <><ellipse cx="12" cy="5.5" rx="7" ry="2.5" /><path d="M5 5.5v8c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-8M5 9.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" /></>,
  analysis: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 4-6" /><circle cx="7" cy="15" r="1" /><circle cx="10" cy="11" r="1" /><circle cx="13" cy="13" r="1" /><circle cx="17" cy="7" r="1" /></>,
  climate: <><path d="M7 18h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.7A3.2 3.2 0 0 0 7 18Z" /><path d="M8 21v-1M12 21v-1M16 21v-1" /></>,
  'category-interpolation': <><path d="M5 5h14v14H5z" /><path d="m5 5 7 7 7-7M5 19l7-7 7 7" /><circle cx="12" cy="12" r="2" /></>,
  system: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.1 2.1-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.1h-3v-.1a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.1-2.1.06-.06A1.7 1.7 0 0 0 7.06 15 1.7 1.7 0 0 0 5.5 14H5v-3h.1a1.7 1.7 0 0 0 1.56-1.03 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.1-2.1.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.33 4.8v-.1h3v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.1 2.1-.06.06A1.7 1.7 0 0 0 19 10a1.7 1.7 0 0 0 1.56 1.03h.1v3h-.1A1.7 1.7 0 0 0 19.4 15Z" /></>,
  'map-download': <><path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z" /><path d="M9 4v14M15 6v14M12 8v6M9.5 11.5 12 14l2.5-2.5" /></>,
  area: <><path d="M5 5h14v14H5z" /><path d="M8 5v3M11 5v2M14 5v3M5 8h3M5 11h2M5 14h3" /><path d="M13 13h3v3" /></>,
  buildings: <><path d="M4 20V9l5-4v15M9 20V4l6 3v13M15 20v-8l5-3v11" /><path d="M6 12h1M6 16h1M11 9h1M11 13h1M16.5 13h1M16.5 16h1" /></>,
  canopy: <><path d="M4 20h16M6 20v-5h12v5M8 15V8h8v7" /><path d="M12 4c-3 0-5 2-5 4h10c0-2-2-4-5-4Z" /><path d="M10 11h4" /></>,
  satellite: <><circle cx="12" cy="12" r="3" /><path d="m9.7 9.7-4-4M14.3 14.3l4 4M14.3 9.7l4-4M9.7 14.3l-4 4" /><path d="m3.5 5.5 3-2 2.2 2.2-3 2zM15.3 18.3l3-2 2.2 2.2-3 2z" /></>,
  indices: <><path d="M12 20V5M12 10c-1-3-4-4-6-3 1 3 3 5 6 5M12 14c1-3 4-4 6-3-1 3-3 5-6 5" /><path d="M5 20h14" /></>,
  'climate-grid': <><path d="M4 5h16v14H4zM4 10h16M9 5v14M15 5v14" /><path d="m7 14 1 2 1-2M17 13v4M15.5 15h3" /></>,
  cache: <><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" /><path d="M10 11v5M14 11v5" /></>,
  'time-series': <><path d="M4 19V5M4 19h16" /><path d="m6 15 3-4 3 2 5-7" /><circle cx="6" cy="15" r="1" /><circle cx="9" cy="11" r="1" /><circle cx="12" cy="13" r="1" /><circle cx="17" cy="6" r="1" /></>,
  anomaly: <><path d="M12 4a4 4 0 0 0-4 4v6.5a5.5 5.5 0 1 0 8 0V8a4 4 0 0 0-4-4Z" /><path d="M12 8v8M10 13h4" /><path d="M18 6v4M20 8h-4" /></>,
  'heat-island': <><path d="M5 20h14M7 20v-6h10v6M9 14V9h6v5" /><path d="M12 3c-1.8 2-2.8 3.5-2.8 5A2.8 2.8 0 0 0 12 10.8 2.8 2.8 0 0 0 14.8 8C14.8 6.5 13.8 5 12 3Z" /></>,
  'surface-heat': <><path d="M4 17c2-2 4-2 6 0s4 2 6 0 3-2 4-1" /><path d="M5 21h14" /><path d="M12 4a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4Z" /><path d="M12 1v2M6 5l1.5 1M18 5l-1.5 1" /></>,
  interpolation: <><path d="M5 5h14v14H5z" /><path d="m5 5 7 7 7-7M5 19l7-7 7 7" /><circle cx="12" cy="12" r="2" /></>,
  'ml-interpolation': <><path d="M5 7h5v5H5zM14 5h5v5h-5zM14 14h5v5h-5z" /><path d="M10 9h4M16.5 10v4M10 12l4 4" /><circle cx="8" cy="9" r="1" /><circle cx="16.5" cy="7.5" r="1" /><circle cx="16.5" cy="16.5" r="1" /></>,
  drought: <><path d="M12 3c-3 4-5 6.5-5 10a5 5 0 0 0 10 0c0-3.5-2-6-5-10Z" /><path d="M9 14c1-1 2-1 3 0s2 1 3 0M10 18l4-4" /></>,
  comfort: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3" /><path d="M5 20c2-1.5 4-1.5 6 0" /></>,
}

export function StudioIcon({ name, className, ...props }: SVGProps<SVGSVGElement> & { name: StudioIconName }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {iconPaths[name]}
    </svg>
  )
}
