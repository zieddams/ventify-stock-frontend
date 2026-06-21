import { useEffect, useMemo, useState } from 'react'
import DepotScopeControls from '../../components/DepotScopeControls'
import Modal from '../../components/Modal'
import FormField from '../../components/FormField'
import { PageLoader } from '../../components/Spinner'
import { useDepots } from '../../hooks/useDepots'
import api from '../../services/api'

function fmt(value) {
  return Number(value ?? 0).toFixed(3)
}

function formatDateTime(value) {
  if (!value) return 'Non renseigne'
  return new Date(value).toLocaleString('fr-FR')
}

function statusMeta(routeSession) {
  if (!routeSession) {
    return {
      label: 'Sans session',
      color: '#64748b',
      bg: 'rgba(100,116,139,0.10)',
      icon: 'fa-solid fa-route',
    }
  }

  if (routeSession.status === 'open') {
    return {
      label: 'Session ouverte',
      color: '#059669',
      bg: 'rgba(5,150,105,0.10)',
      icon: 'fa-solid fa-circle-dot',
    }
  }

  return {
    label: 'Session clôturée',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.10)',
    icon: 'fa-solid fa-flag-checkered',
  }
}

function emptyFleetForm() {
  return {
    id: null,
    name: '',
    plate: '',
    note: '',
    active: true,
    operational_status: 'ready',
    sort_order: 0,
  }
}

function emptyTransferForm() {
  return {
    user_id: '',
    product_id: '',
    qty: '',
    note: '',
  }
}

function emptySessionLine() {
  return {
    product_id: '',
    qty_loaded: '',
  }
}

function emptySessionForm() {
  return {
    rep_id: '',
    camion_id: '',
    lines: [emptySessionLine()],
  }
}

function emptyCloseForm() {
  return {
    route_session_id: '',
    cash_collected: '',
    credit_collected: '',
  }
}

