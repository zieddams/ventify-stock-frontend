import { useEffect, useState } from 'react'
import Modal from './Modal'
import { useI18n } from '../contexts/I18nContext'
import { useDepots } from '../hooks/useDepots'
import api from '../services/api'

export default function ManualCreditModal({ open, onClose, onCreated }) {
  const { t } = useI18n()
  const { depots } = useDepots()
  const [customers, setCustomers] = useState([])
  const [customer, setCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [creditDate, setCreditDate] = useState('')
  const [depotId, setDepotId] = useState('')
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setCustomers([])
      setCustomer(null)
      setCustomerSearch('')
      setAmount('')
      setCreditDate('')
      setDepotId('')
      setLabel('')
      setNote('')
      setError('')
      return undefined
    }

    let active = true

    api.get('/customers')
      .then((response) => {
        if (active) {
          setCustomers(Array.isArray(response.data) ? response.data : [])
        }
      })
      .catch(() => {
        if (active) {
          setError(t('credit.manualCredit.loadFailed'))
        }
      })

    return () => {
      active = false
    }
  }, [open, t])

  const filteredCustomers = customers.filter((item) => {
    if (!customerSearch.trim()) {
      return true
    }

    const query = customerSearch.trim().toLowerCase()
    return item.name?.toLowerCase().includes(query) || item.phone?.includes(query)
  })

  const canSubmit = Boolean(customer?.id) && Number(amount) > 0

  const submit = async () => {
    if (!canSubmit) {
      return
    }

    setSaving(true)
    setError('')

    try {
      await api.post(`/customers/${customer.id}/manual-credit`, {
        amount: Number(amount),
        label: label.trim() || null,
        note: note.trim() || null,
        credit_date: creditDate || null,
        depot_id: depotId || null,
      })

      await onCreated?.()
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.message || t('credit.manualCredit.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('credit.manualCredit.title')} size="md">
      <p className="text-xs text-muted-color mb-4">{t('credit.manualCredit.subtitle')}</p>

      {error && (
        <div
          className="rounded-xl border px-4 py-3 text-sm mb-4"
          style={{ borderColor: 'rgba(239,68,68,0.24)', background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      <div className="mb-3">
        <label className="block text-xs text-muted-color mb-1 font-medium">{t('credit.manualCredit.fields.customer')}</label>
        {customer ? (
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'rgba(13,148,136,0.05)', borderColor: 'rgba(13,148,136,0.2)' }}>
            <div>
              <div className="font-semibold text-base-color">{customer.name}</div>
              <div className="text-secondary-color text-sm mt-0.5">{customer.phone}</div>
            </div>
            <button type="button" onClick={() => setCustomer(null)} className="text-xs text-muted-color hover:text-base-color transition-colors">
              <i className="fa-solid fa-pen text-xs mr-1" /> {t('invoiceCreate.customer.change')}
            </button>
          </div>
        ) : (
          <div>
            <input
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              placeholder={t('credit.manualCredit.placeholders.customer')}
              className="mb-2"
            />
            <div className="max-h-40 overflow-y-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              {filteredCustomers.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCustomer(item)
                    setCustomerSearch('')
                  }}
                  className="w-full px-3 py-2.5 text-left transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div className="text-sm font-medium text-base-color">{item.name}</div>
                  <div className="text-xs text-muted-color">{item.phone}</div>
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="px-3 py-6 text-center text-muted-color text-sm">{t('invoiceCreate.customer.empty')}</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-muted-color mb-1 font-medium">{t('credit.manualCredit.fields.amount')}</label>
          <input type="number" step="0.001" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-color mb-1 font-medium">{t('credit.manualCredit.fields.date')}</label>
          <input type="date" value={creditDate} onChange={(event) => setCreditDate(event.target.value)} />
        </div>
      </div>

      {depots.length > 0 && (
        <div className="mb-3">
          <label className="block text-xs text-muted-color mb-1 font-medium">{t('credit.manualCredit.fields.depot')}</label>
          <select value={depotId} onChange={(event) => setDepotId(event.target.value)}>
            <option value="">{t('credit.manualCredit.placeholders.depot')}</option>
            {depots.map((depot) => (
              <option key={depot.id} value={depot.id}>{depot.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-3">
        <label className="block text-xs text-muted-color mb-1 font-medium">{t('credit.manualCredit.fields.label')}</label>
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t('credit.manualCredit.placeholders.label')} />
      </div>

      <div className="mb-4">
        <label className="block text-xs text-muted-color mb-1 font-medium">{t('credit.manualCredit.fields.note')}</label>
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('credit.manualCredit.placeholders.note')} />
      </div>

      <button type="button" onClick={submit} disabled={saving || !canSubmit} className="btn-primary w-full">
        {saving
          ? <><i className="fa-solid fa-spinner fa-spin" /> {t('credit.manualCredit.saving')}</>
          : <><i className="fa-solid fa-circle-plus" /> {t('credit.manualCredit.submit')}</>}
      </button>
    </Modal>
  )
}
