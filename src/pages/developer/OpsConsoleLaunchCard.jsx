import { useI18n } from '../../contexts/I18nContext'

const OPS_CONSOLE_URL = 'https://ops.irtiwaa.ziedtech.com'
const OPS_HEALTH_URL = 'https://ops.irtiwaa.ziedtech.com/api/health'
const OPS_WORKFLOW_URL = 'https://github.com/zieddams/ventify-stock-frontend/actions/workflows/manual-deploy-ops-console.yml'

function LaunchLink({ label, value, href }) {
  return (
    <div
      className="rounded-2xl px-4 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
      style={{ background: '#ffffff80', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.12)' }}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-base-color">{label}</div>
        <div className="text-xs text-secondary-color break-all mt-1">{value}</div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="btn-secondary text-xs justify-center md:justify-start flex-shrink-0"
      >
        <i className="fa-solid fa-arrow-up-right-from-square" /> {label}
      </a>
    </div>
  )
}

export default function OpsConsoleLaunchCard() {
  const { t } = useI18n()

  return (
    <div className="card">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-semibold text-base-color">{t('developerToolsPage.opsConsole.title')}</h2>
          <p className="text-xs text-muted-color mt-1">{t('developerToolsPage.opsConsole.description')}</p>
        </div>

        <a href={OPS_CONSOLE_URL} target="_blank" rel="noreferrer" className="btn-primary text-xs">
          <i className="fa-solid fa-tower-broadcast" /> {t('developerToolsPage.opsConsole.open')}
        </a>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_420px] gap-6">
        <div className="rounded-3xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
          <div className="text-xs text-muted-color uppercase tracking-[0.18em] mb-3">{t('developerToolsPage.opsConsole.note')}</div>
          <div className="text-sm text-secondary-color leading-6">
            {t('developerToolsPage.opsConsole.description')}
          </div>
        </div>

        <div className="space-y-3">
          <LaunchLink
            label={t('developerToolsPage.opsConsole.open')}
            value={OPS_CONSOLE_URL}
            href={OPS_CONSOLE_URL}
          />
          <LaunchLink
            label={t('developerToolsPage.opsConsole.health')}
            value={OPS_HEALTH_URL}
            href={OPS_HEALTH_URL}
          />
          <LaunchLink
            label={t('developerToolsPage.opsConsole.workflow')}
            value={OPS_WORKFLOW_URL}
            href={OPS_WORKFLOW_URL}
          />
        </div>
      </div>
    </div>
  )
}
