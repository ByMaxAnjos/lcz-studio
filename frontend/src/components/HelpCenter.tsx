import React, { useMemo } from 'react'
import { getTranslation } from '../i18n/translations'
import './HelpCenter.css'

type Language = 'en' | 'pt' | 'es' | 'zh'
type Workspace = 'general' | 'local'

interface HelpCenterProps {
  language: Language
  workspace: Workspace
  onExploreFunctions: (workspace: Workspace) => void
}

const GuideIcon: React.FC<{ name: 'workspace' | 'resources' | 'functions' | 'help' | 'book' | 'link' | 'lab' }> = ({ name }) => {
  const paths = {
    workspace: <><rect x="3" y="4" width="8" height="16" rx="2" /><rect x="13" y="4" width="8" height="16" rx="2" /></>,
    resources: <><path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M4 7V6a2 2 0 0 1 2-2h4l2 3" /></>,
    functions: <><path d="M5 6h14M5 12h14M5 18h14" /><circle cx="8" cy="6" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="10" cy="18" r="1.5" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.5 2.5 0 0 1 4.8 1c0 2-2.5 2-2.5 4" /><path d="M12 18h.01" /></>,
    book: <><path d="M6 4h10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2Z" /><path d="M7 8h8M7 12h8M7 16h5" /></>,
    link: <><path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" /><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" /></>,
    lab: <><path d="M9 3h6M10 3v4l-4 7a4 4 0 0 0 3.5 6h5A4 4 0 0 0 18 14l-4-7V3" /><path d="M8 14h8" /></>,
  }
  return <svg className="guide-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

export const HelpCenter: React.FC<HelpCenterProps> = ({ language, workspace, onExploreFunctions }) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key)

  const notebookGroups = useMemo(() => ([
    { title: t('helpNotebookGeneralTitle'), description: t('helpNotebookGeneralDescription') },
    { title: t('helpNotebookLocalTitle'), description: t('helpNotebookLocalDescription') },
  ]), [language])

  return (
    <div className="help-page">
      <nav className="help-nav" aria-label={t('helpNavLabel')}>
        <a href="#help-introduction">{t('helpIntroNav')}</a>
        <a href="#help-getting-started">{t('helpStartNav')}</a>
        <a href="#help-tutorials">{t('helpTutorialsNav')}</a>
        <a href="#help-references">{t('helpReferencesNav')}</a>
      </nav>

      <header className="help-page-header">
        <div className="help-dialog-mark"><GuideIcon name="help" /></div>
        <div>
          <span className="help-dialog-eyebrow">{t('appName')}</span>
          <h2 id="help-center-title">{t('helpCenterTitle')}</h2>
          <p>{t('helpCenterDescription')}</p>
        </div>
      </header>

      <section id="help-introduction" className="help-intro" aria-label={t('quickStart')}>
        <div className="help-intro-item">
          <GuideIcon name="workspace" />
          <div>
            <h3>{t('helpStepWorkspace')}</h3>
            <p>{t('helpStepWorkspaceDescription')}</p>
          </div>
        </div>
        <div className="help-intro-item">
          <GuideIcon name="resources" />
          <div>
            <h3>{t('helpStepResources')}</h3>
            <p>{t('helpStepResourcesDescription')}</p>
          </div>
        </div>
        <div className="help-intro-item">
          <GuideIcon name="functions" />
          <div>
            <h3>{t('helpStepFunctions')}</h3>
            <p>{t('helpStepFunctionsDescription')}</p>
          </div>
        </div>
      </section>

      <section id="help-references" className="help-section">
        <div className="help-section-heading">
          <GuideIcon name="book" />
          <div>
            <h3>{t('helpReferencesTitle')}</h3>
            <p>{t('helpReferencesDescription')}</p>
          </div>
        </div>
        <div className="help-reference-list">
          <div className="help-inline-reference">
            <GuideIcon name="lab" />
            <p><strong>{t('helpReferenceLcz4pyTitle')}</strong> {t('helpReferenceLcz4pyDescription')} <a href="https://github.com/ByMaxAnjos/LCZ4py" target="_blank" rel="noreferrer">{t('helpOpenRepository')}</a></p>
          </div>
          <div className="help-inline-reference">
            <GuideIcon name="link" />
            <p><strong>{t('helpReferencePaperTitle')}</strong> {t('helpReferencePaperDescription')} <a href="https://www.nature.com/articles/s41598-025-92000-0" target="_blank" rel="noreferrer">{t('helpOpenPaper')}</a></p>
          </div>
          <div className="help-inline-reference">
            <GuideIcon name="book" />
            <p><strong>{t('helpReferenceSchemeTitle')}</strong> {t('helpReferenceSchemeDescription')} <a href="https://www.ingentaconnect.com/contentone/ams/bams/2012/00000093/00000007/art00001" target="_blank" rel="noreferrer">{t('helpOpenReference')}</a></p>
          </div>
        </div>
      </section>

      <section id="help-tutorials" className="help-section">
        <div className="help-section-heading">
          <GuideIcon name="functions" />
          <div>
            <h3>{t('helpTutorialsTitle')}</h3>
            <p>{t('helpTutorialsDescription')}</p>
          </div>
        </div>
        <a className="help-highlight-link" href="https://github.com/ByMaxAnjos/LCZ4py#tutorials" target="_blank" rel="noreferrer">
          <GuideIcon name="book" />
          <span>LCZ4py tutorials</span>
          <small>{t('helpOpenTutorials')}</small>
        </a>
        <div className="help-tutorial-list">
          {notebookGroups.map((group) => (
            <div key={group.title} className="help-tutorial-line">
              <strong>{group.title}</strong>
              <p>{group.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="help-getting-started" className="help-section help-start-section">
        <div className="help-section-heading">
          <GuideIcon name="workspace" />
          <div>
            <h3>{t('helpGettingStartedTitle')}</h3>
            <p>{t('helpGettingStartedDescription')}</p>
          </div>
        </div>
        <div className="help-start-list">
          <div className="help-start-line">
            <strong>{t('helpStartStep1')}</strong>
            <p>{t('helpStartStep1Description')}</p>
          </div>
          <div className="help-start-line">
            <strong>{t('helpStartStep2')}</strong>
            <p>{t('helpStartStep2Description')}</p>
          </div>
          <div className="help-start-line">
            <strong>{t('helpStartStep3')}</strong>
            <p>{t('helpStartStep3Description')}</p>
          </div>
        </div>
      </section>

      <div className="help-tip">
        <GuideIcon name="help" />
        <p><strong>{t('helpContextTitle')}</strong> {t('helpContextDescription')}</p>
      </div>

      <footer className="help-page-actions">
        <button className={workspace === 'general' ? 'primary' : ''} onClick={() => onExploreFunctions('general')}>
          {t('exploreGeneralFunctions')}
        </button>
        <button className={workspace === 'local' ? 'primary' : ''} onClick={() => onExploreFunctions('local')}>
          {t('exploreLocalFunctions')}
        </button>
      </footer>
    </div>
  )
}
