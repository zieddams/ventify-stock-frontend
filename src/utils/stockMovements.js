export function buildMovementConfig(t) {
  return {
    depot_in: { label: t('reportsPage.movements.types.depot_in'), icon: 'fa-solid fa-arrow-down', color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
    depot_to_camion: { label: t('reportsPage.movements.types.depot_to_camion'), icon: 'fa-solid fa-truck', color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
    camion_to_customer: { label: t('reportsPage.movements.types.camion_to_customer'), icon: 'fa-solid fa-user', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
    return: { label: t('reportsPage.movements.types.return'), icon: 'fa-solid fa-rotate-left', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
    adjustment: { label: t('reportsPage.movements.types.adjustment'), icon: 'fa-solid fa-sliders', color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
    transfer_out: { label: t('reportsPage.movements.types.transfer_out'), icon: 'fa-solid fa-shop', color: '#ec4899', bg: 'rgba(236,72,153,0.10)' },
    transfer_in: { label: t('reportsPage.movements.types.transfer_in'), icon: 'fa-solid fa-warehouse', color: '#0ea5e9', bg: 'rgba(14,165,233,0.10)' },
    camion_to_pos: { label: t('reportsPage.movements.types.camion_to_pos'), icon: 'fa-solid fa-truck-ramp-box', color: '#14b8a6', bg: 'rgba(20,184,166,0.10)' },
  }
}

export function getMovementConfig(t, type) {
  return buildMovementConfig(t)[type] ?? { label: type, icon: 'fa-solid fa-circle', color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
}
