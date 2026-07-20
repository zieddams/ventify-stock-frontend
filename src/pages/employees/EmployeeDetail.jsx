import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FormField from '../../components/FormField'
import MonthYearField from '../../components/MonthYearField'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import RowDocumentActions from '../../components/RowDocumentActions'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format'

const EMPTY_PROFILE = {
  phone: '', address: '', cin: '', birth_date: '', hire_date: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  bank_name: '', bank_account_number: '', base_salary: '',
  cnss_number: '', cnss_enrolled: false, expected_start_time: '',
}

const TAB_DEFS = [
  { key: 'profile', icon: 'fa-solid fa-id-badge' },
  { key: 'documents', icon: 'fa-solid fa-file-lines' },
  { key: 'ledger', icon: 'fa-solid fa-money-bill-transfer' },
  { key: 'leave', icon: 'fa-solid fa-umbrella-beach' },
  { key: 'manques', icon: 'fa-solid fa-triangle-exclamation' },
  { key: 'absences', icon: 'fa-solid fa-calendar-xmark' },
  { key: 'salary', icon: 'fa-solid fa-money-check-dollar' },
  { key: 'notes', icon: 'fa-solid fa-note-sticky' },
  { key: 'performance', icon: 'fa-solid fa-chart-line' },
]

export default function EmployeeDetail() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { employeeId } = useParams()
  const { user: me } = useAuth()
  const canEdit = me?.role === 'admin' || me?.role === 'developer'

  const [tab, setTab] = useState('profile')
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadEmployee = async () => {
    const response = await api.get(`/employees/${employeeId}`)
    setEmployee(response.data)
  }

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    loadEmployee()
      .catch((error) => {
        setLoadError(error.response?.status === 403 ? t('employeesPage.accessDenied') : t('employeesPage.notFound'))
      })
      .finally(() => setLoading(false))
  }, [employeeId])

  if (loading) {
    return <PageLoader />
  }

  if (loadError || !employee) {
    return (
      <div>
        <PageHeader
          title={t('employeesPage.title')}
          action={(
            <button onClick={() => navigate('/employees')} className="btn-secondary">
              <i className="fa-solid fa-arrow-left" /> {t('common.back')}
            </button>
          )}
        />
        <div className="card text-center py-16">
          <i className="fa-solid fa-triangle-exclamation text-3xl mb-3" style={{ color: '#f59e0b' }} />
          <p className="text-secondary-color">{loadError || t('employeesPage.notFound')}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={employee.name}
        subtitle={employee.email}
        action={(
          <button onClick={() => navigate('/employees')} className="btn-secondary">
            <i className="fa-solid fa-arrow-left" /> {t('common.back')}
          </button>
        )}
      />

      <div className="flex flex-wrap gap-1 mb-6 border-b border-theme">
        {TAB_DEFS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === item.key ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-muted-color hover:text-base-color'
            }`}
          >
            <i className={`${item.icon} text-xs`} />
            {t(`employeesPage.tabs.${item.key}`)}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === 'profile' && <ProfileTab employee={employee} canEdit={canEdit} onSaved={loadEmployee} t={t} />}
        {tab === 'documents' && <DocumentsTab employeeId={employeeId} canEdit={canEdit} t={t} />}
        {tab === 'ledger' && <LedgerTab employeeId={employeeId} employeeName={employee.name} canEdit={canEdit} t={t} />}
        {tab === 'leave' && <LeaveTab employeeId={employeeId} employeeName={employee.name} canEdit={canEdit} isSelf={String(me?.id) === String(employeeId)} t={t} />}
        {tab === 'manques' && <ManquesTab employeeId={employeeId} employeeName={employee.name} canEdit={canEdit} t={t} />}
        {tab === 'absences' && <AbsencesTab employeeId={employeeId} employeeName={employee.name} canEdit={canEdit} t={t} />}
        {tab === 'salary' && <SalaryHistoryTab employeeId={employeeId} employeeName={employee.name} t={t} />}
        {tab === 'notes' && <NotesTab employeeId={employeeId} canEdit={canEdit} t={t} />}
        {tab === 'performance' && <PerformanceTab employeeId={employeeId} t={t} />}
      </div>
    </div>
  )
}

function ProfileTab({ employee, canEdit, onSaved, t }) {
  const [form, setForm] = useState(EMPTY_PROFILE)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const profile = employee.profile

  useEffect(() => {
    setForm({
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
      cin: profile?.cin ?? '',
      // Defensive slice: an <input type="date"> silently blanks out if fed
      // anything but a bare "YYYY-MM-DD" (e.g. a full ISO timestamp).
      birth_date: (profile?.birth_date ?? '').slice(0, 10),
      hire_date: (profile?.hire_date ?? '').slice(0, 10),
      emergency_contact_name: profile?.emergency_contact_name ?? '',
      emergency_contact_phone: profile?.emergency_contact_phone ?? '',
      bank_name: profile?.bank_name ?? '',
      bank_account_number: profile?.bank_account_number ?? '',
      base_salary: profile?.base_salary ?? '',
      cnss_number: profile?.cnss_number ?? '',
      cnss_enrolled: !!profile?.cnss_enrolled,
      expected_start_time: profile?.expected_start_time ?? '',
    })
  }, [profile])

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setErrors({})

    try {
      const method = profile ? 'put' : 'post'
      const url = profile ? `/employees/${employee.id}` : '/employees'
      await api[method](url, { ...form, user_id: employee.id, base_salary: form.base_salary === '' ? null : Number(form.base_salary) })
      await onSaved()
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {})
    } finally {
      setSaving(false)
    }
  }

  const showBankDetails = 'bank_account_number' in (profile ?? {}) || canEdit

  return (
    <div className="space-y-4 max-w-2xl">
      {!profile && !canEdit && (
        <div className="rounded-2xl px-4 py-3 text-sm text-secondary-color" style={{ background: 'var(--surface-2)' }}>
          {t('employeesPage.profile.noProfileYet')}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('employeesPage.profile.phone')} error={errors.phone?.[0]}>
          <input value={form.phone} onChange={set('phone')} disabled={!canEdit} />
        </FormField>
        <FormField label={t('employeesPage.profile.cin')} error={errors.cin?.[0]}>
          <input value={form.cin} onChange={set('cin')} disabled={!canEdit} />
        </FormField>
      </div>

      <FormField label={t('employeesPage.profile.address')} error={errors.address?.[0]}>
        <input value={form.address} onChange={set('address')} disabled={!canEdit} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('employeesPage.profile.birthDate')} error={errors.birth_date?.[0]}>
          <input type="date" value={form.birth_date ?? ''} onChange={set('birth_date')} disabled={!canEdit} />
        </FormField>
        <FormField label={t('employeesPage.profile.hireDate')} error={errors.hire_date?.[0]}>
          <input type="date" value={form.hire_date ?? ''} onChange={set('hire_date')} disabled={!canEdit} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('employeesPage.profile.emergencyName')} error={errors.emergency_contact_name?.[0]}>
          <input value={form.emergency_contact_name} onChange={set('emergency_contact_name')} disabled={!canEdit} />
        </FormField>
        <FormField label={t('employeesPage.profile.emergencyPhone')} error={errors.emergency_contact_phone?.[0]}>
          <input value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} disabled={!canEdit} />
        </FormField>
      </div>

      <div className="my-2 h-px" style={{ background: 'var(--border)' }} />

      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('employeesPage.profile.baseSalary')} error={errors.base_salary?.[0]}>
          <input type="number" step="0.001" value={form.base_salary} onChange={set('base_salary')} disabled={!canEdit} />
        </FormField>
        <FormField label={t('employeesPage.profile.expectedStartTime')} error={errors.expected_start_time?.[0]}>
          <input type="time" value={form.expected_start_time ?? ''} onChange={set('expected_start_time')} disabled={!canEdit} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <FormField label={t('employeesPage.profile.cnssNumber')} error={errors.cnss_number?.[0]}>
          <input value={form.cnss_number} onChange={set('cnss_number')} disabled={!canEdit} />
        </FormField>
        <label className="flex items-center gap-2 pb-2 text-sm text-base-color">
          <input type="checkbox" checked={form.cnss_enrolled} onChange={set('cnss_enrolled')} disabled={!canEdit} style={{ width: 16, height: 16 }} />
          {t('employeesPage.profile.cnssEnrolled')}
        </label>
      </div>

      {showBankDetails && (
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('employeesPage.profile.bankName')} error={errors.bank_name?.[0]}>
            <input value={form.bank_name} onChange={set('bank_name')} disabled={!canEdit} />
          </FormField>
          <FormField label={t('employeesPage.profile.bankAccountNumber')} error={errors.bank_account_number?.[0]}>
            <input value={form.bank_account_number} onChange={set('bank_account_number')} disabled={!canEdit} />
          </FormField>
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('common.save')}
          </button>
        </div>
      )}
    </div>
  )
}

function DocumentsTab({ employeeId, canEdit, t }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('cin_copy')
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get(`/employees/${employeeId}/documents`).then((response) => {
      setDocuments(Array.isArray(response.data) ? response.data : [])
    }).finally(() => setLoading(false))
  }

  useEffect(load, [employeeId])

  const upload = async () => {
    if (!file) return
    setUploading(true)
    setError('')

    try {
      const payload = new FormData()
      payload.append('type', type)
      payload.append('note', note)
      payload.append('file', file)
      await api.post(`/employees/${employeeId}/documents`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
      setFile(null)
      setNote('')
      load()
    } catch (err) {
      setError(err.response?.data?.message ?? t('employeesPage.documents.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const remove = async (document) => {
    if (!confirm(t('employeesPage.documents.deleteConfirm'))) return
    await api.delete(`/employees/${employeeId}/documents/${document.id}`)
    load()
  }

  const download = async (document) => {
    // A plain <a href> would hit the API unauthenticated (Bearer-token auth, not
    // cookies) - fetch through the axios instance instead so the interceptor
    // attaches the token, then hand the browser a local blob URL to save.
    const response = await api.get(`/employees/${employeeId}/documents/${document.id}/download`, { responseType: 'blob' })
    const blobUrl = window.URL.createObjectURL(response.data)
    const link = window.document.createElement('a')
    link.href = blobUrl
    link.download = document.original_filename || 'document'
    window.document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(blobUrl)
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface-2)' }}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('employeesPage.documents.type')}>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                {['cin_copy', 'contract', 'cnss_attestation', 'other'].map((value) => (
                  <option key={value} value={value}>{t(`employeesPage.documents.types.${value}`)}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('employeesPage.documents.note')}>
              <input value={note} onChange={(event) => setNote(event.target.value)} />
            </FormField>
          </div>
          <div className="flex items-center gap-3">
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} accept=".pdf,.jpg,.jpeg,.png,.webp" />
            <button onClick={upload} disabled={!file || uploading} className="btn-primary">
              {uploading ? <><i className="fa-solid fa-spinner fa-spin" /> {t('employeesPage.documents.uploading')}</> : t('employeesPage.documents.upload')}
            </button>
          </div>
          {error && <div className="text-xs text-red-500">{error}</div>}
        </div>
      )}

      <div className="divide-y divide-theme">
        {documents.map((document) => (
          <div key={document.id} className="flex items-center justify-between py-3">
            <div>
              <div className="font-semibold text-sm text-base-color">
                <i className="fa-solid fa-file-lines mr-2" style={{ color: '#0d9488' }} />
                {document.original_filename}
              </div>
              <div className="text-xs text-muted-color mt-1">
                {t(`employeesPage.documents.types.${document.type}`)} · {formatDateTime(document.created_at)} · {document.uploader_name}
                {document.note ? ` · ${document.note}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => download(document)} className="text-xs font-medium" style={{ color: '#2563eb' }}>
                <i className="fa-solid fa-download mr-1" /> {t('employeesPage.documents.download')}
              </button>
              {canEdit && (
                <button onClick={() => remove(document)} className="text-xs font-medium text-red-500">
                  <i className="fa-solid fa-trash-can mr-1" /> {t('common.delete')}
                </button>
              )}
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <div className="py-12 text-center text-muted-color">{t('employeesPage.documents.empty')}</div>
        )}
      </div>
    </div>
  )
}

