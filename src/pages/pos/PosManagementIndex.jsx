import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormField from '../../components/FormField'
import Modal from '../../components/Modal'
import { PageLoader } from '../../components/Spinner'
import MovementsPanel from '../../components/stock/MovementsPanel'
import { useI18n } from '../../contexts/I18nContext'
import api from '../../services/api'
import { formatNumber } from '../../utils/format'

function buildPosForm(depot = null) {
  return {
    id: depot?.id ?? null,
    name: depot?.name ?? '',
    code: depot?.code ?? '',
    address: depot?.address ?? '',
    note: depot?.note ?? '',
    active: depot?.active ?? true,
  }
}

function buildManagerForm() {
  return { name: '', email: '', password: '' }
}

function buildOnboardingCustomerForm() {
  return { name: '', phone: '', address: '', credit_limit: '' }
}

function buildTransferForm() {
  return { from_depot_id: '', product_id: '', qty: '', unit_price: '', note: '' }
}

export default function PosManagementIndex() {
  const { t } = useI18n()
  const notAvailable = t('common.notAvailable')
  const navigate = useNavigate()

  const [movementsModal, setMovementsModal] = useState(null)
  const [posDepots, setPosDepots] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [staffByDepot, setStaffByDepot] = useState({})
  const [loading, setLoading] = useState(true)

  const [posModal, setPosModal] = useState(false)
  const [posForm, setPosForm] = useState(buildPosForm())
  const [posErrors, setPosErrors] = useState({})
  const [savingPos, setSavingPos] = useState(false)
  const [includeManager, setIncludeManager] = useState(false)
  const [managerForm, setManagerForm] = useState(buildManagerForm())
  const [includeOnboardingCustomer, setIncludeOnboardingCustomer] = useState(false)
  const [onboardingCustomerForm, setOnboardingCustomerForm] = useState(buildOnboardingCustomerForm())

  const [transferModal, setTransferModal] = useState(null)
  const [transferForm, setTransferForm] = useState(buildTransferForm())
  const [transferErrors, setTransferErrors] = useState({})
  const [savingTransfer, setSavingTransfer] = useState(false)
  const [sourceStock, setSourceStock] = useState([])
  const [sourceStockLoading, setSourceStockLoading] = useState(false)

  const [managerModal, setManagerModal] = useState(null)
  const [assignManagerForm, setAssignManagerForm] = useState(buildManagerForm())
  const [assignManagerErrors, setAssignManagerErrors] = useState({})
  const [savingManager, setSavingManager] = useState(false)

  const loadAll = async () => {
    setLoading(true)

    try {
      const [posResponse, warehouseResponse, usersResponse] = await Promise.all([
        api.get('/depots', { params: { type: 'pos', include_inactive: 1 } }),
        api.get('/depots', { params: { type: 'warehouse' } }),
        api.get('/users'),
      ])

      setPosDepots(Array.isArray(posResponse.data) ? posResponse.data : [])
      setWarehouses(Array.isArray(warehouseResponse.data) ? warehouseResponse.data : [])

      const users = Array.isArray(usersResponse.data) ? usersResponse.data : []
      const grouped = {}
      users.filter((u) => u.role === 'pos').forEach((u) => {
        const key = String(u.depot_id)
        grouped[key] = [...(grouped[key] ?? []), u]
      })
      setStaffByDepot(grouped)
    } finally {
      setLoading(false)
    }
  }

  const removeStaff = async (user) => {
    if (!confirm(t('posManagementPage.alerts.removeStaffConfirm', { name: user.name }))) {
      return
    }

    try {
      await api.delete(`/users/${user.id}`)
      await loadAll()
    } catch (error) {
      alert(error.response?.data?.message || t('posManagementPage.alerts.removeStaffError'))
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (!transferModal || !transferForm.from_depot_id) {
      setSourceStock([])
      return undefined
    }

    let cancelled = false
    setSourceStockLoading(true)

    api.get('/depot', { params: { depot_id: transferForm.from_depot_id } })
      .then((response) => {
        if (cancelled) return
        const rows = Array.isArray(response.data) ? response.data : []
        setSourceStock(rows.filter((row) => Number(row.qty) > 0))
      })
      .finally(() => {
        if (!cancelled) setSourceStockLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [transferModal, transferForm.from_depot_id])

  const openCreate = () => {
    setPosForm(buildPosForm())
    setPosErrors({})
    setIncludeManager(false)
    setManagerForm(buildManagerForm())
    setIncludeOnboardingCustomer(false)
    setOnboardingCustomerForm(buildOnboardingCustomerForm())
    setPosModal(true)
  }

  const openEdit = (depot) => {
    setPosForm(buildPosForm(depot))
    setPosErrors({})
    setIncludeManager(false)
    setManagerForm(buildManagerForm())
    setIncludeOnboardingCustomer(false)
    setOnboardingCustomerForm(buildOnboardingCustomerForm())
    setPosModal(true)
  }

  const savePos = async () => {
    setSavingPos(true)
    setPosErrors({})

    try {
      const payload = {
        name: posForm.name,
        code: posForm.code || null,
        address: posForm.address || null,
        note: posForm.note || null,
        active: posForm.active,
        ...(posForm.id ? {} : { type: 'pos' }),
        ...(!posForm.id && includeManager ? {
          manager: {
            name: managerForm.name,
            email: managerForm.email,
            password: managerForm.password,
          },
        } : {}),
        ...(!posForm.id && includeOnboardingCustomer ? {
          customer: {
            name: onboardingCustomerForm.name,
            phone: onboardingCustomerForm.phone || null,
            address: onboardingCustomerForm.address || null,
            credit_limit: onboardingCustomerForm.credit_limit || null,
          },
        } : {}),
      }

      let response

      if (posForm.id) {
        response = await api.put(`/depots/${posForm.id}`, payload)
      } else {
        response = await api.post('/depots', payload)
      }

      setPosModal(false)
      await loadAll()

      if (response.data?.manager || response.data?.customer) {
        const parts = [
          response.data.manager ? t('posManagementPage.onboarding.managerCreatedLine', { email: response.data.manager.email }) : null,
          response.data.customer ? t('posManagementPage.onboarding.customerCreatedLine', { name: response.data.customer.name }) : null,
        ].filter(Boolean)
        alert(parts.join('\n'))
      }
    } catch (error) {
      setPosErrors(error.response?.data?.errors ?? {})
    } finally {
      setSavingPos(false)
    }
  }

  const deletePos = async (depot) => {
    if (!confirm(t('posManagementPage.alerts.deleteConfirm', { name: depot.name }))) {
      return
    }

    try {
      await api.delete(`/depots/${depot.id}`)
      await loadAll()
    } catch (error) {
      alert(error.response?.data?.message || t('posManagementPage.alerts.deleteError'))
    }
  }

  const openTransfer = (depot) => {
    setTransferModal(depot)
    setTransferForm({
      ...buildTransferForm(),
      from_depot_id: warehouses.find((warehouse) => warehouse.is_default)?.id
        ?? warehouses[0]?.id
        ?? '',
    })
    setTransferErrors({})
  }

  const saveTransfer = async () => {
    if (!transferModal) {
      return
    }

    setSavingTransfer(true)
    setTransferErrors({})

    try {
      await api.post('/stock-transfers', {
        from_depot_id: transferForm.from_depot_id || null,
        to_depot_id: transferModal.id,
        note: transferForm.note || null,
        lines: [{
          product_id: transferForm.product_id,
          qty: Number(transferForm.qty),
          unit_price: Number(transferForm.unit_price),
        }],
      })

      setTransferModal(null)
      await loadAll()
    } catch (error) {
      setTransferErrors(error.response?.data?.errors ?? {})
    } finally {
      setSavingTransfer(false)
    }
  }

  const openAssignManager = (depot) => {
    setManagerModal(depot)
    setAssignManagerForm(buildManagerForm())
    setAssignManagerErrors({})
  }

  const saveAssignManager = async () => {
    if (!managerModal) {
      return
    }

    setSavingManager(true)
    setAssignManagerErrors({})

    try {
      await api.post('/users', {
        name: assignManagerForm.name,
        email: assignManagerForm.email,
        password: assignManagerForm.password,
        role: 'pos',
        depot_id: managerModal.id,
      })

      setManagerModal(null)
      await loadAll()
    } catch (error) {
      setAssignManagerErrors(error.response?.data?.errors ?? {})
    } finally {
      setSavingManager(false)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  const selectedSourceStock = sourceStock.find((item) => String(item.product_id) === String(transferForm.product_id))

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-base-color tracking-tight">{t('posManagementPage.title')}</h1>
          <p className="text-sm text-muted-color mt-0.5">{t('posManagementPage.subtitle')}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <i className="fa-solid fa-plus" /> {t('posManagementPage.newPos')}
        </button>
      </div>

      {warehouses.length === 0 && (
        <div className="mb-5 rounded-xl p-3 border text-xs" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: '#b45309' }}>
          <i className="fa-solid fa-triangle-exclamation" /> {t('posManagementPage.noWarehouseWarning')}
        </div>
      )}

      {posDepots.length === 0 ? (
        <div className="card py-12 text-center text-muted-color">
          {t('posManagementPage.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {posDepots.map((depot) => (
            <div key={depot.id} className="card" style={{ opacity: depot.active ? 1 : 0.72 }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-base-color">{depot.name}</div>
                    {!depot.active && <span className="badge badge-red">{t('posManagementPage.badges.inactive')}</span>}
                  </div>
                  <div className="text-xs text-muted-color mt-1">{depot.code || t('posManagementPage.labels.noCode')}</div>
                  {depot.address && <div className="text-xs text-secondary-color mt-2">{depot.address}</div>}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button onClick={() => setMovementsModal(depot)} className="btn-secondary text-xs" title={t('posManagementPage.titles.movements')}>
                    <i className="fa-solid fa-arrows-up-down" /> {t('posManagementPage.actions.movements')}
                  </button>
                  <button onClick={() => navigate(`/points-de-vente/${depot.id}/inventory`, { state: { depotName: depot.name } })} className="btn-secondary text-xs" title={t('posManagementPage.titles.inventory')}>
                    <i className="fa-solid fa-clipboard-check" /> {t('posManagementPage.actions.inventory')}
                  </button>
                  <button onClick={() => openTransfer(depot)} className="btn-secondary text-xs" title={t('posManagementPage.titles.transfer')}>
                    <i className="fa-solid fa-truck-ramp-box" /> {t('posManagementPage.actions.transfer')}
                  </button>
                  <button onClick={() => openAssignManager(depot)} className="btn-secondary text-xs" title={t('posManagementPage.titles.assignManager')}>
                    <i className="fa-solid fa-user-plus" /> {t('posManagementPage.actions.assignManager')}
                  </button>
                  <button onClick={() => openEdit(depot)} className="btn-secondary text-xs" title={t('posManagementPage.titles.edit')}>
                    <i className="fa-solid fa-pen" />
                  </button>
                  <button onClick={() => deletePos(depot)} className="btn-secondary text-xs text-red-500" title={t('posManagementPage.titles.delete')}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                {[
                  { label: t('posManagementPage.metrics.refs'), value: depot.stocked_products_count ?? 0 },
                  { label: t('posManagementPage.metrics.team'), value: depot.users_count ?? 0 },
                  { label: t('posManagementPage.metrics.stockTotal'), value: formatNumber(depot.total_stock_qty) },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl px-3 py-2 border border-theme" style={{ background: 'var(--surface-2)' }}>
                    <div className="text-[11px] text-muted-color">{item.label}</div>
                    <div className="text-sm font-bold text-base-color mt-1">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="text-[11px] font-semibold text-muted-color uppercase tracking-wider mb-2">{t('posManagementPage.staffTitle')}</div>
                {(staffByDepot[String(depot.id)] ?? []).length === 0 ? (
                  <div className="text-xs text-muted-color">{t('posManagementPage.noStaff')}</div>
                ) : (
                  <div className="space-y-1.5">
                    {staffByDepot[String(depot.id)].map((staff) => (
                      <div key={staff.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-medium text-base-color truncate">{staff.name}</div>
                          <div className="text-muted-color truncate">{staff.email}</div>
                        </div>
                        <button onClick={() => removeStaff(staff)} className="btn-ghost text-red-500 px-2 py-1 flex-shrink-0" title={t('posManagementPage.titles.removeStaff')}>
                          <i className="fa-solid fa-user-minus" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={posModal} onClose={() => setPosModal(false)} title={posForm.id ? t('posManagementPage.posModal.editTitle') : t('posManagementPage.posModal.createTitle')} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label={t('posManagementPage.posModal.name')} error={posErrors.name?.[0]} required>
              <input value={posForm.name} onChange={(event) => setPosForm((current) => ({ ...current, name: event.target.value }))} placeholder={t('posManagementPage.posModal.placeholders.name')} />
            </FormField>
            <FormField label={t('posManagementPage.posModal.code')} error={posErrors.code?.[0]}>
              <input value={posForm.code} onChange={(event) => setPosForm((current) => ({ ...current, code: event.target.value }))} placeholder={t('posManagementPage.posModal.placeholders.code')} />
            </FormField>
          </div>

          <FormField label={t('posManagementPage.posModal.address')} error={posErrors.address?.[0]}>
            <input value={posForm.address} onChange={(event) => setPosForm((current) => ({ ...current, address: event.target.value }))} placeholder={t('posManagementPage.posModal.placeholders.address')} />
          </FormField>

          <FormField label={t('posManagementPage.posModal.note')} error={posErrors.note?.[0]}>
            <textarea rows="3" value={posForm.note} onChange={(event) => setPosForm((current) => ({ ...current, note: event.target.value }))} placeholder={t('posManagementPage.posModal.placeholders.note')} />
          </FormField>

          <div className="rounded-xl border border-theme px-4 py-3" style={{ background: 'var(--surface-2)' }}>
            <label className="flex items-center gap-3 text-sm text-base-color cursor-pointer">
              <input type="checkbox" checked={posForm.active} onChange={(event) => setPosForm((current) => ({ ...current, active: event.target.checked }))} />
              {t('posManagementPage.posModal.activeToggle')}
            </label>
          </div>

          {!posForm.id && (
            <>
              <div className="rounded-xl border border-theme px-4 py-3" style={{ background: 'var(--surface-2)' }}>
                <label className="flex items-center gap-3 text-sm text-base-color cursor-pointer">
                  <input type="checkbox" checked={includeManager} onChange={(event) => setIncludeManager(event.target.checked)} />
                  {t('posManagementPage.onboarding.managerToggle')}
                </label>

                {includeManager && (
                  <div className="space-y-3 mt-3">
                    <FormField label={t('posManagementPage.onboarding.managerName')} error={posErrors['manager.name']?.[0]} required>
                      <input value={managerForm.name} onChange={(event) => setManagerForm((current) => ({ ...current, name: event.target.value }))} placeholder={t('posManagementPage.onboarding.managerNamePlaceholder')} />
                    </FormField>
                    <FormField label={t('posManagementPage.onboarding.managerEmail')} error={posErrors['manager.email']?.[0]} required>
                      <input type="email" value={managerForm.email} onChange={(event) => setManagerForm((current) => ({ ...current, email: event.target.value }))} placeholder={t('posManagementPage.onboarding.managerEmailPlaceholder')} />
                    </FormField>
                    <FormField label={t('posManagementPage.onboarding.managerPassword')} error={posErrors['manager.password']?.[0]} required>
                      <input type="password" value={managerForm.password} onChange={(event) => setManagerForm((current) => ({ ...current, password: event.target.value }))} placeholder={t('posManagementPage.onboarding.managerPasswordPlaceholder')} />
                    </FormField>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-theme px-4 py-3" style={{ background: 'var(--surface-2)' }}>
                <label className="flex items-center gap-3 text-sm text-base-color cursor-pointer">
                  <input type="checkbox" checked={includeOnboardingCustomer} onChange={(event) => setIncludeOnboardingCustomer(event.target.checked)} />
                  {t('posManagementPage.onboarding.customerToggle')}
                </label>

                {includeOnboardingCustomer && (
                  <div className="space-y-3 mt-3">
                    <FormField label={t('posManagementPage.onboarding.customerName')} error={posErrors['customer.name']?.[0]} required>
                      <input value={onboardingCustomerForm.name} onChange={(event) => setOnboardingCustomerForm((current) => ({ ...current, name: event.target.value }))} placeholder={t('posManagementPage.onboarding.customerNamePlaceholder')} />
                    </FormField>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField label={t('posManagementPage.onboarding.customerPhone')} error={posErrors['customer.phone']?.[0]}>
                        <input value={onboardingCustomerForm.phone} onChange={(event) => setOnboardingCustomerForm((current) => ({ ...current, phone: event.target.value }))} placeholder={t('posManagementPage.onboarding.customerPhonePlaceholder')} />
                      </FormField>
                      <FormField label={t('posManagementPage.onboarding.customerCreditLimit')} error={posErrors['customer.credit_limit']?.[0]}>
                        <input type="number" step="0.001" min="0" value={onboardingCustomerForm.credit_limit} onChange={(event) => setOnboardingCustomerForm((current) => ({ ...current, credit_limit: event.target.value }))} placeholder="0.000" />
                      </FormField>
                    </div>
                    <FormField label={t('posManagementPage.onboarding.customerAddress')} error={posErrors['customer.address']?.[0]}>
                      <input value={onboardingCustomerForm.address} onChange={(event) => setOnboardingCustomerForm((current) => ({ ...current, address: event.target.value }))} placeholder={t('posManagementPage.onboarding.customerAddressPlaceholder')} />
                    </FormField>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setPosModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={savePos} disabled={savingPos} className="btn-primary">
              {savingPos ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(transferModal)}
        onClose={() => setTransferModal(null)}
        title={t('posManagementPage.transferModal.title', { name: transferModal?.name ?? '' })}
        size="md"
      >
        <div className="space-y-4">
          {warehouses.length > 1 && (
            <FormField label={t('posManagementPage.transferModal.fromDepot')} error={transferErrors.from_depot_id?.[0]} required>
              <select
                value={transferForm.from_depot_id}
                onChange={(event) => setTransferForm((current) => ({ ...current, from_depot_id: event.target.value, product_id: '', qty: '', unit_price: '' }))}
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </FormField>
          )}

          <FormField label={t('posManagementPage.transferModal.product')} error={transferErrors['lines.0.product_id']?.[0]} required>
            <select
              value={transferForm.product_id}
              disabled={sourceStockLoading || sourceStock.length === 0}
              onChange={(event) => {
                const stockRow = sourceStock.find((item) => String(item.product_id) === event.target.value)
                setTransferForm((current) => ({
                  ...current,
                  product_id: event.target.value,
                  qty: '',
                  unit_price: String(stockRow?.product?.depot_price ?? stockRow?.product?.buy_price ?? ''),
                }))
              }}
            >
              <option value="">
                {sourceStockLoading ? t('common.loading') : t('posManagementPage.transferModal.selectProduct')}
              </option>
              {sourceStock.map((item) => (
                <option key={item.product_id} value={item.product_id}>
                  {item.product?.name} - {item.product?.reference || notAvailable} ({formatNumber(item.qty)} {t('posManagementPage.transferModal.availableUnit')})
                </option>
              ))}
            </select>
          </FormField>

          {!sourceStockLoading && transferForm.from_depot_id && sourceStock.length === 0 && (
            <p className="text-xs text-amber-600 -mt-2">{t('posManagementPage.transferModal.noStock')}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label={t('posManagementPage.transferModal.qty')} error={transferErrors['lines.0.qty']?.[0]} required>
              <input
                type="number"
                step="0.001"
                min="0.001"
                max={selectedSourceStock?.qty || undefined}
                value={transferForm.qty}
                onChange={(event) => setTransferForm((current) => ({ ...current, qty: event.target.value }))}
                placeholder="0.000"
                disabled={!transferForm.product_id}
              />
            </FormField>
            <FormField label={t('posManagementPage.transferModal.unitPrice')} error={transferErrors['lines.0.unit_price']?.[0]} required>
              <input type="number" step="0.001" min="0" value={transferForm.unit_price} onChange={(event) => setTransferForm((current) => ({ ...current, unit_price: event.target.value }))} placeholder="0.000" />
            </FormField>
          </div>

          {selectedSourceStock && (
            <p className="text-xs text-muted-color -mt-2">
              {t('posManagementPage.transferModal.availableHint', { qty: formatNumber(selectedSourceStock.qty) })}
              {' · '}
              {t('posManagementPage.transferModal.referencePriceHint', {
                depotPrice: formatNumber(selectedSourceStock.product?.depot_price ?? 0),
                buyPrice: formatNumber(selectedSourceStock.product?.buy_price ?? 0),
              })}
            </p>
          )}

          <FormField label={t('posManagementPage.transferModal.note')} error={transferErrors.note?.[0]}>
            <input value={transferForm.note} onChange={(event) => setTransferForm((current) => ({ ...current, note: event.target.value }))} placeholder={t('posManagementPage.transferModal.notePlaceholder')} />
          </FormField>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setTransferModal(null)} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={saveTransfer} disabled={savingTransfer} className="btn-primary">
              {savingTransfer ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : <><i className="fa-solid fa-truck-ramp-box" /> {t('posManagementPage.transferModal.save')}</>}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(managerModal)}
        onClose={() => setManagerModal(null)}
        title={t('posManagementPage.assignManagerModal.title', { name: managerModal?.name ?? '' })}
        size="sm"
      >
        <div className="space-y-4">
          <FormField label={t('posManagementPage.onboarding.managerName')} error={assignManagerErrors.name?.[0]} required>
            <input value={assignManagerForm.name} onChange={(event) => setAssignManagerForm((current) => ({ ...current, name: event.target.value }))} placeholder={t('posManagementPage.onboarding.managerNamePlaceholder')} />
          </FormField>
          <FormField label={t('posManagementPage.onboarding.managerEmail')} error={assignManagerErrors.email?.[0]} required>
            <input type="email" value={assignManagerForm.email} onChange={(event) => setAssignManagerForm((current) => ({ ...current, email: event.target.value }))} placeholder={t('posManagementPage.onboarding.managerEmailPlaceholder')} />
          </FormField>
          <FormField label={t('posManagementPage.onboarding.managerPassword')} error={assignManagerErrors.password?.[0]} required>
            <input type="password" value={assignManagerForm.password} onChange={(event) => setAssignManagerForm((current) => ({ ...current, password: event.target.value }))} placeholder={t('posManagementPage.onboarding.managerPasswordPlaceholder')} />
          </FormField>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setManagerModal(null)} className="btn-secondary">{t('common.cancel')}</button>
            <button onClick={saveAssignManager} disabled={savingManager} className="btn-primary">
              {savingManager ? <><i className="fa-solid fa-spinner fa-spin" /> {t('common.saving')}</> : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(movementsModal)}
        onClose={() => setMovementsModal(null)}
        title={t('posManagementPage.movementsModal.title', { name: movementsModal?.name ?? '' })}
        size="xl"
      >
        {movementsModal && <MovementsPanel depotId={movementsModal.id} />}
      </Modal>
    </div>
  )
}
