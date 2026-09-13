import React, { useState } from 'react'
import { getTranslation, Language } from '../i18n/translations'
import { GENERAL_TOOLS, LOCAL_TOOLS, ToolDef } from './toolRegistry'
import { StudioIcon } from './StudioIcon'
import './HelpCenter.css'

interface HelpCenterProps {
  language: Language
  onExploreFunctions: (workspace: 'general' | 'local') => void
}

const GuideIcon: React.FC<{ name: string }> = ({ name }) => {
  const paths: Record<string, React.ReactNode> = {
    workspace: <><rect x="3" y="4" width="8" height="16" rx="2" /><rect x="13" y="4" width="8" height="16" rx="2" /></>,
    resources: <><path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M4 7V6a2 2 0 0 1 2-2h4l2 3" /></>,
    functions: <><path d="M5 6h14M5 12h14M5 18h14" /><circle cx="8" cy="6" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="10" cy="18" r="1.5" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.5 2.5 0 0 1 4.8 1c0 2-2.5 2-2.5 4" /><path d="M12 18h.01" /></>,
    book: <><path d="M6 4h10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2Z" /><path d="M7 8h8M7 12h8M7 16h5" /></>,
    link: <><path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" /><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" /></>,
    lab: <><path d="M9 3h6M10 3v4l-4 7a4 4 0 0 0 3.5 6h5A4 4 0 0 0 18 14l-4-7V3" /><path d="M8 14h8" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    map: <><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
    chart: <><path d="M18 20V10M12 20V4M6 20v-6" /></>,
    satellite: <><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></>,
    droplet: <><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></>,
    thermometer: <><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></>,
    globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  }
  return <svg className="guide-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name] || paths.help}</svg>
}