function LedgerTab({ employeeId, employeeName, canEdit, t }) {
  const { layouts: documentLayouts, documentSettings } = useDocumentLayouts()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ type: 'prime', amount: '', note: '', related_period: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get(`/employees/${employeeId}/transactions`).then((response) => {
      setTransactions(Array.isArray(response.data) ? response.data : [])
    }).finally(() => setLoading(false))
  }

  useEffect(load, [employeeId])

  const submit = async () => {
    if (!form.amount) return
    setSaving(true)
    setError('')

    try {
      await api.post(`/employees/${employeeId}/transactions`, {
        ...form,
        amount: Number(form.amount),
        related_period: form.related_period || null,
      })
      setForm({ type: form.type, amount: '', note: '', related_period: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.message ?? t('employeesPage.ledger.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface-2)' }}>
          <div className="grid grid-cols-4 gap-3">
            <FormField label={t('employeesPage.ledger.type')}>
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                {/* 'retenue' is soft-deprecated (no longer creatable) and 'manque' has
                    its own dedicated tab - see the HR redesign plan. */}
                {['prime', 'avance', 'remboursement_avance', 'autre'].map((value) => (
                  <option key={value} value={value}>{t(`employeesPage.ledger.types.${value}`)}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('employeesPage.ledger.amount')}>
              <input type="number" step="0.001" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
            </FormField>
            <FormField label={t('employeesPage.ledger.period')}>
              <MonthYearField value={form.related_period} onChange={(value) => setForm((current) => ({ ...current, related_period: value }))} />
            </FormField>
            <FormField label={t('employeesPage.ledger.note')}>
              <input value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
            </FormField>
          </div>
          <div className="flex justify-end">
            <button onClick={submit} disabled={saving || !form.amount} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('employeesPage.ledger.add')}
            </button>
          </div>
          {error && <div className="text-xs text-red-500">{error}</div>}
        </div>
      )}

      <div className="flex justify-end">
        <PageExportActions
          title={t('employeesPage.ledger.documentTitle', { name: employeeName })}
          documentKey="employee_transactions_list"
          records={transactions}
          documentLayouts={documentLayouts}
          documentSettings={documentSettings}
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr>
            {[
              t('employeesPage.ledger.type'), t('employeesPage.ledger.amount'), t('employeesPage.ledger.balance'),
              t('employeesPage.ledger.period'), t('employeesPage.ledger.note'), t('employeesPage.ledger.date'),
            ].map((heading) => <th key={heading} className="pb-3 pr-4 text-left">{heading}</th>)}
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="table-row">
              <td className="py-2 pr-4">{t(`employeesPage.ledger.types.${transaction.type}`)}</td>
              <td className="py-2 pr-4 font-semibold">{formatCurrency(transaction.amount)}</td>
              <td className="py-2 pr-4 text-secondary-color">{formatCurrency(transaction.balance_after)}</td>
              <td className="py-2 pr-4 text-muted-color text-xs">{transaction.related_period ?? '-'}</td>
              <td className="py-2 pr-4 text-muted-color text-xs">{transaction.note ?? '-'}</td>
              <td className="py-2 pr-4 text-muted-color text-xs">{formatDateTime(transaction.created_at)}</td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr><td colSpan={6} className="py-12 text-center text-muted-color">{t('employeesPage.ledger.empty')}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function LeaveTab({ employeeId, employeeName, canEdit, isSelf, t }) {
  const { layouts: documentLayouts, documentSettings } = useDocumentLayouts()
  const [data, setData] = useState({ leaves: [] })
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ type: 'annuel', date_start: '', date_end: '', note: '', is_paid: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get(`/employees/${employeeId}/leaves`).then((response) => setData(response.data)).finally(() => setLoading(false))
  }

  useEffect(load, [employeeId])

  const submit = async () => {
    if (!form.date_start || !form.date_end) return
    setSaving(true)
    setError('')

    try {
      await api.post(`/employees/${employeeId}/leaves`, form)
      setForm({ type: 'annuel', date_start: '', date_end: '', note: '', is_paid: false })
      load()
    } catch (err) {
      setError(err.response?.data?.message ?? t('employeesPage.leave.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const decide = async (leave, action) => {
    await api.post(`/employees/${employeeId}/leaves/${leave.id}/${action}`)
    load()
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-4">
      {(canEdit || isSelf) && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface-2)' }}>
          <div className="grid grid-cols-3 gap-3">
            <FormField label={t('employeesPage.leave.type')}>
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                {['annuel', 'maladie', 'sans_solde', 'autre'].map((value) => (
                  <option key={value} value={value}>{t(`employeesPage.leave.types.${value}`)}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('employeesPage.leave.dateStart')}>
              <input type="date" value={form.date_start} onChange={(event) => setForm((current) => ({ ...current, date_start: event.target.value }))} />
            </FormField>
            <FormField label={t('employeesPage.leave.dateEnd')}>
              <input type="date" value={form.date_end} onChange={(event) => setForm((current) => ({ ...current, date_end: event.target.value }))} />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm text-base-color">
            <input type="checkbox" checked={form.is_paid} onChange={(event) => setForm((current) => ({ ...current, is_paid: event.target.checked }))} style={{ width: 16, height: 16 }} />
            {t('employeesPage.leave.isPaid')}
          </label>
          <div className="flex justify-end">
            <button onClick={submit} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('employeesPage.leave.request')}
            </button>
          </div>
          {error && <div className="text-xs text-red-500">{error}</div>}
        </div>
      )}

      {data.leaves.length > 0 && (
        <div className="flex justify-end">
          <PageExportActions
            title={t('employeesPage.leave.documentTitle', { name: employeeName })}
            documentKey="employee_leaves_list"
            records={data.leaves}
            documentLayouts={documentLayouts}
            documentSettings={documentSettings}
          />
        </div>
      )}

      <div className="divide-y divide-theme">
        {data.leaves.map((leave) => (
          <div key={leave.id} className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-base-color">
                {t(`employeesPage.leave.types.${leave.type}`)} · {formatDate(leave.date_start)} - {formatDate(leave.date_end)} ({leave.days_count} {t('employeesPage.leave.days')})
                {leave.is_paid && (
                  <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full text-emerald-600" style={{ background: 'var(--surface)' }}>
                    {t('employeesPage.leave.isPaid')}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-color mt-1">{leave.note}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                leave.status === 'approved' ? 'text-emerald-600' : leave.status === 'rejected' ? 'text-red-500' : 'text-amber-600'
              }`} style={{ background: 'var(--surface)' }}>
                {t(`employeesPage.leave.statuses.${leave.status}`)}
              </span>
              {canEdit && leave.status === 'pending' && (
                <>
                  <button onClick={() => decide(leave, 'approve')} className="text-xs font-medium text-emerald-600">{t('employeesPage.leave.approve')}</button>
                  <button onClick={() => decide(leave, 'reject')} className="text-xs font-medium text-red-500">{t('employeesPage.leave.reject')}</button>
                </>
              )}
            </div>
          </div>
        ))}
        {data.leaves.length === 0 && (
          <div className="py-12 text-center text-muted-color">{t('employeesPage.leave.empty')}</div>
        )}
      </div>
    </div>
  )
}

function ManquesTab({ employeeId, employeeName, canEdit, t }) {
  const { layouts: documentLayouts, documentSettings } = useDocumentLayouts()
  const [manques, setManques] = useState([])
  const [loading, setLoading] = useState(true)
  const [manqueForm, setManqueForm] = useState({ amount: '', related_period: '', note: '' })
  const [savingManque, setSavingManque] = useState(false)
  const [manqueError, setManqueError] = useState('')

  const load = () => {
    setLoading(true)
    api.get(`/employees/${employeeId}/transactions`).then((response) => {
      const transactions = Array.isArray(response.data) ? response.data : []
      setManques(transactions.filter((entry) => entry.type === 'manque'))
    }).finally(() => setLoading(false))
  }

  useEffect(load, [employeeId])

  const submitManque = async () => {
    if (!manqueForm.amount || !manqueForm.related_period) return
    setSavingManque(true)
    setManqueError('')

    try {
      await api.post(`/employees/${employeeId}/transactions`, {
        type: 'manque', amount: Number(manqueForm.amount),
        related_period: manqueForm.related_period, note: manqueForm.note || null,
      })
      setManqueForm({ amount: '', related_period: '', note: '' })
      load()
    } catch (err) {
      setManqueError(err.response?.data?.message ?? t('employeesPage.manques.saveFailed'))
    } finally {
      setSavingManque(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div>
      {canEdit && (
        <div className="rounded-2xl p-4 space-y-3 mb-3" style={{ background: 'var(--surface-2)' }}>
          <div className="grid grid-cols-3 gap-3">
            <FormField label={t('employeesPage.ledger.amount')}>
              <input type="number" step="0.001" value={manqueForm.amount} onChange={(event) => setManqueForm((current) => ({ ...current, amount: event.target.value }))} />
            </FormField>
            <FormField label={t('employeesPage.ledger.period')}>
              <MonthYearField value={manqueForm.related_period} onChange={(value) => setManqueForm((current) => ({ ...current, related_period: value }))} />
            </FormField>
            <FormField label={t('employeesPage.ledger.note')}>
              <input value={manqueForm.note} onChange={(event) => setManqueForm((current) => ({ ...current, note: event.target.value }))} />
            </FormField>
          </div>
          <div className="flex justify-end">
            <button onClick={submitManque} disabled={savingManque || !manqueForm.amount || !manqueForm.related_period} className="btn-primary">
              {savingManque ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('employeesPage.manques.add')}
            </button>
          </div>
          {manqueError && <div className="text-xs text-red-500">{manqueError}</div>}
        </div>
      )}

      {manques.length > 0 && (
        <div className="flex justify-end mb-2">
          <PageExportActions
            title={t('employeesPage.manques.documentTitle', { name: employeeName })}
            documentKey="employee_manques_list"
            records={manques}
            documentLayouts={documentLayouts}
            documentSettings={documentSettings}
          />
        </div>
      )}

      <div className="divide-y divide-theme">
        {manques.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-base-color">{formatCurrency(entry.amount)} · {entry.related_period ?? '-'}</div>
              <div className="text-xs text-muted-color mt-1">{entry.note}</div>
            </div>
            <div className="text-xs text-muted-color">{formatDateTime(entry.created_at)}</div>
          </div>
        ))}
        {manques.length === 0 && (
          <div className="py-8 text-center text-muted-color">{t('employeesPage.manques.empty')}</div>
        )}
      </div>
    </div>
  )
}

const ABSENCE_MODES = [
  { value: 'single', labelKey: 'modeSingle' },
  { value: 'range', labelKey: 'modeRange' },
]

function AbsencesTab({ employeeId, employeeName, canEdit, t }) {
  const { layouts: documentLayouts, documentSettings } = useDocumentLayouts()
  const [absences, setAbsences] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('single')
  const [absenceForm, setAbsenceForm] = useState({ date: '', note: '' })
  const [rangeForm, setRangeForm] = useState({ date_from: '', date_to: '', note: '' })
  const [savingAbsence, setSavingAbsence] = useState(false)
  const [absenceError, setAbsenceError] = useState('')
  const [rangeSummary, setRangeSummary] = useState('')

  const load = () => {
    setLoading(true)
    api.get(`/employees/${employeeId}/absences`).then((response) => {
      setAbsences(Array.isArray(response.data) ? response.data : [])
    }).finally(() => setLoading(false))
  }

  useEffect(load, [employeeId])

  const switchMode = (value) => {
    setMode(value)
    setAbsenceError('')
    setRangeSummary('')
  }

  const submitAbsence = async () => {
    if (!absenceForm.date) return
    setSavingAbsence(true)
    setAbsenceError('')
    setRangeSummary('')

    try {
      await api.post(`/employees/${employeeId}/absences`, { date: absenceForm.date, note: absenceForm.note || null })
      setAbsenceForm({ date: '', note: '' })
      load()
    } catch (err) {
      setAbsenceError(err.response?.data?.message ?? t('employeesPage.absences.saveFailed'))
    } finally {
      setSavingAbsence(false)
    }
  }

  const submitRange = async () => {
    if (!rangeForm.date_from || !rangeForm.date_to) return
    setAbsenceError('')
    setRangeSummary('')

    // The <input type="date"> min/max attributes only grey out choices in the
    // native picker - typing digits directly into the date segments can still
    // produce an inverted range, so it must be re-checked here before posting.
    if (rangeForm.date_from > rangeForm.date_to) {
      setAbsenceError(t('employeesPage.absences.rangeInverted'))
      return
    }

    setSavingAbsence(true)

    try {
      const response = await api.post(`/employees/${employeeId}/absences/range`, {
        date_from: rangeForm.date_from, date_to: rangeForm.date_to, note: rangeForm.note || null,
      })
      setRangeSummary(t('employeesPage.absences.rangeSummary', {
        created: response.data.created_count, skipped: response.data.skipped_count,
      }))
      setRangeForm({ date_from: '', date_to: '', note: '' })
      load()
    } catch (err) {
      setAbsenceError(err.response?.data?.message ?? t('employeesPage.absences.saveFailed'))
    } finally {
      setSavingAbsence(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div>
      {canEdit && (
        <div className="rounded-2xl p-4 space-y-3 mb-3" style={{ background: 'var(--surface-2)' }}>
          <div className="inline-flex rounded-full p-1" style={{ background: 'var(--surface)' }}>
            {ABSENCE_MODES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => switchMode(option.value)}
                disabled={savingAbsence}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  mode === option.value ? 'bg-teal-500 text-white' : 'text-muted-color hover:text-base-color'
                }`}
              >
                {t(`employeesPage.absences.${option.labelKey}`)}
              </button>
            ))}
          </div>

          {mode === 'single' ? (
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t('employeesPage.absences.date')}>
                <input type="date" value={absenceForm.date} onChange={(event) => setAbsenceForm((current) => ({ ...current, date: event.target.value }))} />
              </FormField>
              <FormField label={t('employeesPage.ledger.note')}>
                <input value={absenceForm.note} onChange={(event) => setAbsenceForm((current) => ({ ...current, note: event.target.value }))} />
              </FormField>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <FormField label={t('employeesPage.absences.dateFrom')}>
                <input type="date" value={rangeForm.date_from} max={rangeForm.date_to || undefined} onChange={(event) => setRangeForm((current) => ({ ...current, date_from: event.target.value }))} />
              </FormField>
              <FormField label={t('employeesPage.absences.dateTo')}>
                <input type="date" value={rangeForm.date_to} min={rangeForm.date_from || undefined} onChange={(event) => setRangeForm((current) => ({ ...current, date_to: event.target.value }))} />
              </FormField>
              <FormField label={t('employeesPage.ledger.note')}>
                <input value={rangeForm.note} onChange={(event) => setRangeForm((current) => ({ ...current, note: event.target.value }))} />
              </FormField>
            </div>
          )}

          <div className="flex justify-end">
            {mode === 'single' ? (
              <button onClick={submitAbsence} disabled={savingAbsence || !absenceForm.date} className="btn-primary">
                {savingAbsence ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('employeesPage.absences.add')}
              </button>
            ) : (
              <button onClick={submitRange} disabled={savingAbsence || !rangeForm.date_from || !rangeForm.date_to} className="btn-primary">
                {savingAbsence ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('employeesPage.absences.add')}
              </button>
            )}
          </div>
          {absenceError && <div className="text-xs text-red-500">{absenceError}</div>}
          {rangeSummary && <div className="text-xs text-emerald-600">{rangeSummary}</div>}
        </div>
      )}

      {absences.length > 0 && (
        <div className="flex justify-end mb-2">
          <PageExportActions
            title={t('employeesPage.absences.documentTitle', { name: employeeName })}
            documentKey="employee_absences_list"
            records={absences}
            documentLayouts={documentLayouts}
            documentSettings={documentSettings}
          />
        </div>
      )}

      <div className="divide-y divide-theme">
        {absences.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-base-color">{formatDate(entry.date)}</div>
              <div className="text-xs text-muted-color mt-1">{entry.note}</div>
            </div>
            <div className="text-xs text-muted-color">{entry.created_by_name}</div>
          </div>
        ))}
        {absences.length === 0 && (
          <div className="py-8 text-center text-muted-color">{t('employeesPage.absences.empty')}</div>
        )}
      </div>
    </div>
  )
}

