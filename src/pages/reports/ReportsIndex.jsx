import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DepotScopeControls from '../../components/DepotScopeControls'
import PageExportActions from '../../components/PageExportActions'
import { PageLoader } from '../../components/Spinner'
import { useDepots } from '../../hooks/useDepots'
import { useTheme } from '../../contexts/ThemeContext'
import api from '../../services/api'

function fmt(value) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(value ?? 0)
}

function useChartTheme() {
  const { isDark } = useTheme()

  return {
    grid: isDark ? '#334155' : '#e2e8f0',
    axis: isDark ? '#64748b' : '#94a3b8',
    tooltip: isDark
      ? { background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#f8fafc' }
      : { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, color: '#0f172a' },
  }
}

function KpiCard({ label, value, icon, color, sub }) {
  return (
    <div className="card py-3 px-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}1a` }}>
        <i className={`${icon} text-sm`} style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-muted-color">{label}</div>
        <div className="text-sm font-bold text-base-color">{value}</div>
        {sub && <div className="text-xs text-muted-color mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function OverviewTab({ stats }) {
  const theme = useChartTheme()
  const chartData = (stats?.revenue_by_day ?? []).map((day) => ({
    date: day.date?.slice(5),
    revenue: Number(day.revenue ?? 0),
    profit: Number(day.profit ?? 0),
  }))
  const topProducts = stats?.top_products ?? []

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="CA aujourd'hui" value={`${fmt(stats?.today_revenue)} TND`} icon="fa-solid fa-arrow-trend-up" color="#0d9488" />
        <KpiCard label="Benefice (mois)" value={`${fmt(stats?.month_profit)} TND`} icon="fa-solid fa-coins" color="#10b981" />
        <KpiCard label="Impayes totaux" value={`${fmt(stats?.unpaid_total)} TND`} icon="fa-solid fa-triangle-exclamation" color="#dc2626" />
        <KpiCard label="Depenses (mois)" value={`${fmt(stats?.month_expenses)} TND`} icon="fa-solid fa-receipt" color="#f59e0b" />
      </div>

      {chartData.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-base-color mb-4">CA et bénéfice - 30 derniers jours</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
              <XAxis dataKey="date" stroke={theme.axis} tick={{ fontSize: 10, fill: theme.axis }} />
              <YAxis stroke={theme.axis} tick={{ fontSize: 10, fill: theme.axis }} />
              <Tooltip contentStyle={theme.tooltip} formatter={(value, name) => [`${fmt(value)} TND`, name === 'revenue' ? 'CA' : 'Benefice']} />
              <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name="CA" />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Benefice" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {topProducts.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-3">Top 5 produits (ce mois)</h2>
          <div className="space-y-2">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-base-color truncate">{product.product_name}</div>
                </div>
                <div className="text-sm font-semibold font-mono" style={{ color: '#0d9488' }}>
                  {fmt(product.total_revenue)} TND
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function ProfitTab({ scopeParams }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const theme = useChartTheme()

  useEffect(() => {
    setLoading(true)

    const params = { period, ...scopeParams }

    if (period === 'custom') {
      params.date_from = dateFrom
      params.date_to = dateTo
    }

    api.get('/reports/profit', { params })
      .then((response) => setData(response.data))
      .finally(() => setLoading(false))
  }, [period, dateFrom, dateTo, scopeParams.depot_id])

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-color">
        <i className="fa-solid fa-spinner fa-spin mr-2" /> Chargement...
      </div>
    )
  }

  const chartData = (data?.by_day ?? []).map((day) => ({
    date: day.day?.slice(5),
    revenue: Number(day.revenue ?? 0),
    profit: Number(day.profit ?? 0),
  }))

  return (
    <>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[['today', 'Auj.'], ['week', 'Semaine'], ['month', 'Mois'], ['custom', 'Personnalise']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-3 py-1.5 text-xs rounded-xl font-semibold border transition-colors ${
              period === key ? 'bg-teal-600 text-white border-teal-600' : 'border-theme text-muted-color hover:text-base-color'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="card mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Du</label>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Au</label>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="CA total" value={`${fmt(data?.totals?.revenue)} TND`} icon="fa-solid fa-sack-dollar" color="#0d9488" />
        <KpiCard label="Cout des ventes" value={`${fmt(data?.totals?.cost)} TND`} icon="fa-solid fa-boxes-stacked" color="#64748b" />
        <KpiCard label="Benefice brut" value={`${fmt(data?.totals?.profit)} TND`} icon="fa-solid fa-coins" color="#10b981" sub={`Marge: ${data?.totals?.margin_pct ?? 0}%`} />
        <KpiCard label="Ventes sous cout" value={data?.totals?.below_cost_lines ?? 0} icon="fa-solid fa-triangle-exclamation" color="#dc2626" sub="lignes sous prix achat" />
      </div>

      {chartData.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-base-color mb-4">Évolution CA / bénéfice</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
              <XAxis dataKey="date" stroke={theme.axis} tick={{ fontSize: 10, fill: theme.axis }} />
              <YAxis stroke={theme.axis} tick={{ fontSize: 10, fill: theme.axis }} />
              <Tooltip contentStyle={theme.tooltip} formatter={(value, name) => [`${fmt(value)} TND`, name === 'revenue' ? 'CA' : 'Benefice']} />
              <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h2 className="text-sm font-semibold text-base-color mb-3">Par representant</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Representant', 'CA', 'Cout', 'Benefice', 'Factures'].map((heading, index) => (
                <th key={heading} className={`pb-3 pr-4 ${index > 0 ? 'text-right' : 'text-left'}`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.by_rep ?? []).map((rep, index) => (
              <tr key={index} className="table-row">
                <td className="py-3 pr-4 font-semibold text-base-color">{rep.rep_name}</td>
                <td className="py-3 pr-4 text-right font-mono text-secondary-color">{fmt(rep.revenue)}</td>
                <td className="py-3 pr-4 text-right font-mono text-muted-color">{fmt(rep.cost)}</td>
                <td className="py-3 pr-4 text-right font-mono font-bold" style={{ color: '#059669' }}>{fmt(rep.profit)}</td>
                <td className="py-3 text-right text-muted-color">{rep.invoice_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function SitationTab({ scopeParams }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    setLoading(true)
    api.get('/reports/sitation', { params: { month, ...scopeParams } })
      .then((response) => setData(response.data))
      .finally(() => setLoading(false))
  }, [month, scopeParams.depot_id])

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} style={{ width: 'auto' }} />
        <span className="text-xs text-muted-color">SITATION mensuelle El Irtiwaa</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-color">
          <i className="fa-solid fa-spinner fa-spin mr-2" /> Chargement...
        </div>
      ) : data && (
        <div className="space-y-5">
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
              <i className="fa-solid fa-arrow-trend-up text-teal-500" /> Recettes
            </h2>
            <table className="w-full text-sm mb-3">
              <thead>
                <tr>
                  {['Representant', 'CA', 'Benefice'].map((heading, index) => (
                    <th key={heading} className={`pb-3 pr-4 ${index > 0 ? 'text-right' : 'text-left'}`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.recettes?.by_rep ?? []).map((rep, index) => (
                  <tr key={index} className="table-row">
                    <td className="py-2.5 pr-4 text-base-color">{rep.rep_name}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-secondary-color">{fmt(rep.revenue)} TND</td>
                    <td className="py-2.5 text-right font-mono font-bold" style={{ color: '#059669' }}>{fmt(rep.profit)} TND</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between text-sm font-semibold pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-secondary-color">Total CA</span>
              <span className="text-base-color font-mono">{fmt(data.recettes?.total_revenue)} TND</span>
            </div>
            <div className="flex justify-between text-sm font-semibold mt-1">
              <span className="text-secondary-color">Benefice brut</span>
              <span className="font-mono" style={{ color: '#059669' }}>{fmt(data.recettes?.total_profit)} TND</span>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
              <i className="fa-solid fa-receipt" style={{ color: '#ea580c' }} /> Depenses
            </h2>
            <table className="w-full text-sm mb-3">
              <thead>
                <tr>
                  {['Categorie', 'Montant'].map((heading, index) => (
                    <th key={heading} className={`pb-3 pr-4 ${index > 0 ? 'text-right' : 'text-left'}`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.depenses?.by_category ?? []).map((expense, index) => (
                  <tr key={index} className="table-row">
                    <td className="py-2.5 pr-4 text-secondary-color">{expense.label}</td>
                    <td className="py-2.5 text-right font-mono" style={{ color: '#ea580c' }}>{fmt(expense.total)} TND</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between text-sm font-semibold pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-secondary-color">Total depenses</span>
              <span className="font-mono" style={{ color: '#ea580c' }}>{fmt(data.depenses?.total)} TND</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card">
              <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
                <i className="fa-solid fa-credit-card" style={{ color: '#d97706' }} /> Crédit extérieur
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-color">Crédit accordé (impaye)</span>
                  <span className="font-mono font-bold" style={{ color: '#dc2626' }}>{fmt(data.credit?.credit_du)} TND</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-color">Crédit collecté</span>
                  <span className="font-mono font-bold" style={{ color: '#059669' }}>{fmt(data.credit?.credit_collecte)} TND</span>
                </div>
                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-secondary-color font-medium">Valeur stock depot</span>
                  <span className="text-base-color font-mono">{fmt(data.stock_valeur)} TND</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
                <i className="fa-solid fa-coins" style={{ color: '#059669' }} /> Benefice net
              </h2>
              <div className="text-3xl font-bold font-mono mb-1" style={{ color: '#059669' }}>
                {fmt(data.benefice_net)} <span className="text-sm font-normal text-muted-color">TND</span>
              </div>
              <div className="text-xs text-muted-color">Marge d'erreur (0.2%): {fmt(data.marge_erreur)} TND</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MovementsTab({ scopeParams }) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/depot/movements', { params: scopeParams })
      .then((response) => setMovements(Array.isArray(response.data) ? response.data : (response.data?.data ?? [])))
      .finally(() => setLoading(false))
  }, [scopeParams.depot_id])

  const typeConfig = {
    depot_in: { label: 'Reception', color: '#10b981' },
    depot_to_camion: { label: 'Vers camion', color: '#3b82f6' },
    camion_to_customer: { label: 'Vers client', color: '#ef4444' },
    return: { label: 'Retour', color: '#f59e0b' },
    adjustment: { label: 'Ajustement', color: '#94a3b8' },
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-color">
        <i className="fa-solid fa-spinner fa-spin mr-2" /> Chargement...
      </div>
    )
  }

  return (
    <div className="card">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {['Type', 'Produit', 'Depot', 'Commercial', 'Quantite', 'Date'].map((heading) => (
              <th key={heading} className={`pb-3 pr-4 ${heading === 'Quantite' ? 'text-right' : 'text-left'}`}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => {
            const config = typeConfig[movement.type] ?? { label: movement.type, color: '#94a3b8' }
            const quantity = Number(movement.qty)

            return (
              <tr key={movement.id} className="table-row">
                <td className="py-2.5 pr-4 text-xs font-semibold" style={{ color: config.color }}>{config.label}</td>
                <td className="py-2.5 pr-4 text-base-color">{movement.product?.name}</td>
                <td className="py-2.5 pr-4 text-muted-color text-xs">{movement.depot?.name ?? '-'}</td>
                <td className="py-2.5 pr-4 text-secondary-color text-xs">{movement.user?.name ?? '-'}</td>
                <td className="py-2.5 pr-4 text-right font-mono font-bold" style={{ color: quantity >= 0 ? '#059669' : '#dc2626' }}>
                  {quantity >= 0 ? '+' : ''}{quantity.toFixed(3)}
                </td>
                <td className="py-2.5 text-muted-color text-xs">{new Date(movement.created_at).toLocaleDateString('fr-FR')}</td>
              </tr>
            )
          })}
          {movements.length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-muted-color">Aucun mouvement</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function ReportsIndex() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const {
    depots,
    selectedValue: selectedDepotValue,
    setSelectedValue: setSelectedDepotValue,
    selectedDepot,
    canSelectAll,
    scopeParams,
  } = useDepots({
    allowAll: true,
    storageKey: 'app-depot-scope',
    defaultToAll: true,
  })

  useEffect(() => {
    setLoading(true)
    api.get('/stats', { params: scopeParams }).then((response) => setStats(response.data)).finally(() => setLoading(false))
  }, [scopeParams.depot_id])

  if (loading) {
    return <PageLoader />
  }

  const tabs = [
    { key: 'overview', label: "Vue d'ensemble", icon: 'fa-solid fa-chart-pie' },
    { key: 'profit', label: 'Benefices', icon: 'fa-solid fa-coins' },
    { key: 'sitation', label: 'SITATION', icon: 'fa-solid fa-file-lines' },
    { key: 'movements', label: 'Mouvements', icon: 'fa-solid fa-arrows-up-down' },
  ]

  const exportConfig = {
    overview: { csvEntity: 'invoices', csvFilename: 'rapport_vue_ensemble', csvParams: scopeParams },
    profit: { csvEntity: 'invoices', csvFilename: 'rapport_benefices', csvParams: scopeParams },
    sitation: { csvEntity: 'expenses', csvFilename: 'rapport_sitation', csvParams: scopeParams },
    movements: { csvEntity: 'stock_movements', csvFilename: 'rapport_mouvements', csvParams: scopeParams },
  }

  const currentExport = exportConfig[tab] ?? {}

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-base-color tracking-tight">Rapports</h1>
            <p className="text-sm text-muted-color mt-0.5">Statistiques, bénéfices et SITATION{canSelectAll ? ` | ${selectedDepot ? `Depot ${selectedDepot.name}` : 'Tous les dépôts'}` : ''}</p>
          </div>
          <div className="flex flex-wrap items-end justify-end gap-2">
            {canSelectAll && (
              <DepotScopeControls
                depots={depots}
                selectedValue={selectedDepotValue}
                onChange={setSelectedDepotValue}
                allowAll
                canSelectAll={canSelectAll}
                allLabel="Tous les dépôts"
              />
            )}
            <PageExportActions title="Rapports" {...currentExport} />
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-theme">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === item.key ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-muted-color hover:text-base-color'
            }`}
          >
            <i className={`${item.icon} text-xs`} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab stats={stats} />}
      {tab === 'profit' && <ProfitTab scopeParams={scopeParams} />}
      {tab === 'sitation' && <SitationTab scopeParams={scopeParams} />}
      {tab === 'movements' && <MovementsTab scopeParams={scopeParams} />}
    </div>
  )
}