export default function CamionsIndex() {
  const [camions, setCamions] = useState([])
  const [reps, setReps] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [fleetModal, setFleetModal] = useState(false)
  const [transferModal, setTransferModal] = useState(false)
  const [sessionModal, setSessionModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [fleetForm, setFleetForm] = useState(emptyFleetForm())
  const [transferForm, setTransferForm] = useState(emptyTransferForm())
  const [sessionForm, setSessionForm] = useState(emptySessionForm())
  const [closeForm, setCloseForm] = useState(emptyCloseForm())
  const [fleetErrors, setFleetErrors] = useState({})
  const [transferErrors, setTransferErrors] = useState({})
  const [sessionErrors, setSessionErrors] = useState({})
  const [closeErrors, setCloseErrors] = useState({})
  const [savingFleet, setSavingFleet] = useState(false)
  const [savingTransfer, setSavingTransfer] = useState(false)
  const [savingSession, setSavingSession] = useState(false)
  const [closingSession, setClosingSession] = useState(false)
  const [expanded, setExpanded] = useState({})
  const {
    depots,
    selectedValue: selectedDepotValue,
    setSelectedValue: setSelectedDepotValue,
    selectedDepotId,
    selectedDepot,
    canBrowseAll,
    scopeParams,
  } = useDepots({
    allowAll: false,
    storageKey: 'app-depot-scope',
  })

  const load = async ({ keepLoading = false } = {}) => {
    if (!keepLoading) {
      setLoading(true)
    }

    try {
      const [camionResponse, repResponse, productResponse] = await Promise.all([
        api.get('/camions', { params: { include_inactive: 1 } }),
        api.get('/camion/all', { params: scopeParams }),
        api.get('/products', { params: scopeParams }),
      ])

      setCamions(Array.isArray(camionResponse.data) ? camionResponse.data : [])
      setReps(Array.isArray(repResponse.data) ? repResponse.data : [])
      setProducts(Array.isArray(productResponse.data) ? productResponse.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [selectedDepotId])

  const totals = useMemo(() => {
    const physicalTotal = camions.length
    const activeTotal = camions.filter((camion) => camion.active).length
    const availableTotal = camions.filter((camion) => camion.active && camion.is_available).length
    const openSessions = reps.filter((rep) => rep.route_session?.status === 'open').length
    const stockQty = reps.reduce((sum, rep) => sum + Number(rep.total_qty ?? 0), 0)

    return {
      physicalTotal,
      activeTotal,
      availableTotal,
      openSessions,
      stockQty,
    }
  }, [camions, reps])

  const sessionLoadProducts = useMemo(() => (
    products.filter((product) => Number(product.depot_qty ?? 0) > 0)
  ), [products])

  const availableCamions = useMemo(() => (
    camions.filter((camion) => camion.active && camion.operational_status === 'ready' && camion.workflow_status !== 'in_session')
  ), [camions])

  const selectedRep = useMemo(() => (
    reps.find((entry) => String(entry.user?.id) === String(sessionForm.rep_id))
  ), [reps, sessionForm.rep_id])

  const openCreateFleetModal = () => {
    setFleetForm(emptyFleetForm())
    setFleetErrors({})
    setFleetModal(true)
  }

  const openEditFleetModal = (camion) => {
    setFleetForm({
      id: camion.id,
      name: camion.name ?? '',
      plate: camion.plate ?? '',
      note: camion.note ?? '',
      active: camion.active !== false,
      operational_status: camion.operational_status ?? 'ready',
      sort_order: camion.sort_order ?? 0,
    })
    setFleetErrors({})
    setFleetModal(true)
  }

  const saveFleet = async () => {
    setSavingFleet(true)
    setFleetErrors({})

    try {
      if (fleetForm.id) {
        await api.put(`/camions/${fleetForm.id}`, fleetForm)
      } else {
        await api.post('/camions', fleetForm)
      }

      setFleetModal(false)
      setFleetForm(emptyFleetForm())
      await load({ keepLoading: true })
    } catch (error) {
      setFleetErrors(error.response?.data?.errors ?? {})
    } finally {
      setSavingFleet(false)
    }
  }

  const toggleFleetStatus = async (camion) => {
    try {
      await api.patch(`/camions/${camion.id}/toggle`)
      await load({ keepLoading: true })
    } catch (error) {
      window.alert(error.response?.data?.message || 'Impossible de modifier le statut du camion.')
    }
  }

  const openTransfer = (rep = null) => {
    setTransferForm({
      user_id: rep?.user?.id ? String(rep.user.id) : '',
      product_id: '',
      qty: '',
      note: '',
    })
    setTransferErrors({})
    setTransferModal(true)
  }

  const openSession = ({ rep = null, camion = null } = {}) => {
    setSessionForm({
      rep_id: rep?.user?.id ? String(rep.user.id) : '',
      camion_id: camion?.id ? String(camion.id) : '',
      lines: [emptySessionLine()],
    })
    setSessionErrors({})
    setSessionModal(true)
  }

  const addSessionLine = () => {
    setSessionForm((current) => ({
      ...current,
      lines: [...current.lines, emptySessionLine()],
    }))
  }

  const updateSessionLine = (index, field, value) => {
    setSessionForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (
        lineIndex === index ? { ...line, [field]: value } : line
      )),
    }))
  }

  const removeSessionLine = (index) => {
    setSessionForm((current) => ({
      ...current,
      lines: current.lines.length === 1
        ? [emptySessionLine()]
        : current.lines.filter((_, lineIndex) => lineIndex !== index),
    }))
  }

  const saveSession = async () => {
    const validLines = sessionForm.lines
      .filter((line) => line.product_id && Number(line.qty_loaded) > 0)
      .map((line) => ({
        product_id: Number(line.product_id),
        qty_loaded: Number(line.qty_loaded),
      }))

    if (!sessionForm.rep_id || !sessionForm.camion_id || validLines.length === 0) {
      setSessionErrors({
        rep_id: !sessionForm.rep_id ? ['Le commercial est obligatoire.'] : undefined,
        camion_id: !sessionForm.camion_id ? ['Le camion est obligatoire.'] : undefined,
        lines: validLines.length === 0 ? ['Ajoutez au moins une ligne de chargement initial.'] : undefined,
      })
      return
    }

    setSavingSession(true)
    setSessionErrors({})

    try {
      await api.post('/route-sessions', {
        rep_id: Number(sessionForm.rep_id),
        camion_id: Number(sessionForm.camion_id),
        depot_id: selectedDepotId,
        lines: validLines,
      })

      setSessionModal(false)
      setSessionForm(emptySessionForm())
      await load({ keepLoading: true })
    } catch (error) {
      setSessionErrors(error.response?.data?.errors ?? {
        general: [error.response?.data?.message || 'Impossible d’ouvrir la session.'],
      })
    } finally {
      setSavingSession(false)
    }
  }

  const openCloseSession = (rep) => {
    setCloseForm({
      route_session_id: String(rep?.route_session?.id ?? ''),
      cash_collected: '',
      credit_collected: '',
    })
    setCloseErrors({})
    setCloseModal(true)
  }

  const saveCloseSession = async () => {
    if (!closeForm.route_session_id) {
      return
    }

    setClosingSession(true)
    setCloseErrors({})

    try {
      await api.post(`/route-sessions/${closeForm.route_session_id}/close`, {
        cash_collected: closeForm.cash_collected === '' ? 0 : Number(closeForm.cash_collected),
        credit_collected: closeForm.credit_collected === '' ? 0 : Number(closeForm.credit_collected),
      })

      setCloseModal(false)
      setCloseForm(emptyCloseForm())
      await load({ keepLoading: true })
    } catch (error) {
      setCloseErrors(error.response?.data?.errors ?? {
        general: [error.response?.data?.message || 'Impossible de clôturer la session.'],
      })
    } finally {
      setClosingSession(false)
    }
  }

  const saveTransfer = async () => {
    setSavingTransfer(true)
    setTransferErrors({})

    try {
      await api.post('/camion/refill', {
        ...transferForm,
        depot_id: selectedDepotId,
      })
      setTransferModal(false)
      setTransferForm(emptyTransferForm())
      await load({ keepLoading: true })
    } catch (error) {
      setTransferErrors(error.response?.data?.errors ?? {})
      if (error.response?.data?.message) {
        window.alert(error.response.data.message)
      }
    } finally {
      setSavingTransfer(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-base-color tracking-tight">Camions & sessions terrain</h1>
          <p className="text-sm text-muted-color mt-0.5">
            Camions physiques, affectation par session et stock embarqué des commerciaux{selectedDepot ? ` | Dépôt ${selectedDepot.name}` : ''}.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {canBrowseAll && (
            <DepotScopeControls
              depots={depots}
              selectedValue={selectedDepotValue}
              onChange={setSelectedDepotValue}
              label="Dépôt terrain"
            />
          )}
          <button onClick={() => openSession()} className="btn-secondary">
            <i className="fa-solid fa-play" /> Démarrer une session
          </button>
          <button onClick={() => openTransfer()} className="btn-secondary">
            <i className="fa-solid fa-truck-ramp-box" /> Charger un commercial
          </button>
          <button onClick={openCreateFleetModal} className="btn-primary">
            <i className="fa-solid fa-truck" /> Nouveau camion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          {
            label: 'Camions physiques',
            value: totals.physicalTotal,
            sub: `${totals.activeTotal} actif(s)`,
            icon: 'fa-solid fa-truck',
            color: '#0d9488',
          },
          {
            label: 'Camions disponibles',
            value: totals.availableTotal,
            sub: 'Sans session ouverte',
            icon: 'fa-solid fa-circle-check',
            color: '#2563eb',
          },
          {
            label: 'Sessions ouvertes',
            value: totals.openSessions,
            sub: `${reps.length} commercial(aux) suivis`,
            icon: 'fa-solid fa-route',
            color: '#8b5cf6',
          },
          {
            label: 'Stock embarqué',
            value: fmt(totals.stockQty),
            sub: 'Unites sur le terrain',
            icon: 'fa-solid fa-boxes-stacked',
            color: '#f59e0b',
          },
          {
            label: 'Alertes stock bas',
            value: reps.reduce((sum, rep) => sum + Number(rep.low_stock_count ?? 0), 0),
            sub: 'Seuils minimums atteints',
            icon: 'fa-solid fa-triangle-exclamation',
            color: '#ef4444',
          },
        ].map((card) => (
          <div key={card.label} className="card py-3 px-4 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${card.color}1a` }}
            >
              <i className={card.icon} style={{ color: card.color }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-color">{card.label}</div>
              <div className="text-sm font-bold text-base-color">{card.value}</div>
              <div className="text-[11px] text-muted-color mt-0.5">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xs font-semibold text-muted-color uppercase tracking-wider">
            <i className="fa-solid fa-truck mr-1.5" /> Camions physiques
          </h2>
          <span className="text-xs text-muted-color">{camions.length} fiche(s)</span>
        </div>

        {camions.length === 0 ? (
          <div className="card text-center py-12">
            <i className="fa-solid fa-truck text-3xl text-muted-color opacity-30 mb-2 block" />
            <p className="text-sm text-muted-color">Aucun camion physique n est configure pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {camions.map((camion) => {
              const assignment = camion.current_route_session

              return (
                <div key={camion.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: camion.active ? 'rgba(13,148,136,0.12)' : 'rgba(100,116,139,0.12)' }}
                      >
                        <i
                          className="fa-solid fa-truck text-base"
                          style={{ color: camion.active ? '#0d9488' : '#64748b' }}
                        />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-base-color">{camion.name}</h3>
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{
                              background: camion.active ? 'rgba(5,150,105,0.10)' : 'rgba(100,116,139,0.10)',
                              color: camion.active ? '#059669' : '#64748b',
                            }}
                          >
                            {camion.active ? 'Actif' : 'Inactif'}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{
                              background: camion.workflow_status === 'free'
                                ? 'rgba(5,150,105,0.10)'
                                : camion.workflow_status === 'in_session'
                                  ? 'rgba(37,99,235,0.10)'
                                  : camion.workflow_status === 'maintenance'
                                    ? 'rgba(217,119,6,0.10)'
                                    : 'rgba(100,116,139,0.10)',
                              color: camion.workflow_status === 'free'
                                ? '#059669'
                                : camion.workflow_status === 'in_session'
                                  ? '#2563eb'
                                  : camion.workflow_status === 'maintenance'
                                    ? '#d97706'
                                    : '#64748b',
                            }}
                          >
                            {camion.workflow_status_label}
                          </span>
                        </div>
                        <div className="text-xs text-muted-color mt-1">
                          {camion.plate || 'Immatriculation non renseignee'}
                        </div>
                        <div className="text-xs mt-2" style={{ color: assignment ? '#2563eb' : '#64748b' }}>
                          {assignment
                            ? `Affecte a ${assignment.rep?.name || 'un commercial'}`
                            : 'Disponible pour une nouvelle session'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {camion.is_available && (
                        <button onClick={() => openSession({ camion })} className="btn-secondary text-xs">
                          <i className="fa-solid fa-play" />
                        </button>
                      )}
                      <button onClick={() => openEditFleetModal(camion)} className="btn-secondary text-xs">
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button onClick={() => toggleFleetStatus(camion)} className="btn-secondary text-xs">
                        <i className={`fa-solid ${camion.active ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 space-y-2 text-xs" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-color">Etat flotte</span>
                      <span className="font-medium text-base-color">{camion.operational_status_label}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-color">Session en cours</span>
                      <span className="font-medium text-base-color">
                        {assignment ? `#${assignment.id}` : 'Aucune'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-color">Commercial</span>
                      <span className="font-medium text-base-color">{assignment?.rep?.name || 'Libre'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-color">Zone</span>
                      <span className="font-medium text-base-color">{assignment?.zone?.name || 'Non definie'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-color">Ouverture</span>
                      <span className="font-medium text-base-color">{formatDateTime(assignment?.opened_at)}</span>
                    </div>
                    {camion.note && (
                      <div className="rounded-2xl px-3 py-3 text-xs text-secondary-color" style={{ background: 'var(--surface-2)' }}>
                        {camion.note}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xs font-semibold text-muted-color uppercase tracking-wider">
            <i className="fa-solid fa-box-open mr-1.5" /> Stock terrain par commercial
          </h2>
          <span className="text-xs text-muted-color">{reps.length} commercial(aux)</span>
        </div>

        <div className="space-y-3">
          {reps.map((rep) => {
            const session = rep.route_session
            const camion = rep.configured_camion
            const stockItems = rep.stock ?? []
            const isExpanded = expanded[rep.user?.id]
            const meta = statusMeta(session)

            return (
              <div key={rep.user?.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}
                    >
                      {rep.user?.name?.[0]?.toUpperCase() || 'C'}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-base-color">{rep.user?.name}</h3>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            <i className={meta.icon} />
                            {meta.label}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{
                              background: rep.user?.active ? 'rgba(5,150,105,0.10)' : 'rgba(100,116,139,0.10)',
                              color: rep.user?.active ? '#059669' : '#64748b',
                            }}
                          >
                            {rep.user?.active ? 'Compte actif' : 'Compte inactif'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-color mt-1">
                          Zone: {rep.user?.zone?.name || session?.zone?.name || 'Non definie'}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="rounded-2xl px-3 py-2" style={{ background: 'var(--surface-2)' }}>
                          <div className="text-[11px] text-muted-color">Camion physique</div>
                          <div className="text-sm font-semibold text-base-color mt-1">
                            {camion?.name || 'Aucun camion assigné'}
                          </div>
                          <div className="text-[11px] text-muted-color mt-1">{camion?.plate || 'Sans immatriculation'}</div>
                        </div>
                        <div className="rounded-2xl px-3 py-2" style={{ background: 'var(--surface-2)' }}>
                          <div className="text-[11px] text-muted-color">Stock embarqué</div>
                          <div className="text-sm font-semibold text-base-color mt-1">{fmt(rep.total_qty)}</div>
                          <div className="text-[11px] text-muted-color mt-1">{stockItems.length} reference(s)</div>
                        </div>
                        <div className="rounded-2xl px-3 py-2" style={{ background: 'var(--surface-2)' }}>
                          <div className="text-[11px] text-muted-color">Alertes stock bas</div>
                          <div className="text-sm font-semibold mt-1" style={{ color: rep.low_stock_count > 0 ? '#d97706' : '#059669' }}>
                            {rep.low_stock_count ?? 0}
                          </div>
                          <div className="text-[11px] text-muted-color mt-1">
                            Session: {session ? `#${session.id}` : 'Aucune'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {session?.status === 'open' ? (
                      <button onClick={() => openCloseSession(rep)} className="btn-secondary text-xs">
                        <i className="fa-solid fa-flag-checkered" /> Clôturer
                      </button>
                    ) : (
                      <button onClick={() => openSession({ rep })} className="btn-secondary text-xs">
                        <i className="fa-solid fa-play" /> Ouvrir session
                      </button>
                    )}
                    <button onClick={() => openTransfer(rep)} className="btn-secondary text-xs">
                      <i className="fa-solid fa-truck-ramp-box" /> Charger
                    </button>
                    <button
                      onClick={() => setExpanded((current) => ({ ...current, [rep.user?.id]: !current[rep.user?.id] }))}
                      className="btn-secondary text-xs"
                    >
                      <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                      {isExpanded ? 'Masquer le stock' : 'Voir le stock'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 text-xs text-muted-color grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <div>Ouverture: <span className="font-medium text-base-color">{formatDateTime(session?.opened_at)}</span></div>
                  <div>Cloture: <span className="font-medium text-base-color">{formatDateTime(session?.closed_at)}</span></div>
                  <div>Session date: <span className="font-medium text-base-color">{session?.session_date || 'Aucune'}</span></div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    {stockItems.length === 0 ? (
                      <div className="rounded-2xl px-4 py-6 text-sm text-muted-color text-center" style={{ background: 'var(--surface-2)' }}>
                        Aucun stock camion pour ce commercial.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              {['Produit', 'Reference', 'Quantite', 'Min'].map((heading) => (
                                <th key={heading} className="pb-2 pr-4 text-left text-xs font-semibold text-muted-color uppercase tracking-wider">
                                  {heading}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {stockItems.map((item) => {
                              const minStock = Math.max(Number(item.product?.min_stock ?? 1), 1)
                              const isLow = Number(item.qty ?? 0) <= minStock

                              return (
                                <tr key={`${rep.user?.id}-${item.product?.id ?? item.product?.reference}`} className="table-row">
                                  <td className="py-2 pr-4 font-medium text-base-color">{item.product?.name || 'Produit'}</td>
                                  <td className="py-2 pr-4 text-xs text-muted-color">{item.product?.reference || '-'}</td>
                                  <td className="py-2 pr-4 font-mono font-semibold" style={{ color: isLow ? '#d97706' : 'var(--text)' }}>
                                    {fmt(item.qty)}
                                    {isLow && <i className="fa-solid fa-triangle-exclamation ml-1.5 text-[10px]" style={{ color: '#d97706' }} />}
                                  </td>
                                  <td className="py-2 text-xs text-muted-color">{fmt(minStock)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Modal
        open={fleetModal}
        onClose={() => setFleetModal(false)}
        title={fleetForm.id ? 'Modifier un camion physique' : 'Ajouter un camion physique'}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nom du camion" error={fleetErrors.name?.[0]} required>
              <input
                value={fleetForm.name}
                onChange={(event) => setFleetForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Camion Nord 01"
              />
            </FormField>

            <FormField label="Immatriculation" error={fleetErrors.plate?.[0]}>
              <input
                value={fleetForm.plate}
                onChange={(event) => setFleetForm((current) => ({ ...current, plate: event.target.value }))}
                placeholder="123 TU 4567"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Ordre d affichage" error={fleetErrors.sort_order?.[0]}>
              <input
                type="number"
                min="0"
                value={fleetForm.sort_order}
                onChange={(event) => setFleetForm((current) => ({ ...current, sort_order: event.target.value }))}
              />
            </FormField>

            <FormField label="Etat flotte" error={fleetErrors.operational_status?.[0]}>
              <select
                value={fleetForm.operational_status}
                onChange={(event) => setFleetForm((current) => ({ ...current, operational_status: event.target.value }))}
              >
                <option value="ready">Pret</option>
                <option value="maintenance">En panne / maintenance</option>
              </select>
            </FormField>
          </div>

          <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-2)' }}>
            <label className="flex items-center gap-3 text-sm text-base-color cursor-pointer">
              <input
                type="checkbox"
                checked={fleetForm.active}
                onChange={(event) => setFleetForm((current) => ({ ...current, active: event.target.checked }))}
              />
              Camion actif pour les prochaines sessions
            </label>
          </div>

          <FormField label="Note" error={fleetErrors.note?.[0]}>
            <textarea
              rows="3"
              value={fleetForm.note}
              onChange={(event) => setFleetForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Informations logistiques ou remarques internes"
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setFleetModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={saveFleet} disabled={savingFleet} className="btn-primary">
              {savingFleet ? (
                <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement...</>
              ) : (
                <><i className="fa-solid fa-floppy-disk" /> Enregistrer</>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={transferModal}
        onClose={() => setTransferModal(false)}
        title="Charger un commercial"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-2xl px-4 py-3 text-sm text-secondary-color" style={{ background: 'var(--surface-2)' }}>
            Depot de chargement: <strong className="text-base-color">{selectedDepot?.name || 'Dépôt non défini'}</strong>.
          </div>

          <FormField label="Commercial" error={transferErrors.user_id?.[0]} required>
            <select
              value={transferForm.user_id}
              onChange={(event) => setTransferForm((current) => ({ ...current, user_id: event.target.value }))}
            >
              <option value="">Selectionner un commercial...</option>
              {reps.map((rep) => (
                <option key={rep.user?.id} value={rep.user?.id}>
                  {rep.user?.name}
                  {rep.configured_camion?.name ? ` - ${rep.configured_camion.name}` : ''}
                  {rep.route_session?.status === 'open' ? ' - session ouverte' : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Produit" error={transferErrors.product_id?.[0]} required>
            <select
              value={transferForm.product_id}
              onChange={(event) => setTransferForm((current) => ({ ...current, product_id: event.target.value }))}
            >
              <option value="">Selectionner un produit...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.reference}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Quantite" error={transferErrors.qty?.[0]} required>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={transferForm.qty}
              onChange={(event) => setTransferForm((current) => ({ ...current, qty: event.target.value }))}
              placeholder="0.000"
            />
          </FormField>

          <FormField label="Note" error={transferErrors.note?.[0]}>
            <input
              value={transferForm.note}
              onChange={(event) => setTransferForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Recharge matinale, correction, urgence..."
            />
          </FormField>

          <p className="text-xs text-muted-color">
            Le mouvement sera tracé dans l’audit stock avec la session terrain et le camion physique s’ils sont déjà affectés.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setTransferModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={saveTransfer} disabled={savingTransfer} className="btn-primary">
              {savingTransfer ? (
                <><i className="fa-solid fa-spinner fa-spin" /> Transfert...</>
              ) : (
                <><i className="fa-solid fa-truck-arrow-right" /> Transferer</>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={sessionModal}
        onClose={() => setSessionModal(false)}
        title="Démarrer une session terrain"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Commercial" error={sessionErrors.rep_id?.[0]} required>
              <select
                value={sessionForm.rep_id}
                onChange={(event) => setSessionForm((current) => ({ ...current, rep_id: event.target.value }))}
              >
                <option value="">Selectionner un commercial...</option>
                {reps.map((rep) => (
                  <option key={rep.user?.id} value={rep.user?.id} disabled={rep.route_session?.status === 'open'}>
                    {rep.user?.name}
                    {rep.route_session?.status === 'open' ? ' - session déjà ouverte' : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Camion" error={sessionErrors.camion_id?.[0]} required>
              <select
                value={sessionForm.camion_id}
                onChange={(event) => setSessionForm((current) => ({ ...current, camion_id: event.target.value }))}
              >
                <option value="">Selectionner un camion...</option>
                {availableCamions.map((camion) => (
                  <option key={camion.id} value={camion.id}>
                    {camion.name} {camion.plate ? `- ${camion.plate}` : ''}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="rounded-2xl px-4 py-3 text-sm text-secondary-color" style={{ background: 'var(--surface-2)' }}>
            Depot applique: {selectedDepot?.name || 'Dépôt non défini'}.
            {' '}Zone appliquee: {selectedRep?.user?.zone?.name || 'Zone non definie pour ce commercial'}.
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-base-color">Chargement initial</div>
                <div className="text-xs text-muted-color mt-1">
                  Seuls les produits avec stock dépôt disponible sont proposés ici pour éviter une ouverture incohérente.
                </div>
              </div>
              <button onClick={addSessionLine} className="btn-secondary text-xs">
                <i className="fa-solid fa-plus" /> Ligne
              </button>
            </div>

            {sessionErrors.general?.[0] && (
              <div className="rounded-2xl px-4 py-3 text-sm text-red-600" style={{ background: 'rgba(239,68,68,0.08)' }}>
                {sessionErrors.general[0]}
              </div>
            )}

            {sessionErrors.lines?.[0] && (
              <div className="rounded-2xl px-4 py-3 text-sm text-red-600" style={{ background: 'rgba(239,68,68,0.08)' }}>
                {sessionErrors.lines[0]}
              </div>
            )}

            <div className="space-y-3">
              {sessionForm.lines.map((line, index) => (
                <div key={`line-${index}`} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px_auto] gap-3">
                  <FormField label={index === 0 ? 'Produit' : `Produit ${index + 1}`}>
                    <select
                      value={line.product_id}
                      onChange={(event) => updateSessionLine(index, 'product_id', event.target.value)}
                    >
                      <option value="">Selectionner un produit...</option>
                      {sessionLoadProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.reference} - depot {Number(product.depot_qty ?? 0).toFixed(3)}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label={index === 0 ? 'Quantite' : `Quantite ${index + 1}`}>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={line.qty_loaded}
                      onChange={(event) => updateSessionLine(index, 'qty_loaded', event.target.value)}
                      placeholder="0.000"
                    />
                  </FormField>

                  <div className="flex items-end">
                    <button onClick={() => removeSessionLine(index)} className="btn-secondary text-xs w-full">
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {sessionLoadProducts.length === 0 && (
              <div className="rounded-2xl px-4 py-3 text-sm text-amber-700" style={{ background: 'rgba(245,158,11,0.10)' }}>
                Aucun produit n’a de stock dépôt disponible pour un chargement initial.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setSessionModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={saveSession} disabled={savingSession} className="btn-primary">
              {savingSession ? (
                <><i className="fa-solid fa-spinner fa-spin" /> Ouverture...</>
              ) : (
                <><i className="fa-solid fa-play" /> Ouvrir la session</>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={closeModal}
        onClose={() => setCloseModal(false)}
        title="Clôturer une session terrain"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-2xl px-4 py-3 text-sm text-secondary-color" style={{ background: 'var(--surface-2)' }}>
            Renseignez les montants déjà récupérés si vous souhaitez les consolider au moment de la clôture.
          </div>

          {closeErrors.general?.[0] && (
            <div className="rounded-2xl px-4 py-3 text-sm text-red-600" style={{ background: 'rgba(239,68,68,0.08)' }}>
              {closeErrors.general[0]}
            </div>
          )}

          <FormField label="Cash collecte" error={closeErrors.cash_collected?.[0]}>
            <input
              type="number"
              step="0.001"
              min="0"
              value={closeForm.cash_collected}
              onChange={(event) => setCloseForm((current) => ({ ...current, cash_collected: event.target.value }))}
              placeholder="0.000"
            />
          </FormField>

          <FormField label="Crédit collecté" error={closeErrors.credit_collected?.[0]}>
            <input
              type="number"
              step="0.001"
              min="0"
              value={closeForm.credit_collected}
              onChange={(event) => setCloseForm((current) => ({ ...current, credit_collected: event.target.value }))}
              placeholder="0.000"
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setCloseModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={saveCloseSession} disabled={closingSession} className="btn-primary">
              {closingSession ? (
                <><i className="fa-solid fa-spinner fa-spin" /> Cloture...</>
              ) : (
                <><i className="fa-solid fa-flag-checkered" /> Clôturer la session</>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
