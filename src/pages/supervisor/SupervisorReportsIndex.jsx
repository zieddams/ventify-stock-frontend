import { useState } from 'react'
import DepotScopeControls from '../../components/DepotScopeControls'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useDepots } from '../../hooks/useDepots'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { downloadDocumentPdf, printGeneratedDocument } from '../../utils/documents'
import { formatCurrency, formatDate } from '../../utils/format'

function toYmd(date) {
  return date.toISOString().slice(0, 10)
}

function defaultMonthRange() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return { from: toYmd(start), to: toYmd(end) }
}

export default function SupervisorReportsIndex() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { layouts: documentLayouts, documentSettings } = useDocumentLayouts()
  const {
    depots,
    loading: depotsLoading,
    selectedValue,
    setSelectedValue,
    canSelectAll,
    scopeParams,
  } = useDepots({
    allowAll: true,
    defaultToAll: true,
    scopeToCompanyBrowse: true,
    storageKey: 'app-depot-scope',
  })

  const initialRange = defaultMonthRange()
  const [dateFrom, setDateFrom] = useState(initialRange.from)
  const [dateTo, setDateTo] = useState(initialRange.to)
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')

  const buildReportRecord = async () => {
    const [insightsRes, agingRes, stockRes] = await Promise.all([
      api.get('/reports/profit-insights', { params: { ...scopeParams, date_from: dateFrom, date_to: dateTo, period: 'custom' } }),
      api.get('/reports/aging', { params: scopeParams }),
      api.get('/reports/stock-overview', { params: scopeParams }),
    ])

    const insights = insightsRes.data
    const stock = stockRes.data
    const topDebtors = [...(agingRes.data?.customers ?? [])]
      .sort((left, right) => Number(right.total_due ?? 0) - Number(left.total_due ?? 0))
      .slice(0, 15)
      .map((row) => ({ customer_name: row.customer_name, total_due: row.total_due }))

    return {
      period_label: `${formatDate(dateFrom)} - ${formatDate(dateTo)}`,
      revenue: insights?.totals?.revenue ?? 0,
      profit: insights?.totals?.profit ?? 0,
      expenses: 0,
      credit_outstanding: (agingRes.data?.customers ?? []).reduce((sum, row) => sum + Number(row.total_due ?? 0), 0),
      stock_value: (stock?.by_depot ?? []).reduce((sum, row) => sum + Number(row.total_value ?? 0), 0),
      low_stock_count: (stock?.by_depot ?? []).reduce((sum, row) => sum + Number(row.low_stock_count ?? 0), 0),
      by_channel: (insights?.by_channel ?? []).map((row) => ({ label: t(`supervisorDashboard.channels.${row.sale_channel}`), revenue: row.revenue })),
      by_product: insights?.by_product ?? [],
      by_rep: insights?.by_rep ?? [],
      by_depot: stock?.by_depot ?? [],
      top_debtors: topDebtors,
    }
  }

  const handleGenerate = async (action) => {
    setBusyAction(action)
    setError('')

    try {
      const record = await buildReportRecord()
      const options = {
        documentKey: 'supervisor_report_item',
        records: [record],
        documentLayouts,
        documentSettings,
        title: t('supervisorReportsPage.documentTitle', { period: record.period_label }),
        subtitle: user?.company?.name,
        user,
      }

      if (action === 'pdf') {
        await downloadDocumentPdf(options)
      } else {
        printGeneratedDocument(options)
      }
    } catch (err) {
      setError(err?.message === 'print_window_blocked' ? t('documents.printWindowBlocked') : t('supervisorReportsPage.generateFailed'))
    } finally {
      setBusyAction('')
    }
  }

  return (
    <div>
      <PageHeader
        title={t('supervisorReportsPage.title')}
        subtitle={t('supervisorReportsPage.subtitle')}
      />

      <div className="card max-w-2xl">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-base-color mb-2">{t('supervisorReportsPage.periodLabel')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} max={dateTo || undefined} />
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} min={dateFrom || undefined} />
            </div>
          </div>

          {canSelectAll && (
            <div>
              <div className="text-sm font-semibold text-base-color mb-2">{t('supervisorReportsPage.depotLabel')}</div>
              <DepotScopeControls
                depots={depots}
                loading={depotsLoading}
                selectedValue={selectedValue}
                onChange={setSelectedValue}
                allowAll
                canSelectAll={canSelectAll}
                allLabel={t('supervisorReportsPage.allDepots')}
              />
            </div>
          )}

          <p className="text-xs text-muted-color">{t('supervisorReportsPage.hint')}</p>

          {error && <div className="text-xs text-red-500">{error}</div>}

          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={() => handleGenerate('pdf')} disabled={busyAction !== ''} className="btn-primary">
              {busyAction === 'pdf'
                ? <><i className="fa-solid fa-spinner fa-spin" /> {t('documents.generatingPdf')}</>
                : <><i className="fa-solid fa-file-pdf" /> {t('supervisorReportsPage.downloadPdf')}</>}
            </button>
            <button onClick={() => handleGenerate('print')} disabled={busyAction !== ''} className="btn-secondary">
              {busyAction === 'print'
                ? <><i className="fa-solid fa-spinner fa-spin" /> {t('documents.preparing')}</>
                : <><i className="fa-solid fa-print" /> {t('documents.print')}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
