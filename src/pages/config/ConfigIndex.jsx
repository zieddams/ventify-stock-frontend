import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import { PageLoader } from '../../components/Spinner'
import { APP_BASE_PATH } from '../../utils/appPaths'

const REF_TYPES = [
  { key: 'categories',   label: 'Catégories',   apiType: 'category'    },
  { key: 'units',        label: 'Unités',        apiType: 'unit'        },
  { key: 'governorates', label: 'Gouvernorats',  apiType: 'governorate' },
]

const EXPENSE_CATS = [
  { key: 'sfbt',      label: 'SFBT',            icon: 'fa-solid fa-bottle-water',       color: '#0d9488' },
  { key: 'sostem',    label: 'SOSTEM',           icon: 'fa-solid fa-building-columns',   color: '#3b82f6' },
  { key: 'huile',     label: 'Huile',            icon: 'fa-solid fa-droplet',            color: '#f59e0b' },
  { key: 'eau_karim', label: 'Eau Karim',        icon: 'fa-solid fa-glass-water',        color: '#06b6d4' },
  { key: 'charges',   label: 'Charges (CNSS…)', icon: 'fa-solid fa-file-invoice-dollar', color: '#8b5cf6' },
  { key: 'divers',    label: 'Divers',           icon: 'fa-solid fa-ellipsis',           color: '#64748b' },
]

function PingBadge({ status, latency }) {
  if (status === 'idle')    return <span className="badge badge-gray">—</span>
  if (status === 'testing') return <span className="badge badge-blue"><i className="fa-solid fa-spinner fa-spin mr-1" />Test…</span>
  if (status === 'ok')      return <span className="badge badge-green"><i className="fa-solid fa-check mr-1" />{latency}ms</span>
  return                           <span className="badge badge-red"><i className="fa-solid fa-xmark mr-1" />Échec</span>
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs text-muted-color w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-base-color ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value ?? '—'}</span>
    </div>
  )
}

