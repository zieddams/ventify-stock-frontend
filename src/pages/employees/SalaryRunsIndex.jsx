import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormField from '../../components/FormField'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { formatCurrency } from '../../utils/format'

const now = new Date()

export default function SalaryRunsIndex() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const canManage = me?.role === 'admin' || me?.role === 'developer'

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const load = () => {
    setLoading(true)
    api.get('/salary-runs', { params: { period_year: year, period_month: month } })
      .then((response) => setRuns(Array.isArray(response.data) ? response.data : []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [year, month])

  const generate = async () => {
    setGenerating(true)
    try {
      await api.post('/salary-runs/generate', { period_year: year, period_month: month })
      load()
    } finally {
      setGenerating(false)
    }
  }

  const startEdit = (run) => {
    setEditingId(run.id)
    setEditForm({
      base_salary: run.base_salary, primes_total: run.primes_total,
      avances_deducted: run.avances_deducted, retenues_total: run.retenues_total,
      cnss_employee_amount: run.cnss_employee_amount,
    })
  }

  const saveEdit = async (run) => {
    await api.put(`/salary-runs/${run.id}`, {
      ...editForm,
      base_salary: Number(editForm.base_salary),
      primes_total: Number(editForm.primes_total),
      avances_deducted: Number(editForm.avances_deducted),
      retenues_total: Number(editForm.retenues_total),
      cnss_employee_amount: Number(editForm.cnss_employee_amount),
    })
    setEditingId(null)
    load()
  }

  const finalize = async (run) => {
    if (!confirm(t('salaryRunsPage.finalizeConfirm'))) return
    await api.post(`/salary-runs/${run.id}/finalize`)
    load()
  }

  const markPaid = async (run) => {
    if (!confirm(t('salaryRunsPage.markPaidConfirm'))) return
    await api.post(`/salary-runs/${run.id}/mark-paid`)
    load()
  }

  const totalNet = runs.reduce((sum, run) => sum + Number(run.net_pay ?? 0), 0)

  return (
    <div>
      <PageHeader
        title={t('salaryRunsPage.title')}
        subtitle={t('salaryRunsPage.subtitle', { total: formatCurrency(totalNet) })}
        action={(
          <div className="flex items-end gap-2">
            <FormField label={t('salaryRunsPage.year')}>
              <input type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} style={{ width: 100 }} />
            </FormField>
            <FormField label={t('salaryRunsPage.month')}>
              <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </FormField>
            {canManage && (
              <button onClick={generate} disabled={generating} className="btn-primary">
                {generating ? <><i className="fa-solid fa-spinner fa-spin" /> {t('salaryRunsPage.generating')}</> : t('salaryRunsPage.generate')}
              </button>
            )}
          </div>
        )}
      />

      {loading ? <PageLoader /> : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {[
                    t('salaryRunsPage.columns.employee'), t('salaryRunsPage.columns.baseSalary'),
                    t('salaryRunsPage.columns.primes'), t('salaryRunsPage.columns.avances'),
                    t('salaryRunsPage.columns.cnss'), t('salaryRunsPage.columns.netPay'),
                    t('salaryRunsPage.columns.status'), t('salaryRunsPage.columns.actions'),
                  ].map((heading) => <th key={heading} className="pb-3 pr-4 text-left">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const isEditing = editingId === run.id
                  const isDraft = run.status === 'draft'

                  return (
                    <tr key={run.id} className="table-row">
                      <td className="py-3 pr-4">
                        <button onClick={() => navigate(`/employees/${run.employee_user_id}`)} className="font-semibold text-base-color hover:underline">
                          {run.employee?.name}
                        </button>
                      </td>
                      <td className="py-3 pr-4">
                        {isEditing ? (
                          <input type="number" step="0.001" value={editForm.base_salary} onChange={(e) => setEditForm((c) => ({ ...c, base_salary: e.target.value }))} style={{ width: 90 }} />
                        ) : formatCurrency(run.base_salary)}
                      </td>
                      <td className="py-3 pr-4">
                        {isEditing ? (
                          <input type="number" step="0.001" value={editForm.primes_total} onChange={(e) => setEditForm((c) => ({ ...c, primes_total: e.target.value }))} style={{ width: 90 }} />
                        ) : formatCurrency(run.primes_total)}
                      </td>
                      <td className="py-3 pr-4">
                        {isEditing ? (
                          <input type="number" step="0.001" value={editForm.avances_deducted} onChange={(e) => setEditForm((c) => ({ ...c, avances_deducted: e.target.value }))} style={{ width: 90 }} />
                        ) : formatCurrency(run.avances_deducted)}
                      </td>
                      <td className="py-3 pr-4">
                        {isEditing ? (
                          <input type="number" step="0.001" value={editForm.cnss_employee_amount} onChange={(e) => setEditForm((c) => ({ ...c, cnss_employee_amount: e.target.value }))} style={{ width: 90 }} />
                        ) : formatCurrency(run.cnss_employee_amount)}
                      </td>
                      <td className="py-3 pr-4 font-bold text-base-color">{formatCurrency(run.net_pay)}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          run.status === 'paid' ? 'text-emerald-600' : run.status === 'finalized' ? 'text-blue-600' : 'text-amber-600'
                        }`} style={{ background: 'var(--surface-2)' }}>
                          {t(`salaryRunsPage.statuses.${run.status}`)}
                        </span>
                      </td>
                      <td className="py-3">
                        {canManage && isDraft && (
                          isEditing ? (
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(run)} className="text-xs font-medium text-emerald-600">{t('common.save')}</button>
                              <button onClick={() => setEditingId(null)} className="text-xs font-medium text-muted-color">{t('common.cancel')}</button>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <button onClick={() => startEdit(run)} className="text-xs font-medium" style={{ color: '#0d9488' }}>{t('common.edit')}</button>
                              <button onClick={() => finalize(run)} className="text-xs font-medium text-blue-600">{t('salaryRunsPage.finalize')}</button>
                            </div>
                          )
                        )}
                        {canManage && run.status === 'finalized' && (
                          <button onClick={() => markPaid(run)} className="text-xs font-medium text-emerald-600">{t('salaryRunsPage.markPaid')}</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {runs.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-muted-color">{t('salaryRunsPage.empty')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
