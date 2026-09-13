import React from 'react'
import { useStore } from '../store/useStore'
import { getTranslation } from '../i18n/translations'
import { BASEMAP_STYLE_IDS, BASEMAP_STYLE_INFO, BasemapStyleId } from '../map/MapLibreManager'
import './BasemapPicker.css'

export const BasemapPicker: React.FC = () => {
  const { basemapStyle, setBasemapStyle, language } = useStore()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)

  return (
    <select
      className="basemap-picker"
      aria-label={t('basemapStyle')}
      value={basemapStyle}
      onChange={(e) => setBasemapStyle(e.target.value as BasemapStyleId)}
    >
      {BASEMAP_STYLE_IDS.map((id) => (
        <option key={id} value={id}>
          {BASEMAP_STYLE_INFO[id]?.label}
        </option>
      ))}
    </select>
  )
}