function SalaryHistoryTab({ employeeId, employeeName, t }) {
  const { layouts: documentLayouts, documentSettings } = useDocumentLayouts()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/salary-runs', { params: { employee_user_id: employeeId } })
      .then((response) => setRuns(Array.isArray(response.data) ? response.data : []))
      .finally(() => setLoading(false))
  }, [employeeId])

  if (loading) return <PageLoader />

  return (
    <div className="space-y-4">
      {runs.length > 0 && (
        <div className="flex justify-end">
          <PageExportActions
            title={t('employeesPage.salaryHistory.documentTitle', { name: employeeName })}
            documentKey="salary_runs_list"
            records={runs}
            documentLayouts={documentLayouts}
            documentSettings={documentSettings}
          />
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr>
            {[
              t('employeesPage.salaryHistory.period'), t('employeesPage.salaryHistory.grossPay'),
              t('employeesPage.salaryHistory.netPay'), t('employeesPage.salaryHistory.status'), t('employeesPage.salaryHistory.actions'),
            ].map((heading) => <th key={heading} className="pb-3 pr-4 text-left">{heading}</th>)}
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="table-row">
              <td className="py-2 pr-4">{String(run.period_month).padStart(2, '0')}/{run.period_year}</td>
              <td className="py-2 pr-4">{formatCurrency(run.gross_pay)}</td>
              <td className="py-2 pr-4 font-semibold">{formatCurrency(run.net_pay)}</td>
              <td className="py-2 pr-4">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  run.status === 'paid' ? 'text-emerald-600' : run.status === 'finalized' ? 'text-blue-600' : 'text-amber-600'
                }`} style={{ background: 'var(--surface-2)' }}>
                  {t(`salaryRunsPage.statuses.${run.status}`)}
                </span>
              </td>
              <td className="py-2">
                <RowDocumentActions
                  documentKey="salary_run_item"
                  record={run}
                  documentLayouts={documentLayouts}
                  documentSettings={documentSettings}
                  title={t('salaryRunsPage.documentTitle', { name: employeeName, period: `${String(run.period_month).padStart(2, '0')}/${run.period_year}` })}
                  filename={`fiche_de_paie_${employeeId}_${run.period_year}_${String(run.period_month).padStart(2, '0')}`}
                />
              </td>
            </tr>
          ))}
          {runs.length === 0 && (
            <tr><td colSpan={5} className="py-12 text-center text-muted-color">{t('employeesPage.salaryHistory.empty')}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function NotesTab({ employeeId, canEdit, t }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get(`/employees/${employeeId}/notes`).then((response) => {
      setNotes(Array.isArray(response.data) ? response.data : [])
    }).finally(() => setLoading(false))
  }

  useEffect(load, [employeeId])

  const submit = async () => {
    if (!note.trim()) return
    setSaving(true)

    try {
      await api.post(`/employees/${employeeId}/notes`, { note })
      setNote('')
      load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div className="rounded-2xl px-4 py-3 text-xs text-secondary-color" style={{ background: 'var(--surface-2)' }}>
        {t('employeesPage.notes.internalHint')}
      </div>

      {canEdit && (
        <div className="flex items-start gap-3">
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder={t('employeesPage.notes.placeholder')} className="flex-1" />
          <button onClick={submit} disabled={saving || !note.trim()} className="btn-primary">
            {t('employeesPage.notes.add')}
          </button>
        </div>
      )}

      <div className="divide-y divide-theme">
        {notes.map((entry) => (
          <div key={entry.id} className="py-3">
            <div className="text-sm text-base-color">{entry.note}</div>
            <div className="text-xs text-muted-color mt-1">{entry.author_name} · {formatDateTime(entry.created_at)}</div>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="py-12 text-center text-muted-color">{t('employeesPage.notes.empty')}</div>
        )}
      </div>
    </div>
  )
}

function PerformanceTab({ employeeId, t }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/employees/${employeeId}/performance`).then((response) => setData(response.data)).finally(() => setLoading(false))
  }, [employeeId])

  if (loading || !data) return <PageLoader />

  const cards = [
    { key: 'sessionCount', value: data.session_count, icon: 'fa-route' },
    { key: 'invoiceCount', value: data.invoice_count, icon: 'fa-file-invoice' },
    { key: 'totalSold', value: formatCurrency(data.total_sold), icon: 'fa-sack-dollar' },
    { key: 'profitTotal', value: formatCurrency(data.profit_total), icon: 'fa-chart-line' },
    { key: 'creditGiven', value: formatCurrency(data.credit_given), icon: 'fa-hand-holding-dollar' },
    { key: 'creditCollected', value: formatCurrency(data.credit_collected), icon: 'fa-money-bill-transfer' },
    { key: 'lateSessionCount', value: data.late_session_count, icon: 'fa-clock' },
  ]

  return (
    <div>
      <div className="text-xs text-muted-color mb-4">
        {t('employeesPage.performance.expectedStart', { time: data.expected_start_time })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.key} className="rounded-2xl p-4" style={{ background: 'var(--surface-2)' }}>
            <i className={`fa-solid ${card.icon} text-sm`} style={{ color: '#0d9488' }} />
            <div className="text-xl font-bold text-base-color mt-2">{card.value}</div>
            <div className="text-xs text-secondary-color mt-1">{t(`employeesPage.performance.${card.key}`)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
