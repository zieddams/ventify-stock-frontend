import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'

const SECTION_ORDER = [
  { id: 'overview', icon: 'fa-solid fa-compass' },
  { id: 'operations', icon: 'fa-solid fa-warehouse' },
  { id: 'roles', icon: 'fa-solid fa-user-shield' },
  { id: 'terrain', icon: 'fa-solid fa-route' },
  { id: 'finance', icon: 'fa-solid fa-file-invoice-dollar' },
  { id: 'support', icon: 'fa-solid fa-life-ring' },
  { id: 'faq', icon: 'fa-solid fa-circle-question' },
]

const ROLE_TONES = {
  admin: '#0d9488',
  developer: '#8b5cf6',
  comptable: '#2563eb',
  rep: '#f97316',
}

const QUICK_LINKS = {
  invoices: { to: '/invoices', icon: 'fa-solid fa-file-invoice' },
  customers: { to: '/customers', icon: 'fa-solid fa-users' },
  products: { to: '/products', icon: 'fa-solid fa-box-open' },
  notifications: { to: '/notifications-center', icon: 'fa-solid fa-bell' },
  routeSessions: { to: '/routes', icon: 'fa-solid fa-route' },
  camions: { to: '/camions', icon: 'fa-solid fa-truck-fast' },
  config: { to: '/config', icon: 'fa-solid fa-sliders' },
  dataTools: { to: '/data-tools', icon: 'fa-solid fa-file-arrow-up' },
  credit: { to: '/credit', icon: 'fa-solid fa-credit-card' },
  expenses: { to: '/expenses', icon: 'fa-solid fa-receipt' },
  developerConsole: { to: '/developer-tools', icon: 'fa-solid fa-code' },
}

