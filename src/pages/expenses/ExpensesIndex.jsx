import { useEffect, useState } from 'react'
import api from '../../services/api'
import PageHeader from '../../components/PageHeader'

const CATEGORIES = [
  { value: 'sfbt',      label: 'SFBT',            color: '#0d9488' },
  { value: 'sostem',    label: 'SOSTEM',           color: '#3b82f6' },
  { value: 'huile',     label: 'Huile',            color: '#f59e0b' },
  { value: 'eau_karim', label: 'Eau Karim',        color: '#06b6d4' },
  { value: 'charges',   label: 'Charges (CNSS…)', color: '#8b5cf6' },
  { value: 'divers',    label: 'Divers',           color: '#64748b' },
]

const EMPTY = {
  expense_date: new Date().toISOString().slice(0, 10),
  category: 'divers', label: '', amount: '',
}

export default function ExpensesIndex() {
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [month,    setMonth]    = useState(new Date().toISOString().slice(0, 7))

  const load = () => {
    setLoading(true)
    api.get('/expenses', { params: { month } })
      .then(r => setExpenses(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [month])

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  const handleSubmit = async (ev) => {
    ev.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/expenses', form); setForm(EMPTY); load()
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors de l\'enregistrement')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await api.delete(`/expenses/${id}`); load()
  }

  const catInfo = (val) => CATEGORIES.find(c => c.value === val) ?? { label: val, color: '#64748b' }

  return (
    <div>
      <PageHeader title="Dépenses" subtitle="Enregistrement et suivi des charges" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add form */}
        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-4 flex items-center gap-2">
            <i className="fa-solid fa-plus text-teal-500" /> Nouvelle dépense
          </h2>
          {error && (
            <div className="text-sm mb-3 p-2.5 rounded-xl border"
              style={{ color: '#dc2626', background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Date</label>
              <input type="date" value={form.expense_date}
                onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Catégorie</label>
              <select value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Libellé</label>
              <input type="text" placeholder="Description…" value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-muted-color mb-1 font-medium">Montant (TND)</label>
              <input type="number" step="0.001" min="0" placeholder="0.000" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement…</> : <><i className="fa-solid fa-check" /> Enregistrer</>}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-base-color">Dépenses du mois</h2>
              <p className="text-xs text-muted-color mt-0.5">
                Total: <span className="font-mono font-semibold" style={{ color: '#ea580c' }}>{total.toFixed(3)} TND</span>
              </p>
            </div>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="text-sm" style={{ width: 'auto' }} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-color">
              <i className="fa-solid fa-spinner fa-spin mr-2" /> Chargement…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Date', 'Catégorie', 'Libellé', 'Montant', ''].map(h => (
                      <th key={h} className={`pb-3 pr-3 ${h === 'Montant' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center">
                      <i className="fa-solid fa-receipt text-3xl text-muted-color opacity-30 mb-2 block" />
                      <p className="text-muted-color text-sm">Aucune dépense ce mois</p>
                    </td></tr>
                  )}
                  {expenses.map(e => {
                    const cat = catInfo(e.category?.value ?? e.category)
                    return (
                      <tr key={e.id} className="table-row">
                        <td className="py-3 pr-3 text-secondary-color text-xs font-mono">
                          {new Date(e.expense_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="text-xs font-semibold px-2 py-1 rounded-lg"
                            style={{ background: cat.color + '18', color: cat.color }}>
                            {cat.label}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-base-color">{e.label}</td>
                        <td className="py-3 pr-3 text-right font-mono font-bold text-sm" style={{ color: '#ea580c' }}>
                          {Number(e.amount).toFixed(3)}
                        </td>
                        <td className="py-3 text-right">
                          <button onClick={() => handleDelete(e.id)}
                            className="text-muted-color hover:text-red-500 transition-colors p-1">
                            <i className="fa-solid fa-trash text-xs" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