export default function ConfigIndex() {
  const [tab, setTab] = useState('app')

  const TABS = [
    { key: 'app',        icon: 'fa-solid fa-sliders',  label: 'Application'  },
    { key: 'references', icon: 'fa-solid fa-list',     label: 'Référentiels' },
    { key: 'system',     icon: 'fa-solid fa-server',   label: 'Système'      },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-base-color tracking-tight">Configuration</h1>
        <p className="text-sm text-muted-color mt-0.5">Paramètres de l'application El Irtiwaa</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-theme">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-muted-color hover:text-base-color'
            }`}>
            <i className={`${t.icon} text-xs`} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'app'        && <AppTab />}
      {tab === 'references' && <ReferencesTab />}
      {tab === 'system'     && <SystemTab />}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   APP TAB
════════════════════════════════════════════════════════════════════════ */
function AppTab() {
  const [swaggerUrl,   setSwaggerUrl]   = useState('')
  const [swaggerSaved, setSwaggerSaved] = useState(false)
  const [pingStatus,   setPingStatus]   = useState('idle')
  const [pingLatency,  setPingLatency]  = useState(null)
  const pingRef = useRef()
  const frontendUrl = APP_BASE_PATH === '/'
    ? `${window.location.origin}/`
    : `${window.location.origin}${APP_BASE_PATH}`

  const saveSwagger = async () => {
    try {
      await api.post('/config', { type: 'swagger_url', value: swaggerUrl })
      setSwaggerSaved(true)
      setTimeout(() => setSwaggerSaved(false), 3000)
    } catch {}
  }

  const runPing = async () => {
    setPingStatus('testing')
    const t0 = Date.now()
    try {
      await api.get('/auth/me')
      setPingLatency(Date.now() - t0)
      setPingStatus('ok')
    } catch {
      setPingStatus('error')
    }
    clearTimeout(pingRef.current)
    pingRef.current = setTimeout(() => setPingStatus('idle'), 8000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Swagger */}
      <div className="card">
        <h2 className="text-sm font-semibold text-base-color mb-4 flex items-center gap-2">
          <i className="fa-solid fa-book-open text-teal-500" />
          Documentation API (Swagger)
        </h2>
        <div className="flex gap-2">
          <input type="url" value={swaggerUrl} onChange={e => setSwaggerUrl(e.target.value)}
            placeholder="https://irtiwaa.ziedtech.com/docs/api" className="flex-1" />
          {swaggerUrl && (
            <a href={swaggerUrl} target="_blank" rel="noopener noreferrer"
              className="btn-ghost px-3 flex-shrink-0" title="Ouvrir">
              <i className="fa-solid fa-arrow-up-right-from-square" />
            </a>
          )}
          <button onClick={saveSwagger} className="btn-primary flex-shrink-0 px-4">
            {swaggerSaved ? <><i className="fa-solid fa-check" /> Enregistré</> : 'Enregistrer'}
          </button>
        </div>
        {swaggerUrl && (
          <div className="mt-3 rounded-xl overflow-hidden border border-theme" style={{ height: 400 }}>
            <iframe src={swaggerUrl} className="w-full h-full" title="Swagger UI" />
          </div>
        )}
      </div>

      {/* Connection test */}
      <div className="card">
        <h2 className="text-sm font-semibold text-base-color mb-4 flex items-center gap-2">
          <i className="fa-solid fa-plug text-teal-500" />
          Test de connexion API
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-muted-color mb-1">Endpoint testé</div>
            <div className="text-sm font-mono text-secondary-color rounded-lg px-3 py-2 border border-theme select-all"
              style={{ background: 'var(--surface-2)' }}>
              {api.defaults?.baseURL ?? '/api/v1'}/auth/me
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <PingBadge status={pingStatus} latency={pingLatency} />
            <button onClick={runPing} disabled={pingStatus === 'testing'}
              className="btn-secondary text-xs py-1.5">
              <i className="fa-solid fa-bolt" /> Tester
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl px-3 py-2.5 border border-theme" style={{ background: 'var(--surface-2)' }}>
            <div className="text-xs text-muted-color mb-1">URL de base API</div>
            <div className="text-xs font-mono text-base-color break-all">{window.location.origin}/api/v1</div>
          </div>
          <div className="rounded-xl px-3 py-2.5 border border-theme" style={{ background: 'var(--surface-2)' }}>
            <div className="text-xs text-muted-color mb-1">Frontend</div>
            <div className="text-xs font-mono text-base-color break-all">{frontendUrl}</div>
          </div>
        </div>
      </div>

      {/* Mail info */}
      <div className="card">
        <h2 className="text-sm font-semibold text-base-color mb-4 flex items-center gap-2">
          <i className="fa-solid fa-envelope text-teal-500" />
          Messagerie système (OVH Zimbra)
        </h2>
        <InfoRow label="Expéditeur"   value="noreplay@ziedtech.com" mono />
        <InfoRow label="Serveur SMTP" value="ssl0.ovh.net : 465 (SSL)" mono />
        <InfoRow label="Domaine"      value="ziedtech.com" />
        <InfoRow label="Usage"        value="Alertes stock bas, rapports quotidiens, notifications admin" />
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   REFERENCES TAB — self-contained, own sub-tab & modal state
════════════════════════════════════════════════════════════════════════ */
function ReferencesTab() {
  const [sub,     setSub]     = useState('categories')
  const [data,    setData]    = useState({ categories: [], units: [], governorates: [] })
  const [loading, setLoading] = useState(false)
  const [modal,   setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form,    setForm]    = useState({ value: '' })
  const [saving,  setSaving]  = useState(false)
  const [errors,  setErrors]  = useState({})

  const currentType = REF_TYPES.find(t => t.key === sub)

  const loadData = async () => {
    setLoading(true)
    try {
      const [catRes, unitRes, govRes] = await Promise.all([
        api.get('/config/category'),
        api.get('/config/unit'),
        api.get('/config/governorate'),
      ])
      setData({ categories: catRes.data, units: unitRes.data, governorates: govRes.data })
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const openAdd = () => {
    setEditItem(null)
    setForm({ value: '' })
    setErrors({})
    setModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ value: item.value })
    setErrors({})
    setModal(true)
  }

  const saveItem = async () => {
    setSaving(true); setErrors({})
    try {
      if (editItem) {
        await api.put(`/config/${editItem.id}`, { type: currentType?.apiType, value: form.value })
      } else {
        await api.post('/config', { type: currentType?.apiType, value: form.value })
      }
      setModal(false); loadData()
    } catch (e) {
      setErrors(e.response?.data?.errors ?? {})
    } finally { setSaving(false) }
  }

  const del = async (item) => {
    if (!confirm(`Supprimer "${item.value}" ?`)) return
    await api.delete(`/config/${item.id}`)
    loadData()
  }

  const items = data[sub] ?? []

  return (
    <div>
      {/* Sub-tab pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {REF_TYPES.map(t => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
              sub === t.key
                ? 'bg-teal-600 text-white border-teal-600'
                : 'border-theme text-muted-color hover:text-base-color hover:border-teal-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Expense categories (always visible) */}
      <div className="mb-5 card">
        <h2 className="text-sm font-semibold text-base-color mb-3 flex items-center gap-2">
          <i className="fa-solid fa-tags text-teal-500" />
          Catégories de dépenses
          <span className="text-xs text-muted-color font-normal ml-1">(fixes — BENEFICES)</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EXPENSE_CATS.map(c => (
            <div key={c.key} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 border border-theme"
              style={{ background: 'var(--surface-2)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: c.color + '18' }}>
                <i className={`${c.icon} text-xs`} style={{ color: c.color }} />
              </div>
              <div>
                <div className="text-sm font-semibold text-base-color">{c.label}</div>
                <div className="text-xs font-mono text-muted-color">{c.key}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reference list card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-base-color">
            {currentType?.label} ({items.length})
          </h2>
          <button onClick={openAdd} className="btn-primary text-xs">
            <i className="fa-solid fa-plus" /> Ajouter
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <i className="fa-solid fa-spinner fa-spin text-muted-color text-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {items.map(item => (
              <div key={item.id}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 border border-theme gap-2"
                style={{ background: 'var(--surface-2)' }}>
                <span className="text-sm text-base-color truncate">{item.value}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(item)}
                    className="p-1 rounded-lg text-muted-color hover:text-teal-600 transition-colors"
                    title="Modifier">
                    <i className="fa-solid fa-pen text-xs" />
                  </button>
                  <button onClick={() => del(item)}
                    className="p-1 rounded-lg text-muted-color hover:text-red-500 transition-colors"
                    title="Supprimer">
                    <i className="fa-solid fa-xmark text-xs" />
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-color text-sm">
                <i className="fa-solid fa-inbox text-2xl mb-2 block opacity-40" />
                Aucun élément
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editItem ? `Modifier — ${currentType?.label}` : `Ajouter — ${currentType?.label}`}
        size="sm">
        <div className="space-y-4">
          <FormField label="Valeur" error={errors.value?.[0]} required>
            <input value={form.value}
              onChange={e => setForm({ value: e.target.value })}
              placeholder="Nouvelle valeur…" autoFocus />
          </FormField>
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={saveItem} disabled={saving} className="btn-primary">
              {saving ? <i className="fa-solid fa-spinner fa-spin" /> : (editItem ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   SYSTEM TAB
════════════════════════════════════════════════════════════════════════ */
function SystemTab() {
  const [sysInfo, setSysInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadSys = async () => {
    setLoading(true)
    try {
      const r = await api.get('/system/info')
      setSysInfo(r.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadSys() }, [])

  return (
    <div className="max-w-2xl space-y-6">
      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-muted-color" />
        </div>
      ) : sysInfo ? (
        <>
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-4 flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-teal-500" />
              État du système
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl px-4 py-3 flex items-center gap-2.5 border ${
                sysInfo.db_ok
                  ? 'border-emerald-200 dark:border-emerald-700/40'
                  : 'border-red-200'
              }`} style={{ background: sysInfo.db_ok ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)' }}>
                <i className={`fa-solid fa-database text-sm ${sysInfo.db_ok ? 'text-emerald-500' : 'text-red-500'}`} />
                <div>
                  <div className="text-xs font-semibold text-base-color">Base de données</div>
                  <div className={`text-xs ${sysInfo.db_ok ? 'text-emerald-600' : 'text-red-500'}`}>
                    {sysInfo.db_ok ? 'Connectée' : 'Erreur connexion'}
                  </div>
                </div>
              </div>
              <div className="rounded-xl px-4 py-3 flex items-center gap-2.5 border border-emerald-200 dark:border-emerald-700/40"
                style={{ background: 'rgba(16,185,129,0.06)' }}>
                <i className="fa-solid fa-server text-sm text-emerald-500" />
                <div>
                  <div className="text-xs font-semibold text-base-color">API Laravel</div>
                  <div className="text-xs text-emerald-600">Opérationnelle</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-4 flex items-center gap-2">
              <i className="fa-solid fa-microchip text-teal-500" />
              Environnement d'exécution
            </h2>
            <InfoRow label="Laravel"   value={`v${sysInfo.laravel}`} />
            <InfoRow label="PHP"       value={`v${sysInfo.php}`} />
            <InfoRow label="Env"       value={sysInfo.env} />
            <InfoRow label="Timezone"  value={sysInfo.timezone} />
            <InfoRow label="DB Driver" value={sysInfo.db_driver} />
            <InfoRow label="Cache"     value={sysInfo.cache} />
            <InfoRow label="Queue"     value={sysInfo.queue} />
            <InfoRow label="App URL"   value={sysInfo.app_url} mono />
            <InfoRow label="Web URL"   value={sysInfo.frontend_url} mono />
            <InfoRow label="Web Path"  value={sysInfo.frontend_path} mono />
            <InfoRow label="Mail Host" value={sysInfo.mail_host} mono />
            <InfoRow label="Mail From" value={sysInfo.mail_from} mono />
            <div className="pt-2 text-xs text-muted-color">
              Interrogé à : {new Date(sysInfo.timestamp).toLocaleString('fr-FR')}
            </div>
          </div>

          <button onClick={loadSys} className="btn-secondary text-sm">
            <i className="fa-solid fa-rotate-right" /> Actualiser
          </button>
        </>
      ) : (
        <div className="card text-center py-12">
          <i className="fa-solid fa-triangle-exclamation text-2xl text-amber-500 mb-2 block" />
          <p className="text-sm text-muted-color">Impossible de charger les infos système.</p>
          <button onClick={loadSys} className="btn-secondary text-sm mt-4">
            <i className="fa-solid fa-rotate-right" /> Réessayer
          </button>
        </div>
      )}
    </div>
  )
}