function QuickLinkCard({ title, description, to, icon, cta }) {
  return (
    <Link to={to} className="card card-hover block" style={{ textDecoration: 'none' }}>
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}
        >
          <i className={icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-base-color">{title}</div>
          <div className="text-sm text-secondary-color mt-1">{description}</div>
          <div className="text-xs font-semibold mt-3" style={{ color: '#0d9488' }}>
            {cta} <i className="fa-solid fa-arrow-right ml-1" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function DocAsideLink({ section }) {
  return (
    <a
      href={`#${section.id}`}
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors hover:bg-surface-2"
      style={{ color: 'var(--secondary)' }}
    >
      <span
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(13,148,136,0.10)', color: '#0d9488' }}
      >
        <i className={`${section.icon} text-xs`} />
      </span>
      <span className="font-medium">{section.label}</span>
    </a>
  )
}

function SectionShell({ id, eyebrow, title, description, children }) {
  return (
    <section id={id} className="card scroll-mt-24">
      <div className="max-w-3xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-color">{eyebrow}</div>
        <h2 className="text-xl font-bold text-base-color mt-2">{title}</h2>
        <p className="text-sm text-secondary-color mt-2">{description}</p>
      </div>
      <div className="mt-6">
        {children}
      </div>
    </section>
  )
}

function RoleCard({ title, description, bullets, tone = '#0d9488' }) {
  return (
    <div
      className="rounded-[24px] px-5 py-5 h-full"
      style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
    >
      <div className="text-sm font-semibold text-base-color">{title}</div>
      <div className="text-sm text-secondary-color mt-2">{description}</div>
      <div className="space-y-2 mt-4">
        {bullets.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm text-secondary-color">
            <i className="fa-solid fa-check mt-1 text-xs" style={{ color: tone }} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InfoBullet({ children, color = '#0d9488', icon = 'fa-solid fa-circle-dot' }) {
  return (
    <div className="flex items-start gap-2 text-sm text-secondary-color">
      <i className={`${icon} mt-1 text-[10px]`} style={{ color }} />
      <span>{children}</span>
    </div>
  )
}

export default function HelpCenterIndex() {
  const { isAdmin, isFinance, isDeveloper } = useAuth()
  const { raw, t } = useI18n()
  const copy = raw('helpCenter') ?? {}

  const admin = isAdmin()
  const finance = isFinance()
  const developer = isDeveloper()

  const sectionIndex = useMemo(
    () => SECTION_ORDER.map((item) => ({
      ...item,
      label: copy.sections?.[item.id]?.label ?? item.id,
    })),
    [copy.sections],
  )

  const quickLinks = useMemo(() => {
    const entries = ['invoices', 'customers', 'products', 'notifications']

    if (admin) {
      entries.push('routeSessions', 'camions', 'config', 'dataTools')
    }
    if (finance) {
      entries.push('credit', 'expenses')
    }
    if (developer) {
      entries.push('developerConsole')
    }

    return entries.map((key) => ({
      ...QUICK_LINKS[key],
      title: copy.quickLinks?.[key]?.title ?? key,
      description: copy.quickLinks?.[key]?.description ?? '',
      cta: copy.quickLinksCta ?? t('common.view'),
    }))
  }, [admin, copy.quickLinks, copy.quickLinksCta, developer, finance, t])

  const roleCards = copy.sections?.roles?.cards ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        action={(
          <div className="flex flex-wrap gap-2">
            <Link to="/notifications-center" className="btn-secondary text-xs">
              <i className="fa-solid fa-bell" /> {copy.actions?.notifications}
            </Link>
            <Link to="/bug-reports" className="btn-primary text-xs">
              <i className="fa-solid fa-bug" /> {copy.actions?.reportBug}
            </Link>
          </div>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)] gap-6 items-start">
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="card">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-color mb-3">{copy.summaryTitle}</div>
            <div className="space-y-1">
              {sectionIndex.map((section) => (
                <DocAsideLink key={section.id} section={section} />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="text-sm font-semibold text-base-color">{copy.usefulActionsTitle}</div>
            <div className="text-sm text-secondary-color mt-2">
              {copy.usefulActionsDescription}
            </div>
            <div className="space-y-2 mt-4">
              {admin && (
                <>
                  <Link to="/config" className="btn-secondary text-xs w-full justify-center">
                    <i className="fa-solid fa-sliders" /> {copy.usefulLinks?.configHub}
                  </Link>
                  <Link to="/data-tools" className="btn-secondary text-xs w-full justify-center">
                    <i className="fa-solid fa-file-arrow-up" /> {copy.usefulLinks?.dataTools}
                  </Link>
                </>
              )}
              {developer && (
                <Link to="/developer-tools" className="btn-secondary text-xs w-full justify-center">
                  <i className="fa-solid fa-code" /> {copy.usefulLinks?.developerConsole}
                </Link>
              )}
              {!admin && finance && (
                <Link to="/expenses" className="btn-secondary text-xs w-full justify-center">
                  <i className="fa-solid fa-receipt" /> {copy.usefulLinks?.expenses}
                </Link>
              )}
              {!admin && !finance && (
                <Link to="/customers" className="btn-secondary text-xs w-full justify-center">
                  <i className="fa-solid fa-users" /> {copy.usefulLinks?.myCustomers}
                </Link>
              )}
              <Link to="/bug-reports" className="btn-secondary text-xs w-full justify-center">
                <i className="fa-solid fa-bug" /> {copy.usefulLinks?.support}
              </Link>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <QuickLinkCard key={`${link.title}-${link.to}`} {...link} />
            ))}
          </div>

          <SectionShell
            id="overview"
            eyebrow={copy.sections?.overview?.eyebrow}
            title={copy.sections?.overview?.title}
            description={copy.sections?.overview?.description}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {(copy.workflowSteps ?? []).map((step) => (
                <div
                  key={step.title}
                  className="rounded-[24px] px-4 py-4"
                  style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                >
                  <div className="text-sm font-semibold text-base-color">{step.title}</div>
                  <div className="text-sm text-secondary-color mt-2">{step.description}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-4 mt-5">
              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(13,148,136,0.06)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.14)' }}
              >
                <div className="text-sm font-semibold text-base-color">{copy.sections?.overview?.driverTitle}</div>
                <div className="space-y-3 mt-3">
                  {(copy.sections?.overview?.driverBullets ?? []).map((item) => (
                    <InfoBullet key={item}>{item}</InfoBullet>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(59,130,246,0.06)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.12)' }}
              >
                <div className="text-sm font-semibold text-base-color">{copy.sections?.overview?.phaseTitle}</div>
                <div className="space-y-3 mt-3 text-sm text-secondary-color">
                  {(copy.sections?.overview?.phaseParagraphs ?? []).map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="operations"
            eyebrow={copy.sections?.operations?.eyebrow}
            title={copy.sections?.operations?.title}
            description={copy.sections?.operations?.description}
          >
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
              >
                <div className="text-sm font-semibold text-base-color">{copy.sections?.operations?.hubTitle}</div>
                <div className="space-y-2 mt-4">
                  {(copy.sections?.operations?.hubBullets ?? []).map((item) => (
                    <InfoBullet key={item}>{item}</InfoBullet>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(245,158,11,0.08)', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.14)' }}
              >
                <div className="text-sm font-semibold text-base-color">{copy.sections?.operations?.rulesTitle}</div>
                <div className="space-y-2 mt-4">
                  {(copy.sections?.operations?.rulesBullets ?? []).map((item) => (
                    <InfoBullet key={item} color="#f59e0b" icon="fa-solid fa-triangle-exclamation">{item}</InfoBullet>
                  ))}
                </div>
                {admin && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link to="/config" className="btn-secondary text-xs">
                      <i className="fa-solid fa-sliders" /> {copy.usefulLinks?.openHub}
                    </Link>
                    <Link to="/data-tools" className="btn-secondary text-xs">
                      <i className="fa-solid fa-file-arrow-up" /> {copy.usefulLinks?.dataTools}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="roles"
            eyebrow={copy.sections?.roles?.eyebrow}
            title={copy.sections?.roles?.title}
            description={copy.sections?.roles?.description}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {roleCards.map((card) => (
                <RoleCard
                  key={card.id}
                  title={card.title}
                  description={card.description}
                  bullets={card.bullets}
                  tone={ROLE_TONES[card.id] ?? '#0d9488'}
                />
              ))}
            </div>
          </SectionShell>

          <SectionShell
            id="terrain"
            eyebrow={copy.sections?.terrain?.eyebrow}
            title={copy.sections?.terrain?.title}
            description={copy.sections?.terrain?.description}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
              >
                <div className="text-sm font-semibold text-base-color">{copy.sections?.terrain?.contentTitle}</div>
                <div className="space-y-2 mt-4">
                  {(copy.sections?.terrain?.contentBullets ?? []).map((item) => (
                    <InfoBullet key={item}>{item}</InfoBullet>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(14,165,233,0.06)', boxShadow: 'inset 0 0 0 1px rgba(14,165,233,0.12)' }}
              >
                <div className="text-sm font-semibold text-base-color">{copy.sections?.terrain?.syncTitle}</div>
                <div className="space-y-3 mt-4 text-sm text-secondary-color">
                  {(copy.sections?.terrain?.syncParagraphs ?? []).map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
                {admin && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link to="/routes" className="btn-secondary text-xs">
                      <i className="fa-solid fa-route" /> {copy.usefulLinks?.viewSessions}
                    </Link>
                    <Link to="/camions" className="btn-secondary text-xs">
                      <i className="fa-solid fa-truck-fast" /> {copy.usefulLinks?.viewCamions}
                    </Link>
                    <Link to="/depot" className="btn-secondary text-xs">
                      <i className="fa-solid fa-warehouse" /> {copy.usefulLinks?.viewDepotStock}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="finance"
            eyebrow={copy.sections?.finance?.eyebrow}
            title={copy.sections?.finance?.title}
            description={copy.sections?.finance?.description}
          >
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
              >
                <div className="text-sm font-semibold text-base-color">{copy.sections?.finance?.practicesTitle}</div>
                <div className="space-y-2 mt-4">
                  {(copy.sections?.finance?.practicesBullets ?? []).map((item) => (
                    <InfoBullet key={item}>{item}</InfoBullet>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(245,158,11,0.08)', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.14)' }}
              >
                <div className="text-sm font-semibold text-base-color">{copy.sections?.finance?.reviewTitle}</div>
                <div className="space-y-2 mt-4">
                  {(copy.sections?.finance?.reviewBullets ?? []).map((item) => (
                    <InfoBullet key={item} color="#f59e0b" icon="fa-solid fa-sack-dollar">{item}</InfoBullet>
                  ))}
                </div>
                {finance && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link to="/credit" className="btn-secondary text-xs">
                      <i className="fa-solid fa-credit-card" /> {copy.quickLinks?.credit?.title}
                    </Link>
                    <Link to="/expenses" className="btn-secondary text-xs">
                      <i className="fa-solid fa-receipt" /> {copy.quickLinks?.expenses?.title}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="support"
            eyebrow={copy.sections?.support?.eyebrow}
            title={copy.sections?.support?.title}
            description={copy.sections?.support?.description}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
              >
                <div className="text-sm font-semibold text-base-color">{copy.sections?.support?.supportTitle}</div>
                <div className="space-y-3 mt-4 text-sm text-secondary-color">
                  {(copy.sections?.support?.supportParagraphs ?? []).map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Link to="/bug-reports" className="btn-secondary text-xs">
                    <i className="fa-solid fa-bug" /> {copy.usefulLinks?.openSupport}
                  </Link>
                  <Link to="/notifications-center" className="btn-secondary text-xs">
                    <i className="fa-solid fa-bell" /> {copy.usefulLinks?.reviewNotifications}
                  </Link>
                </div>
              </div>

              <div
                className="rounded-[24px] px-5 py-5"
                style={{ background: 'rgba(139,92,246,0.06)', boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.12)' }}
              >
                <div className="text-sm font-semibold text-base-color">{copy.sections?.support?.tasksTitle}</div>
                <div className="space-y-3 mt-4 text-sm text-secondary-color">
                  {(copy.sections?.support?.tasksParagraphs ?? []).map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {admin && (
                    <Link to="/config/background-tasks" className="btn-secondary text-xs">
                      <i className="fa-solid fa-clock-rotate-left" /> {copy.usefulLinks?.backgroundTasks}
                    </Link>
                  )}
                  {developer && (
                    <Link to="/developer-tools" className="btn-secondary text-xs">
                      <i className="fa-solid fa-code" /> {copy.usefulLinks?.developerConsole}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="faq"
            eyebrow={copy.sections?.faq?.eyebrow}
            title={copy.sections?.faq?.title}
            description={copy.sections?.faq?.description}
          >
            <div className="space-y-3">
              {(copy.sections?.faq?.items ?? []).map((item) => (
                <div
                  key={item.question}
                  className="rounded-[24px] px-5 py-5"
                  style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                >
                  <div className="text-sm font-semibold text-base-color">{item.question}</div>
                  <div className="text-sm text-secondary-color mt-2">{item.answer}</div>
                </div>
              ))}
            </div>
          </SectionShell>
        </div>
      </div>
    </div>
  )
}
