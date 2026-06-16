import { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import { PaymentStatusBadge } from '../../components/Badge'

const EMPTY = { name: '', phone: '', address: '', wilaya: '', tax_id: '', email: '', zone_id: '', credit_limit: '' }
const fmt = (n) => parseFloat(n ?? 0).toFixed(3)

export default function CustomersIndex() {
  const [customers,    setCustomers]    = useState([])
  const [governorates, setGovernorates] = useState([])
  const [zones,        setZones]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [modal,        setModal]        = useState(false)
  const [form,         setForm]         = useState(EMPTY)
  const [editing,      setEditing]      = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [errors,       setErrors]       = useState({})
  const [ledgerCustomer, setLedgerCustomer] = useState(null)
  const [ledger,         setLedger]         = useState(null)
  const [pay,   setPay]   = useState({ amount: '', method: 'cash', invoice_id: '', note: '' })
  const [paying, setPaying] = useState(false)

  const load = async () => {
    const [cRes, gRes, zRes] = await Promise.all([
      api.get('/customers'),
      api.get('/config/governorate'),
      api.get('/zones'),
    ])
    setCustomers(cRes.data); setGovernorates(gRes.data); setZones(zRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setErrors({}); setModal(true) }
  const openEdit   = (c) => {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone ?? '', address: c.address ?? '', wilaya: c.wilaya ?? '',
      tax_id: c.tax_id ?? '', email: c.email ?? '', zone_id: c.zone_id ?? '', credit_limit: c.credit_limit ?? '' })
    setErrors({}); setModal(true)
  }

  const save = async () => {
    setSaving(true); setErrors({})
    try {
      const payload = { ...form,
        zone_id:      form.zone_id      === '' ? null : Number(form.zone_id),
        credit_limit: form.credit_limit === '' ? null : Number(form.credit_limit),
      }
      if (editing) await api.put(`/customers/${editing.id}`, payload)
      else         await api.post('/customers', payload)
      setModal(false); load()
    } catch (e) { setErrors(e.response?.data?.errors ?? {}) }
    finally { setSaving(false) }
  }

  const del = async (c) => {
    if (!confirm(`Supprimer "${c.name}" ?`)) return
    await api.delete(`/customers/${c.id}`); load()
  }

  const openLedger = async (c) => {
    setLedgerCustomer(c); setLedger(null)
    setPay({ amount: '', method: 'cash', invoice_id: '', note: '' })
    const res = await api.get(`/customers/${c.id}/ledger`)
    setLedger(res.data)
  }

  const submitPayment = async () => {
    if (!pay.amount || Number(pay.amount) <= 0) return
    setPaying(true)
    try {
      await api.post('/payments', {
        customer_id: ledgerCustomer.id,
        invoice_id:  pay.invoice_id || null,
        amount:      Number(pay.amount),
        method:      pay.method,
        note:        pay.note || null,
      })
      const res = await api.get(`/customers/${ledgerCustomer.id}/ledger`)
      setLedger(res.data)
      setPay({ amount: '', method: 'cash', invoice_id: '', note: '' })
      load()
    } finally { setPaying(false) }
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.wilaya?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${customers.length} client(s)`}
        action={<button onClick={openCreate} className="btn-primary"><i className="fa-solid fa-plus" /> Nouveau client</button>}
      />

      <div className="card">
        <div className="mb-4">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-color text-sm" />
            <input placeholder="Rechercher un client…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Nom', 'Téléphone', 'Gouvernorat', 'Zone', 'Solde crédit', 'Actions'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="py-3 pr-4 font-semibold text-base-color">{c.name}</td>
                  <td className="py-3 pr-4 text-secondary-color font-mono text-xs">{c.phone ?? '—'}</td>
                  <td className="py-3 pr-4 text-secondary-color text-xs">{c.wilaya ?? '—'}</td>
                  <td className="py-3 pr-4 text-secondary-color text-xs">{c.zone?.name ?? '—'}</td>
                  <td className="py-3 pr-4 font-bold font-mono text-sm"
                    style={{ color: parseFloat(c.credit_balance) > 0 ? '#dc2626' : '#059669' }}>
                    {fmt(c.credit_balance)} TND
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openLedger(c)}
                        className="text-xs font-medium" style={{ color: '#8b5cf6' }}>
                        <i className="fa-solid fa-credit-card mr-1" />Crédit
                      </button>
                      <button onClick={() => openEdit(c)}
                        className="text-xs font-medium" style={{ color: '#0d9488' }}>
                        <i className="fa-solid fa-pen mr-1" />Modifier
                      </button>
                      <button onClick={() => del(c)}
                        className="text-xs font-medium text-red-500 hover:text-red-700">
                        <i className="fa-solid fa-trash-can mr-1" />Suppr.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center">
                  <i className="fa-solid fa-users text-3xl text-muted-color opacity-30 mb-2 block" />
                  <p className="text-muted-color text-sm">Aucun client</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Modifier le client' : 'Nouveau client'}>
        <div className="space-y-4">
          <FormField label="Nom" error={errors.name?.[0]} required>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom du client" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Téléphone" error={errors.phone?.[0]}>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+216 XX XXX XXX" />
            </FormField>
            <FormField label="Email" error={errors.email?.[0]}>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="client@example.com" />
            </FormField>
          </div>
          <FormField label="Adresse" error={errors.address?.[0]}>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Adresse complète" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Gouvernorat" error={errors.wilaya?.[0]}>
              <select value={form.wilaya} onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))}>
                <option value="">Sélectionner…</option>
                {governorates.map(g => <option key={g.id} value={g.value}>{g.value}</option>)}
              </select>
            </FormField>
            <FormField label="Zone de vente" error={errors.zone_id?.[0]}>
              <select value={form.zone_id} onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}>
                <option value="">Aucune</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Matricule fiscal" error={errors.tax_id?.[0]}>
              <input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} placeholder="0000000/A/X/000" />
            </FormField>
            <FormField label="Plafond crédit (TND)" error={errors.credit_limit?.[0]}>
              <input type="number" step="0.001" min="0" value={form.credit_limit}
                onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} placeholder="Optionnel" />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement…</> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Ledger / credit modal */}
      <Modal open={!!ledgerCustomer} onClose={() => setLedgerCustomer(null)}
        title={`Crédit — ${ledgerCustomer?.name ?? ''}`} size="lg">
        {!ledger ? <PageLoader /> : (
          <div className="space-y-4">
            {/* Balance banner */}
            <div className="flex items-center justify-between p-4 rounded-xl border"
              style={{
                background:   parseFloat(ledger.customer.credit_balance) > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                borderColor:  parseFloat(ledger.customer.credit_balance) > 0 ? 'rgba(239,68,68,0.2)'  : 'rgba(16,185,129,0.2)',
              }}>
              <div>
                <div className="text-xs text-muted-color mb-0.5">Solde dû</div>
                <div className="text-xs text-secondary-color">{ledger.open_invoices?.length ?? 0} facture(s) ouverte(s)</div>
              </div>
              <div className="text-2xl font-bold"
                style={{ color: parseFloat(ledger.customer.credit_balance) > 0 ? '#dc2626' : '#059669' }}>
                {fmt(ledger.customer.credit_balance)} <span className="text-sm font-normal text-muted-color">TND</span>
              </div>
            </div>

            {/* Record payment */}
            <div className="rounded-xl p-4 border border-theme" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs font-bold text-muted-color uppercase tracking-wider mb-3">
                <i className="fa-solid fa-circle-plus mr-1.5" style={{ color: '#0d9488' }} />
                Encaisser un paiement
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input type="number" step="0.001" min="0" placeholder="Montant (TND)"
                  value={pay.amount} onChange={e => setPay(p => ({ ...p, amount: e.target.value }))} />
                <select value={pay.method} onChange={e => setPay(p => ({ ...p, method: e.target.value }))}>
                  <option value="cash">Espèces</option>
                  <option value="cheque">Chèque</option>
                  <option value="transfer">Virement</option>
                </select>
              </div>
              <select className="mb-3" value={pay.invoice_id}
                onChange={e => setPay(p => ({ ...p, invoice_id: e.target.value }))}>
                <option value="">Affecter automatiquement (plus ancienne d'abord)</option>
                {ledger.open_invoices?.map(i => (
                  <option key={i.id} value={i.id}>{i.number} — dû {fmt(i.total - i.paid_amount)}</option>
                ))}
              </select>
              <button onClick={submitPayment} disabled={paying || !pay.amount} className="btn-primary w-full">
                {paying ? <><i className="fa-solid fa-spinner fa-spin" /> Encaissement…</> : <><i className="fa-solid fa-circle-check" /> Encaisser</>}
              </button>
            </div>

            {/* Open invoices */}
            {ledger.open_invoices?.length > 0 && (
              <div>
                <div className="text-xs font-bold text-muted-color uppercase tracking-wider mb-2">
                  Factures ouvertes
                </div>
                <div className="space-y-1">
                  {ledger.open_invoices.map(i => (
                    <div key={i.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-xl border border-theme"
                      style={{ background: 'var(--surface-2)' }}>
                      <span className="text-secondary-color font-mono text-xs">{i.number}</span>
                      <div className="flex items-center gap-3">
                        <PaymentStatusBadge status={i.payment_status} />
                        <span className="font-bold font-mono text-xs" style={{ color: '#dc2626' }}>
                          {fmt(i.total - i.paid_amount)} TND
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ledger history */}
            <div>
              <div className="text-xs font-bold text-muted-color uppercase tracking-wider mb-2">
                Historique des mouvements
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border border-theme"
                style={{ background: 'var(--surface-2)' }}>
                {ledger.transactions?.map(t => (
                  <div key={t.id}
                    className="flex items-center justify-between text-xs py-2.5 px-3"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span className="text-secondary-color">
                        {new Date(t.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="mx-1.5 text-muted-color">·</span>
                      <span className="text-secondary-color">
                        {t.type === 'charge' ? 'Facture' : t.type === 'payment' ? 'Paiement' : 'Ajustement'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold font-mono"
                        style={{ color: parseFloat(t.amount) >= 0 ? '#dc2626' : '#059669' }}>
                        {parseFloat(t.amount) >= 0 ? '+' : ''}{fmt(t.amount)}
                      </span>
                      <span className="text-muted-color w-24 text-right font-mono">
                        solde {fmt(t.balance_after)}
                      </span>
                    </div>
                  </div>
                ))}
                {!ledger.transactions?.length && (
                  <div className="text-center text-muted-color text-sm py-6">Aucun mouvement</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
