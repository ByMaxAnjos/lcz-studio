import React from 'react'
import { useStore } from '../store/useStore'
import { getTranslation } from '../i18n/translations'
import './SettingsPanel.css'

interface SettingsPanelProps {
  onClose: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const {
    language,
    setLanguage,
    projectName,
    setProjectName,
    projectDescription,
    setProjectDescription,
    theme,
    setTheme,
  } = useStore()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>{t('settings')}</h2>
          <button className="settings-close" onClick={onClose} aria-label={t('settingsClose')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="settings-body">
          <section className="settings-section">
            <h3>{t('settingsProject')}</h3>
            <div className="settings-field">
              <label htmlFor="settings-project-name">{t('projectName')}</label>
              <input
                id="settings-project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-project-desc">{t('settingsProjectDescription')}</label>
              <textarea
                id="settings-project-desc"
                rows={3}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder={t('settingsProjectDescriptionPlaceholder')}
              />
            </div>
          </section>

          <section className="settings-section">
            <h3>{t('settingsAppearance')}</h3>
            <div className="settings-field">
              <label htmlFor="settings-theme">{t('settingsTheme')}</label>
              <div className="theme-selector">
                <button
                  className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                  type="button"
                >
                  <span className="theme-icon">☀️</span>
                  <span>{t('settingsThemeLight')}</span>
                </button>
                <button
                  className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                  type="button"
                >
                  <span className="theme-icon">🌙</span>
                  <span>{t('settingsThemeDark')}</span>
                </button>
                <button
                  className={`theme-option ${theme === 'system' ? 'active' : ''}`}
                  onClick={() => setTheme('system')}
                  type="button"
                >
                  <span className="theme-icon">💻</span>
                  <span>{t('settingsThemeSystem')}</span>
                </button>
              </div>
            </div>
            <div className="settings-field">
              <label htmlFor="settings-language">{t('settingsLanguage')}</label>
              <select
                id="settings-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'pt' | 'es' | 'zh')}
              >
                <option value="en">English</option>
                <option value="pt">Portugues</option>
                <option value="es">Espanol</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </section>

          <section className="settings-section">
            <h3>{t('settingsAbout')}</h3>
            <div className="settings-about">
              <p><strong>LCZ Studio</strong></p>
              <p className="settings-about-text">{t('settingsAboutDescription')}</p>
              <p className="settings-about-version">v0.1.0</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