const ToolGuide: React.FC<{ tool: ToolDef; language: Language }> = ({ tool, language }) => {
  const [expanded, setExpanded] = useState(false)
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)

  const guides: Record<string, { whatKey: string; howKey: string; tipsKey: string }> = {
    'get-map': { whatKey: 'helpGuideGetMapWhat', howKey: 'helpGuideGetMapHow', tipsKey: 'helpGuideGetMapTips' },
    'area-calc': { whatKey: 'helpGuideAreaCalcWhat', howKey: 'helpGuideAreaCalcHow', tipsKey: 'helpGuideAreaCalcTips' },
    'morphological-params': { whatKey: 'helpGuideMorphWhat', howKey: 'helpGuideMorphHow', tipsKey: 'helpGuideMorphTips' },
    'ucp': { whatKey: 'helpGuideUCPWhat', howKey: 'helpGuideUCPHow', tipsKey: 'helpGuideUCPTips' },
    'remote-sensing': { whatKey: 'helpGuideRemoteWhat', howKey: 'helpGuideRemoteHow', tipsKey: 'helpGuideRemoteTips' },
    'spectral-indices': { whatKey: 'helpGuideSpectralWhat', howKey: 'helpGuideSpectralHow', tipsKey: 'helpGuideSpectralTips' },
    'gridded': { whatKey: 'helpGuideGriddedWhat', howKey: 'helpGuideGriddedHow', tipsKey: 'helpGuideGriddedTips' },
    'utility': { whatKey: 'helpGuideUtilityWhat', howKey: 'helpGuideUtilityHow', tipsKey: 'helpGuideUtilityTips' },
    'time-series': { whatKey: 'helpGuideTimeSeriesWhat', howKey: 'helpGuideTimeSeriesHow', tipsKey: 'helpGuideTimeSeriesTips' },
    'thermal-anomaly': { whatKey: 'helpGuideAnomalyWhat', howKey: 'helpGuideAnomalyHow', tipsKey: 'helpGuideAnomalyTips' },
    'uhi-intensity': { whatKey: 'helpGuideCanopyUHIWhat', howKey: 'helpGuideCanopyUHIHow', tipsKey: 'helpGuideCanopyUHITips' },
    'uhi-surface': { whatKey: 'helpGuideSurfaceUHIWhat', howKey: 'helpGuideSurfaceUHIHow', tipsKey: 'helpGuideSurfaceUHITips' },
    'interpolation': { whatKey: 'helpGuideInterpolationWhat', howKey: 'helpGuideInterpolationHow', tipsKey: 'helpGuideInterpolationTips' },
    'ml-interpolation': { whatKey: 'helpGuideMLInterpolationWhat', howKey: 'helpGuideMLInterpolationHow', tipsKey: 'helpGuideMLInterpolationTips' },
    'climate-indices': { whatKey: 'helpGuideDroughtWhat', howKey: 'helpGuideDroughtHow', tipsKey: 'helpGuideDroughtTips' },
    'thermal-comfort': { whatKey: 'helpGuideThermalComfortWhat', howKey: 'helpGuideThermalComfortHow', tipsKey: 'helpGuideThermalComfortTips' },
  }

  const guide = guides[tool.id] || { whatKey: 'helpGuideFallbackWhat', howKey: 'helpGuideFallbackHow', tipsKey: 'helpGuideFallbackTips' }
  const tips = t(guide.tipsKey as any).split('|')

  return (
    <div className={`tool-guide-card ${expanded ? 'expanded' : ''}`}>
      <button className="tool-guide-header" onClick={() => setExpanded(!expanded)}>
        <StudioIcon className="tool-guide-icon" name={tool.icon} />
        <div className="tool-guide-info">
          <strong>{t(tool.labelKey as any)}</strong>
          <span>{t(tool.descKey as any)}</span>
        </div>
        <span className={`tool-guide-chevron ${expanded ? 'open' : ''}`}>⌄</span>
      </button>
      {expanded && (
        <div className="tool-guide-body">
          <div className="tool-guide-section">
            <h4>{t('helpGuideSectionWhat')}</h4>
            <p>{t(guide.whatKey as any)}</p>
          </div>
          <div className="tool-guide-section">
            <h4>{t('helpGuideSectionHow')}</h4>
            <pre>{t(guide.howKey as any)}</pre>
          </div>
          <div className="tool-guide-section">
            <h4>{t('helpGuideSectionTips')}</h4>
            <ul>
              {tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export const HelpCenter: React.FC<HelpCenterProps> = ({ language, onExploreFunctions }) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)
  const [activeTab, setActiveTab] = useState<'about' | 'general' | 'local'>('about')

  const generalTools = GENERAL_TOOLS.filter((tool) => tool.functionIds)
  const localTools = LOCAL_TOOLS.filter((tool) => tool.functionIds)

  return (
    <div className="help-page">
      {/* Navigation tabs */}
      <nav className="help-nav">
        <button className={activeTab === 'about' ? 'active' : ''} onClick={() => setActiveTab('about')}>
          <GuideIcon name="help" /> {t('helpTabAbout')}
        </button>
        <button className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>
          <GuideIcon name="globe" /> {t('helpTabGeneralTutorial')}
        </button>
        <button className={activeTab === 'local' ? 'active' : ''} onClick={() => setActiveTab('local')}>
          <GuideIcon name="chart" /> {t('helpTabLocalTutorial')}
        </button>
      </nav>

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="help-content">
          {/* Creator info */}
          <section className="help-creator">
            <img className="help-creator-avatar" src="/creator-photo.jpg" alt={t('helpCreatorName')} />
            <div className="help-creator-info">
              <h2>{t('appName')}</h2>
              <p className="help-creator-subtitle">{t('appSubtitle')}</p>
              <div className="help-creator-details">
                <p><strong>{t('helpCreator')}:</strong> {t('helpCreatorName')}</p>
                <p><strong>Affiliation:</strong> {t('helpCreatorAffiliation')}</p>
                <p>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:max.anjos@ufjf.br">max.anjos@ufjf.br</a>
                </p>
                <p>
                  <strong>GitHub:</strong>{' '}
                  <a href="https://github.com/ByMaxAnjos" target="_blank" rel="noreferrer">
                    github.com/ByMaxAnjos
                  </a>
                </p>
              </div>
            </div>
            <img className="help-creator-logo" src="/ufjf-logo.png" alt="UFJF" />
          </section>

          {/* Citation */}
          <section className="help-section">
            <div className="help-section-heading">
              <GuideIcon name="book" />
              <div>
                <h3>{t('helpCitationTitle')}</h3>
                <p>{t('helpCitationText')}</p>
              </div>
            </div>
            <div className="help-citation-card">
              <p className="help-citation-text">
                Anjos, M. et al. (2025). LCZ4py: A Python package for Local Climate Zone analysis.
                <em> Scientific Reports</em>.
              </p>
              <a className="help-citation-link" href="https://www.nature.com/articles/s41598-025-92000-0" target="_blank" rel="noreferrer">
                https://www.nature.com/articles/s41598-025-92000-0
              </a>
              <div className="help-citation-bibtex">
                <code>{`@article{anjos2025lcz4py,\n  title={LCZ4py: A Python package for Local Climate Zone analysis},\n  author={Anjos, Max and others},\n  journal={Scientific Reports},\n  year={2025},\n  doi={10.1038/s41598-025-92000-0}\n}`}</code>
              </div>
            </div>
          </section>

          {/* LCZ4py Package */}
          <section className="help-section">
            <div className="help-section-heading">
              <GuideIcon name="lab" />
              <div>
                <h3>{t('helpLCZ4pyTitle')}</h3>
                <p>{t('helpLCZ4pyDescription')}</p>
              </div>
            </div>
            <a className="help-highlight-link" href="https://github.com/ByMaxAnjos/LCZ4py" target="_blank" rel="noreferrer">
              <GuideIcon name="link" />
              <span>github.com/ByMaxAnjos/LCZ4py</span>
              <small>{t('helpLCZ4pyLink')}</small>
            </a>
            <div className="help-package-features">
              <div className="help-feature"><GuideIcon name="map" /><div><strong>{t('helpFeatureMaps')}</strong><p>{t('helpFeatureMapsDesc')}</p></div></div>
              <div className="help-feature"><GuideIcon name="chart" /><div><strong>{t('helpFeatureAnalysis')}</strong><p>{t('helpFeatureAnalysisDesc')}</p></div></div>
              <div className="help-feature"><GuideIcon name="satellite" /><div><strong>{t('helpFeatureRemoteSensing')}</strong><p>{t('helpFeatureRemoteSensingDesc')}</p></div></div>
              <div className="help-feature"><GuideIcon name="droplet" /><div><strong>{t('helpFeatureClimate')}</strong><p>{t('helpFeatureClimateDesc')}</p></div></div>
              <div className="help-feature"><GuideIcon name="thermometer" /><div><strong>{t('helpFeatureUHI')}</strong><p>{t('helpFeatureUHIDesc')}</p></div></div>
              <div className="help-feature"><GuideIcon name="brain" /><div><strong>{t('helpFeatureInterpolation')}</strong><p>{t('helpFeatureInterpolationDesc')}</p></div></div>
            </div>
          </section>

          {/* LCZ Framework */}
          <section className="help-section">
            <div className="help-section-heading">
              <GuideIcon name="book" />
              <div>
                <h3>{t('helpLCZFrameworkTitle')}</h3>
                <p>{t('helpLCZFrameworkDesc')}</p>
              </div>
            </div>
            <a className="help-highlight-link" href="https://www.ingentaconnect.com/contentone/ams/bams/2012/00000093/00000007/art00001" target="_blank" rel="noreferrer">
              <GuideIcon name="link" />
              <span>Stewart & Oke (2012) - BAMS</span>
              <small>Original LCZ framework paper</small>
            </a>
          </section>

          {/* Getting Started */}
          <section className="help-section">
            <div className="help-section-heading">
              <GuideIcon name="workspace" />
              <div>
                <h3>{t('helpGettingStartedTitle')}</h3>
                <p>{t('helpGettingStartedDesc')}</p>
              </div>
            </div>
            <div className="help-start-list">
              <div className="help-start-line"><span className="help-step-number">1</span><div><strong>{t('helpStep1Title')}</strong><p>{t('helpStep1Desc')}</p></div></div>
              <div className="help-start-line"><span className="help-step-number">2</span><div><strong>{t('helpStep2Title')}</strong><p>{t('helpStep2Desc')}</p></div></div>
              <div className="help-start-line"><span className="help-step-number">3</span><div><strong>{t('helpStep3Title')}</strong><p>{t('helpStep3Desc')}</p></div></div>
            </div>
          </section>

          <div className="help-page-actions">
            <button className="primary" onClick={() => setActiveTab('general')}>{t('helpBtnGeneralTutorial')}</button>
            <button onClick={() => setActiveTab('local')}>{t('helpBtnLocalTutorial')}</button>
          </div>
        </div>
      )}

      {/* General Tutorial Tab */}
      {activeTab === 'general' && (
        <div className="help-content">
          <div className="help-tutorial-header"><h2>{t('helpGeneralTitle')}</h2><p>{t('helpGeneralDesc')}</p></div>
          <div className="help-workflow-steps">
            <div className="help-workflow-step"><span className="help-step-number">1</span><div><strong>{t('helpGeneralWorkflow1Title')}</strong><p>{t('helpGeneralWorkflow1Desc')}</p></div></div>
            <div className="help-workflow-step"><span className="help-step-number">2</span><div><strong>{t('helpGeneralWorkflow2Title')}</strong><p>{t('helpGeneralWorkflow2Desc')}</p></div></div>
            <div className="help-workflow-step"><span className="help-step-number">3</span><div><strong>{t('helpGeneralWorkflow3Title')}</strong><p>{t('helpGeneralWorkflow3Desc')}</p></div></div>
          </div>
          <div className="help-tool-guides">
            {generalTools.map((tool) => <ToolGuide key={tool.id} tool={tool} language={language} />)}
          </div>
          <div className="help-page-actions">
            <button onClick={() => onExploreFunctions('general')}>{t('helpBtnOpenGeneral')}</button>
            <button onClick={() => setActiveTab('local')}>{t('helpBtnLocalTutorial')}</button>
          </div>
        </div>
      )}

      {/* Local Tutorial Tab */}
      {activeTab === 'local' && (
        <div className="help-content">
          <div className="help-tutorial-header"><h2>{t('helpLocalTitle')}</h2><p>{t('helpLocalDesc')}</p></div>
          <div className="help-workflow-steps">
            <div className="help-workflow-step"><span className="help-step-number">1</span><div><strong>{t('helpLocalWorkflow1Title')}</strong><p>{t('helpLocalWorkflow1Desc')}</p></div></div>
            <div className="help-workflow-step"><span className="help-step-number">2</span><div><strong>{t('helpLocalWorkflow2Title')}</strong><p>{t('helpLocalWorkflow2Desc')}</p></div></div>
            <div className="help-workflow-step"><span className="help-step-number">3</span><div><strong>{t('helpLocalWorkflow3Title')}</strong><p>{t('helpLocalWorkflow3Desc')}</p></div></div>
          </div>
          <div className="help-tool-guides">
            {localTools.map((tool) => <ToolGuide key={tool.id} tool={tool} language={language} />)}
          </div>
          <div className="help-page-actions">
            <button onClick={() => onExploreFunctions('local')}>{t('helpBtnOpenLocal')}</button>
            <button onClick={() => setActiveTab('general')}>{t('helpBtnGeneralTutorial')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
