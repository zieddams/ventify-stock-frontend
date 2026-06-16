import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../services/api'
import PageHeader from '../../components/PageHeader'

// Fix default leaflet marker icons in bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const ZONE_COLORS = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#f97316', '#06b6d4', '#10b981']

function makeIcon(color, size = 10) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Bizerte center (fallback)
const DEFAULT_CENTER = [37.2744, 9.8739]
const DEFAULT_ZOOM   = 11

function FitBoundsControl({ customers }) {
  const map = useMap()
  useEffect(() => {
    if (customers.length === 0) return
    const pts = customers.filter(c => c.lat && c.lng).map(c => [c.lat, c.lng])
    if (pts.length > 0) {
      try { map.fitBounds(pts, { padding: [32, 32] }) } catch {}
    }
  }, [customers, map])
  return null
}

export default function LiveMapIndex() {
  const [customers, setCustomers] = useState([])
  const [zones,     setZones]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [filterZone,setFilterZone]= useState('')
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/customers'),
      api.get('/zones'),
    ]).then(([cRes, zRes]) => {
      setCustomers(cRes.data ?? [])
      setZones(zRes.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const zoneColor = (zoneId) => {
    if (!zoneId) return '#94a3b8'
    const idx = zones.findIndex(z => z.id === zoneId)
    return ZONE_COLORS[idx % ZONE_COLORS.length] ?? '#94a3b8'
  }

  const filtered = customers.filter(c => {
    if (filterZone && String(c.zone_id) !== String(filterZone)) return false
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const mapped   = filtered.filter(c => c.lat && c.lng)
  const unmapped = filtered.filter(c => !c.lat && !c.lng)

  return (
    <div>
      <PageHeader
        title="Carte clients"
        subtitle={`${customers.length} clients · ${mapped.length} géolocalisés`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          {/* Filters */}
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3">
              <i className="fa-solid fa-filter text-teal-500 mr-2" />Filtres
            </h2>
            <div className="space-y-2">
              <input placeholder="Rechercher un client…" value={search}
                onChange={e => setSearch(e.target.value)} />
              <select value={filterZone} onChange={e => setFilterZone(e.target.value)}>
                <option value="">Toutes les zones</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          </div>

          {/* Zone legend */}
          {zones.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-base-color mb-3">Zones</h2>
              <div className="space-y-1.5">
                {zones.map((z, i) => (
                  <button key={z.id}
                    onClick={() => setFilterZone(filterZone === String(z.id) ? '' : String(z.id))}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors"
                    style={filterZone === String(z.id)
                      ? { background: ZONE_COLORS[i % ZONE_COLORS.length] + '15', color: ZONE_COLORS[i % ZONE_COLORS.length] }
                      : { color: 'var(--text-secondary)' }
                    }>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                    {z.name}
                    <span className="ml-auto text-muted-color font-normal">
                      {customers.filter(c => c.zone_id === z.id).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Non-geolocated customers */}
          {unmapped.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-base-color mb-2 flex items-center gap-2">
                <i className="fa-solid fa-location-dot-slash text-amber-500" />
                Non géolocalisés ({unmapped.length})
              </h2>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {unmapped.map(c => (
                  <div key={c.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs text-secondary-color">
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: zoneColor(c.zone_id) }} />
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <div className="card overflow-hidden p-0" style={{ height: 560 }}>
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-color gap-2">
                <i className="fa-solid fa-spinner fa-spin" /> Chargement de la carte…
              </div>
            ) : (
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBoundsControl customers={mapped} />

                {mapped.map(c => (
                  <Marker
                    key={c.id}
                    position={[c.lat, c.lng]}
                    icon={makeIcon(zoneColor(c.zone_id), selected?.id === c.id ? 14 : 10)}
                    eventHandlers={{ click: () => setSelected(c) }}
                  >
                    <Popup>
                      <div style={{ minWidth: 160 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
                        {c.phone   && <div style={{ color: '#64748b', fontSize: 12 }}>{c.phone}</div>}
                        {c.address && <div style={{ color: '#64748b', fontSize: 12 }}>{c.address}</div>}
                        {c.credit_balance != null && Math.abs(c.credit_balance) > 0 && (
                          <div style={{ marginTop: 6, fontWeight: 600, fontSize: 12, color: c.credit_balance > 0 ? '#dc2626' : '#059669' }}>
                            Crédit: {Number(c.credit_balance).toFixed(3)} TND
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { label: 'Total clients',   value: customers.length,  color: '#0d9488', icon: 'fa-solid fa-users' },
              { label: 'Sur la carte',    value: mapped.length,     color: '#3b82f6', icon: 'fa-solid fa-location-dot' },
              { label: 'Sans position',   value: unmapped.length,   color: '#f59e0b', icon: 'fa-solid fa-location-dot-slash' },
            ].map(s => (
              <div key={s.label} className="card py-3 px-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: s.color + '1a' }}>
                  <i className={`${s.icon} text-sm`} style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-xs text-muted-color">{s.label}</div>
                  <div className="text-sm font-bold text-base-color">{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
