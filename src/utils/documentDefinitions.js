const MONEY_FORMATTER = new Intl.NumberFormat('fr-TN', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const MOVEMENT_LABELS = {
  depot_in: 'Réception',
  depot_to_camion: 'Vers camion',
  camion_to_customer: 'Vers client',
  return: 'Retour',
  adjustment: 'Ajustement',
}

const INVOICE_STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  paid: 'Payée',
  cancelled: 'Annulée',
}

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Impayé',
  partial: 'Partiel',
  paid: 'Payé',
}

const ROUTE_SESSION_STATUS_LABELS = {
  open: 'En cours',
  closed: 'Clôturée',
}

function field(key, label, value, description = '', options = {}) {
  return {
    key,
    label,
    value,
    description,
    defaultEnabled: options.defaultEnabled !== false,
  }
}

export function asText(value, fallback = '-') {
  if (value === null || value === undefined) {
    return fallback
  }

  const normalized = String(value).trim()
  return normalized === '' ? fallback : normalized
}

export function asNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function formatMoney(value) {
  return `${MONEY_FORMATTER.format(asNumber(value))} TND`
}

export function formatQuantity(value) {
  return MONEY_FORMATTER.format(asNumber(value))
}

export function formatDate(value, fallback = '-') {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() < 2000) {
    return fallback
  }

  return DATE_FORMATTER.format(parsed)
}

export function formatDateTime(value, fallback = '-') {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() < 2000) {
    return fallback
  }

  return DATE_TIME_FORMATTER.format(parsed)
}

function invoiceDue(invoice) {
  return Math.max(asNumber(invoice?.total) - asNumber(invoice?.paid_amount), 0)
}

function expenseCategoryLabel(expense) {
  return asText(
    expense?.category_label ||
      expense?.category?.label ||
      expense?.category?.display_label ||
      expense?.category?.value ||
      expense?.category
  )
}

function expenseHistoryEventLabel(entry) {
  return entry?.event_type === 'payment' ? 'Paiement' : 'Création'
}

function stockMin(item) {
  return Math.max(asNumber(item?.product?.min_stock ?? item?.min_stock ?? 1, 1), 1)
}

function stockQty(item) {
  return asNumber(item?.qty ?? item?.depot_qty ?? item?.product?.depot_qty)
}

function stockStatus(item) {
  return stockQty(item) <= stockMin(item) ? 'Stock bas' : 'Normal'
}

function mapStatus(customer) {
  return customer?.lat != null && customer?.lng != null ? 'Position OK' : 'À géolocaliser'
}

function mouvementLabel(type) {
  return MOVEMENT_LABELS[type] || asText(type)
}

function invoiceStatusLabel(status) {
  return INVOICE_STATUS_LABELS[status] || asText(status)
}

function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || asText(status)
}

function routeStatusLabel(status) {
  return ROUTE_SESSION_STATUS_LABELS[status] || asText(status)
}

function routeCamionLabel(session) {
  return session?.camion?.name ? asText(session.camion.name) : 'Non assigné'
}

function routeCamionPlate(session) {
  return asText(session?.camion?.plate, 'Sans plaque')
}

function inventoryDeltaTotal(records) {
  return records.reduce((sum, movement) => sum + asNumber(movement?.qty), 0)
}

const SALARY_RUN_STATUS_LABELS = {
  draft: 'Brouillon',
  finalized: 'Finalisée',
  paid: 'Payée',
}

const LEDGER_TYPE_LABELS = {
  prime: 'Prime',
  avance: 'Avance sur salaire',
  remboursement_avance: "Remboursement d'avance",
  retenue: 'Retenue',
  autre: 'Autre',
}

const LEAVE_TYPE_LABELS = {
  annuel: 'Congé annuel',
  maladie: 'Congé maladie',
  sans_solde: 'Sans solde',
  autre: 'Autre',
}

const LEAVE_STATUS_LABELS = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
  taken: 'Pris',
}

function salaryRunPeriodLabel(run) {
  const month = String(run?.period_month ?? '').padStart(2, '0')
  return `${month}/${asText(run?.period_year)}`
}

function salaryRunStatusLabel(status) {
  return SALARY_RUN_STATUS_LABELS[status] || asText(status)
}

function ledgerTypeLabel(type) {
  return LEDGER_TYPE_LABELS[type] || asText(type)
}

function leaveTypeLabel(type) {
  return LEAVE_TYPE_LABELS[type] || asText(type)
}

function leaveStatusLabel(status) {
  return LEAVE_STATUS_LABELS[status] || asText(status)
}

export const DOCUMENT_TEMPLATE_SECTIONS = [
  {
    key: 'sales',
    label: 'Ventes & clients',
    icon: 'fa-solid fa-file-invoice',
    description: 'Factures, clients et pièces commerciales.',
  },
  {
    key: 'catalog',
    label: 'Catalogue',
    icon: 'fa-solid fa-box-open',
    description: 'Produits et état du stock catalogue.',
  },
  {
    key: 'operations',
    label: 'Opérations',
    icon: 'fa-solid fa-warehouse',
    description: 'Dépôt, mouvements, inventaire et sorties terrain.',
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: 'fa-solid fa-wallet',
    description: 'Dépenses et sorties financières.',
  },
  {
    key: 'hr',
    label: 'Ressources humaines',
    icon: 'fa-solid fa-id-card-clip',
    description: 'Employés, paie, primes/avances et congés.',
  },
]

export const DOCUMENT_DEFINITIONS = [
  {
    key: 'customers_list',
    label: 'Clients - liste',
    description: 'Liste filtrée des clients avec affectation et statut de géolocalisation.',
    scope: 'list',
    section: 'sales',
    title: 'Clients',
    filename: 'clients',
    orientation: 'landscape',
    fields: [
      field('name', 'Nom', (customer) => asText(customer?.name), 'Nom du client.'),
      field('phone', 'Téléphone', (customer) => asText(customer?.phone), 'Numéro principal.'),
      field('owner', 'Affecté à', (customer) => customer?.owner?.name ? `${customer.owner.name} (${asText(customer.owner.role, '-')})` : '-', 'Compte propriétaire.'),
      field('wilaya', 'Gouvernorat', (customer) => asText(customer?.wilaya), 'Gouvernorat / wilaya.'),
      field('zone', 'Zone', (customer) => asText(customer?.zone?.name), 'Zone commerciale.'),
      field('map_status', 'Carte', (customer) => mapStatus(customer), 'Statut de géolocalisation.', { defaultEnabled: false }),
      field('credit_balance', 'Solde crédit', (customer) => formatMoney(customer?.credit_balance), 'Solde client courant.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Clients', value: asText(records.length, '0') },
      { label: 'Positions OK', value: asText(records.filter((item) => item?.lat != null && item?.lng != null).length, '0') },
      { label: 'Crédit total', value: formatMoney(records.reduce((sum, item) => sum + asNumber(item?.credit_balance), 0)) },
    ],
  },
  {
    key: 'credit_aging_customers_list',
    label: 'Créances clients par ancienneté',
    description: 'Solde dû par client, réparti par ancienneté (0-30, 31-60, 61-90, +90 jours).',
    scope: 'list',
    section: 'finance',
    title: 'Créances clients',
    filename: 'creances_clients',
    orientation: 'landscape',
    fields: [
      field('customer_name', 'Client', (row) => asText(row?.customer_name), 'Nom du client.'),
      field('b0_30', '0-30 j', (row) => formatMoney(row?.b0_30), 'Dû depuis 0 à 30 jours.'),
      field('b31_60', '31-60 j', (row) => formatMoney(row?.b31_60), 'Dû depuis 31 à 60 jours.'),
      field('b61_90', '61-90 j', (row) => formatMoney(row?.b61_90), 'Dû depuis 61 à 90 jours.'),
      field('b90_plus', '+90 j', (row) => formatMoney(row?.b90_plus), 'Dû depuis plus de 90 jours.'),
      field('total_due', 'Total dû', (row) => formatMoney(row?.total_due), 'Total dû, toutes anciennetés.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Clients', value: asText(records.length, '0') },
      { label: 'Total dû', value: formatMoney(records.reduce((sum, row) => sum + asNumber(row?.total_due), 0)) },
    ],
  },
  {
    key: 'products_list',
    label: 'Produits - liste',
    description: 'Liste du catalogue avec prix et seuils minimum.',
    scope: 'list',
    section: 'catalog',
    title: 'Produits',
    filename: 'produits',
    orientation: 'landscape',
    fields: [
      field('name', 'Nom', (product) => asText(product?.name), 'Désignation produit.'),
      field('reference', 'Référence', (product) => asText(product?.reference), 'Référence interne.'),
      field('category', 'Catégorie', (product) => asText(product?.category), 'Catégorie produit.'),
      field('buy_price', 'Prix achat', (product) => product?.buy_price != null ? formatMoney(product.buy_price) : '-', "Coût d'achat.", { defaultEnabled: false }),
      field('depot_price', 'Prix dépôt', (product) => formatMoney(product?.depot_price ?? product?.price), 'Prix dépôt / vente.'),
      field('depot_qty', 'Stock dépôt', (product) => formatQuantity(product?.depot_qty), 'Stock dépôt courant.'),
      field('camion_qty', 'Stock camion', (product) => formatQuantity(product?.camion_qty), 'Stock total camion.'),
      field('min_stock', 'Min stock', (product) => formatQuantity(Math.max(asNumber(product?.min_stock, 1), 1)), 'Seuil minimum.'),
      field('unit', 'Unité', (product) => asText(product?.unit), 'Unité produit.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Produits', value: asText(records.length, '0') },
      { label: 'Stock bas', value: asText(records.filter((product) => asNumber(product?.depot_qty) <= Math.max(asNumber(product?.min_stock, 1), 1)).length, '0') },
      { label: 'Valeur dépôt', value: formatMoney(records.reduce((sum, product) => sum + (asNumber(product?.depot_qty) * asNumber(product?.buy_price ?? product?.depot_price ?? product?.price)), 0)) },
    ],
  },
  {
    key: 'invoices_list',
    label: 'Factures - liste',
    description: 'Liste des factures de la vue actuelle avec paiement et statut.',
    scope: 'list',
    section: 'sales',
    title: 'Factures',
    filename: 'factures',
    orientation: 'landscape',
    fields: [
      field('number', 'Numéro', (invoice) => asText(invoice?.number), 'Numéro de facture.'),
      field('customer_name', 'Client', (invoice) => asText(invoice?.customer_name), 'Client facture.'),
      field('rep_name', 'Commercial', (invoice) => asText(invoice?.rep_name), 'Commercial associé.', { defaultEnabled: false }),
      field('total', 'Total', (invoice) => formatMoney(invoice?.total), 'Total facture.'),
      field('paid_amount', 'Payé', (invoice) => formatMoney(invoice?.paid_amount), 'Montant déjà encaissé.', { defaultEnabled: false }),
      field('due_amount', 'Reste dû', (invoice) => formatMoney(invoiceDue(invoice)), 'Montant restant.'),
      field('payment_status', 'Paiement', (invoice) => paymentStatusLabel(invoice?.payment_status?.value ?? invoice?.payment_status), 'État du paiement.'),
      field('status', 'Statut', (invoice) => invoiceStatusLabel(invoice?.status?.value ?? invoice?.status), 'État métier.'),
      field('created_at', 'Date', (invoice) => formatDate(invoice?.created_at), 'Date facture.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Factures', value: asText(records.length, '0') },
      { label: 'Total', value: formatMoney(records.reduce((sum, invoice) => sum + asNumber(invoice?.total), 0)) },
      { label: 'Reste dû', value: formatMoney(records.reduce((sum, invoice) => sum + invoiceDue(invoice), 0)) },
    ],
  },
  {
    key: 'invoice_item',
    label: 'Facture - ligne',
    description: 'Pièce unitaire depuis la liste des factures.',
    scope: 'item',
    section: 'sales',
    title: 'Facture',
    filename: 'facture',
    orientation: 'portrait',
    fields: [
      field('number', 'Numéro', (invoice) => asText(invoice?.number), 'Numéro facture.'),
      field('customer_name', 'Client', (invoice) => asText(invoice?.customer_name), 'Client facture.'),
      field('rep_name', 'Commercial', (invoice) => asText(invoice?.rep_name), 'Commercial associé.', { defaultEnabled: false }),
      field('total', 'Total', (invoice) => formatMoney(invoice?.total), 'Montant total.'),
      field('paid_amount', 'Payé', (invoice) => formatMoney(invoice?.paid_amount), 'Montant encaissé.', { defaultEnabled: false }),
      field('due_amount', 'Reste dû', (invoice) => formatMoney(invoiceDue(invoice)), 'Solde restant.'),
      field('payment_status', 'Paiement', (invoice) => paymentStatusLabel(invoice?.payment_status?.value ?? invoice?.payment_status), 'État du paiement.'),
      field('status', 'Statut', (invoice) => invoiceStatusLabel(invoice?.status?.value ?? invoice?.status), 'État de la facture.'),
      field('created_at', 'Date', (invoice) => formatDate(invoice?.created_at), 'Date facture.'),
    ],
    buildSummary: ({ record }) => [
      { label: 'Total', value: formatMoney(record?.total) },
      { label: 'Reste dû', value: formatMoney(invoiceDue(record)) },
    ],
  },
  {
    key: 'invoice_detail',
    label: 'Facture - détail',
    description: "Version détaillée d'une facture avec lignes et résumé de paiement.",
    scope: 'item',
    section: 'sales',
    title: 'Facture détaillée',
    filename: 'facture_detail',
    orientation: 'portrait',
    alwaysVisibleNote: 'Les lignes produit et le résumé financier restent toujours inclus dans la facture détaillée.',
    fields: [
      field('number', 'Numéro', (invoice) => asText(invoice?.number), 'Numéro facture.'),
      field('created_at', 'Date', (invoice) => formatDate(invoice?.created_at), 'Date facture.'),
      field('customer_name', 'Client', (invoice) => asText(invoice?.customer_name), 'Client facture.'),
      field('customer_phone', 'Téléphone client', (invoice) => asText(invoice?.customer_phone), 'Contact client.', { defaultEnabled: false }),
      field('customer_address', 'Adresse client', (invoice) => asText(invoice?.customer_address), 'Adresse client.', { defaultEnabled: false }),
      field('customer_tax_id', 'MF client', (invoice) => asText(invoice?.customer_tax_id), 'Matricule fiscal.', { defaultEnabled: false }),
      field('rep_name', 'Commercial', (invoice) => asText(invoice?.rep_name), 'Commercial associé.'),
      field('zone_name', 'Zone', (invoice) => asText(invoice?.zone?.name), 'Zone commerciale.', { defaultEnabled: false }),
      field('payment_status', 'Paiement', (invoice) => paymentStatusLabel(invoice?.payment_status?.value ?? invoice?.payment_status), 'État du paiement.'),
      field('status', 'Statut', (invoice) => invoiceStatusLabel(invoice?.status?.value ?? invoice?.status), 'État de la facture.'),
      field('subtotal', 'Sous-total', (invoice) => formatMoney(invoice?.subtotal), 'Sous-total.'),
      field('tax_rate', 'TVA', (invoice) => invoice?.tax_rate != null ? `${asNumber(invoice.tax_rate).toFixed(2)} %` : '-', 'Taux TVA.', { defaultEnabled: false }),
      field('tax_amount', 'Montant TVA', (invoice) => formatMoney(invoice?.tax_amount), 'Montant TVA.', { defaultEnabled: false }),
      field('total', 'Total', (invoice) => formatMoney(invoice?.total), 'Montant total.'),
      field('paid_amount', 'Payé', (invoice) => formatMoney(invoice?.paid_amount), 'Montant encaissé.'),
      field('due_amount', 'Reste dû', (invoice) => formatMoney(invoiceDue(invoice)), 'Solde restant.'),
      field('notes', 'Notes', (invoice) => asText(invoice?.notes), 'Notes facture.', { defaultEnabled: false }),
    ],
    buildSummary: ({ record }) => [
      { label: 'Total', value: formatMoney(record?.total) },
      { label: 'Payé', value: formatMoney(record?.paid_amount) },
      { label: 'Reste dû', value: formatMoney(invoiceDue(record)) },
    ],
    buildSections: ({ record }) => [
      {
        kind: 'table',
        title: 'Lignes facture',
        columns: ['Produit', 'Qté', 'P.U.', 'Total'],
        rows: (record?.lines ?? []).map((line) => [
          asText(line?.product_name),
          `${formatQuantity(line?.qty)} ${asText(line?.unit, '').trim()}`.trim(),
          formatMoney(line?.unit_price ?? line?.price),
          formatMoney(line?.total),
        ]),
        emptyMessage: 'Aucune ligne facture.',
      },
    ],
  },
  {
    key: 'expenses_list',
    label: 'Dépenses - liste',
    description: 'Liste filtrée des dépenses de la vue courante.',
    scope: 'list',
    section: 'finance',
    title: 'Dépenses',
    filename: 'depenses',
    orientation: 'portrait',
    fields: [
      field('expense_date', 'Date', (expense) => formatDate(expense?.expense_date), 'Date de dépense.'),
      field('category', 'Catégorie', (expense) => expenseCategoryLabel(expense), 'Catégorie dynamique.'),
      field('label', 'Libellé', (expense) => asText(expense?.label), 'Désignation.'),
      field('amount', 'Montant', (expense) => formatMoney(expense?.amount), 'Montant dépensé.'),
      field('withholding_rate', 'Retenue source %', (expense) => `${formatQuantity(expense?.withholding_rate ?? 0)}%`, 'Taux retenu à la source.', { defaultEnabled: false }),
      field('withholding_amount', 'Retenue source', (expense) => formatMoney(expense?.withholding_amount), 'Montant retenu à la source.', { defaultEnabled: false }),
      field('net_amount', 'Net à régler', (expense) => formatMoney(expense?.net_amount), 'Montant net après retenue.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Dépenses', value: asText(records.length, '0') },
      { label: 'Total', value: formatMoney(records.reduce((sum, expense) => sum + asNumber(expense?.amount), 0)) },
      { label: 'Net à régler', value: formatMoney(records.reduce((sum, expense) => sum + asNumber(expense?.net_amount), 0)) },
    ],
  },
  {
    key: 'expense_item',
    label: 'Dépense - ligne',
    description: 'Pièce unitaire pour une dépense.',
    scope: 'item',
    section: 'finance',
    title: 'Dépense',
    filename: 'depense',
    orientation: 'portrait',
    fields: [
      field('expense_date', 'Date', (expense) => formatDate(expense?.expense_date), 'Date de dépense.'),
      field('category', 'Catégorie', (expense) => expenseCategoryLabel(expense), 'Catégorie.'),
      field('label', 'Libellé', (expense) => asText(expense?.label), 'Désignation.'),
      field('amount', 'Montant', (expense) => formatMoney(expense?.amount), 'Montant.'),
      field('withholding_rate', 'Retenue source %', (expense) => `${formatQuantity(expense?.withholding_rate ?? 0)}%`, 'Taux retenu à la source.', { defaultEnabled: false }),
      field('withholding_amount', 'Retenue source', (expense) => formatMoney(expense?.withholding_amount), 'Montant retenu à la source.', { defaultEnabled: false }),
      field('net_amount', 'Net à régler', (expense) => formatMoney(expense?.net_amount), 'Montant net après retenue.'),
      field('created_at', 'Créée le', (expense) => formatDateTime(expense?.created_at), 'Date de création.', { defaultEnabled: false }),
    ],
    buildSummary: ({ record }) => [
      { label: 'Montant', value: formatMoney(record?.amount) },
      { label: 'Net à régler', value: formatMoney(record?.net_amount) },
    ],
  },
  {
    key: 'expenses_history_list',
    label: 'Dépenses - historique',
    description: 'Timeline des créations de dépense et paiements affichés dans la vue courante.',
    scope: 'list',
    section: 'finance',
    title: 'Historique des dépenses',
    filename: 'depenses_historique',
    orientation: 'landscape',
    fields: [
      field('event_date', 'Date événement', (entry) => formatDate(entry?.event_date), 'Date de création ou de paiement.'),
      field('event_type', 'Événement', (entry) => expenseHistoryEventLabel(entry), 'Création ou paiement.'),
      field('category_label', 'Catégorie', (entry) => expenseCategoryLabel(entry), 'Catégorie rattachée.'),
      field('label', 'Libellé', (entry) => asText(entry?.label), 'Libellé de la dépense.'),
      field('expense_amount', 'Montant dépense', (entry) => formatMoney(entry?.expense_amount), 'Montant total de la dépense.'),
      field('withholding_amount', 'Retenue source', (entry) => formatMoney(entry?.withholding_amount), 'Retenue source enregistrée.', { defaultEnabled: false }),
      field('net_amount', 'Net à régler', (entry) => formatMoney(entry?.net_amount), 'Montant net après retenue.'),
      field('payment_amount', 'Paiement', (entry) => asNumber(entry?.payment_amount) > 0 ? formatMoney(entry?.payment_amount) : '-', "Montant du paiement lié à l'événement."),
      field('remaining_amount_after_event', 'Reste après', (entry) => formatMoney(entry?.remaining_amount_after_event), "Reste après l'événement."),
      field('event_status_after', 'Statut après', (entry) => paymentStatusLabel(entry?.event_status_after), "Statut après l'événement."),
      field('created_by', 'Saisi par', (entry) => asText(entry?.created_by), "Utilisateur ayant saisi l'événement."),
      field('note', 'Note', (entry) => asText(entry?.note), 'Note du paiement.', { defaultEnabled: false }),
    ],
    buildSummary: ({ records }) => [
      { label: 'Événements', value: asText(records.length, '0') },
      {
        label: 'Dépenses créées',
        value: formatMoney(records.reduce((sum, entry) => sum + (entry?.event_type === 'expense' ? asNumber(entry?.expense_amount) : 0), 0)),
      },
      {
        label: 'Paiements',
        value: formatMoney(records.reduce((sum, entry) => sum + asNumber(entry?.payment_amount), 0)),
      },
      {
        label: 'Net à régler',
        value: formatMoney(records.reduce((sum, entry) => sum + (entry?.event_type === 'expense' ? asNumber(entry?.net_amount) : 0), 0)),
      },
    ],
  },
  {
    key: 'route_sessions_list',
    label: 'Sorties journée - liste',
    description: 'Sessions de route affichées dans la vue actuelle.',
    scope: 'list',
    section: 'operations',
    title: 'Sorties journée',
    filename: 'sorties_journee',
    orientation: 'landscape',
    fields: [
      field('session_date', 'Date', (session) => formatDate(session?.session_date), 'Date de session.'),
      field('rep_name', 'Commercial', (session) => asText(session?.rep?.name), 'Commercial affecté.'),
      field('zone_name', 'Zone', (session) => asText(session?.zone?.name), 'Zone de session.'),
      field('camion_name', 'Camion', (session) => routeCamionLabel(session), 'Camion.'),
      field('camion_plate', 'Plaque', (session) => routeCamionPlate(session), 'Plaque camion.', { defaultEnabled: false }),
      field('total_sold', 'Total vendu', (session) => formatMoney(session?.total_sold), 'CA session.'),
      field('profit_total', 'Bénéfice', (session) => formatMoney(session?.profit_total), 'Bénéfice session.'),
      field('credit_given', 'Crédit accordé', (session) => formatMoney(session?.credit_given), 'Crédit dû.'),
      field('status', 'Statut', (session) => routeStatusLabel(session?.status?.value ?? session?.status), 'État session.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Sessions', value: asText(records.length, '0') },
      { label: 'Total vendu', value: formatMoney(records.reduce((sum, session) => sum + asNumber(session?.total_sold), 0)) },
      { label: 'Bénéfice', value: formatMoney(records.reduce((sum, session) => sum + asNumber(session?.profit_total), 0)) },
    ],
  },
  {
    key: 'route_session_item',
    label: 'Sortie journée - ligne',
    description: 'Pièce unitaire pour une session terrain.',
    scope: 'item',
    section: 'operations',
    title: 'Session terrain',
    filename: 'session_terrain',
    orientation: 'portrait',
    fields: [
      field('session_date', 'Date', (session) => formatDate(session?.session_date), 'Date de session.'),
      field('rep_name', 'Commercial', (session) => asText(session?.rep?.name), 'Commercial.'),
      field('zone_name', 'Zone', (session) => asText(session?.zone?.name), 'Zone.'),
      field('camion_name', 'Camion', (session) => routeCamionLabel(session), 'Camion.'),
      field('camion_plate', 'Plaque', (session) => routeCamionPlate(session), 'Plaque.', { defaultEnabled: false }),
      field('total_sold', 'Total vendu', (session) => formatMoney(session?.total_sold), 'CA.'),
      field('profit_total', 'Bénéfice', (session) => formatMoney(session?.profit_total), 'Bénéfice.'),
      field('credit_given', 'Crédit accordé', (session) => formatMoney(session?.credit_given), 'Crédit.'),
      field('status', 'Statut', (session) => routeStatusLabel(session?.status?.value ?? session?.status), 'État session.'),
    ],
    buildSummary: ({ record }) => [
      { label: 'Vendu', value: formatMoney(record?.total_sold) },
      { label: 'Bénéfice', value: formatMoney(record?.profit_total) },
    ],
  },
  {
    key: 'depot_stock_list',
    label: 'Dépôt - stock',
    description: 'État du stock dépôt actuellement visible.',
    scope: 'list',
    section: 'operations',
    title: 'Stock dépôt',
    filename: 'stock_depot',
    orientation: 'landscape',
    fields: [
      field('product_name', 'Produit', (item) => asText(item?.product?.name), 'Produit.'),
      field('reference', 'Référence', (item) => asText(item?.product?.reference), 'Référence.'),
      field('category', 'Catégorie', (item) => asText(item?.product?.category), 'Catégorie.', { defaultEnabled: false }),
      field('unit', 'Unité', (item) => asText(item?.product?.unit), 'Unité.'),
      field('qty', 'Qté dépôt', (item) => formatQuantity(stockQty(item)), 'Stock dépôt.'),
      field('min_stock', 'Min stock', (item) => formatQuantity(stockMin(item)), 'Seuil minimum.'),
      field('status', 'Statut', (item) => stockStatus(item), 'État de stock.'),
      field('updated_at', 'Dernière maj', (item) => formatDateTime(item?.updated_at), 'Dernière mise à jour.', { defaultEnabled: false }),
    ],
    buildSummary: ({ records }) => [
      { label: 'Références', value: asText(records.length, '0') },
      { label: 'Total unités', value: formatQuantity(records.reduce((sum, item) => sum + stockQty(item), 0)) },
      { label: 'Stock bas', value: asText(records.filter((item) => stockQty(item) <= stockMin(item)).length, '0') },
    ],
  },
  {
    key: 'stock_movements_list',
    label: 'Dépôt - mouvements',
    description: 'Journal visible des mouvements dépôt et terrain.',
    scope: 'list',
    section: 'operations',
    title: 'Mouvements stock',
    filename: 'mouvements_stock',
    orientation: 'landscape',
    fields: [
      field('movement_type', 'Type', (movement) => mouvementLabel(movement?.type?.value ?? movement?.type), 'Type mouvement.'),
      field('product_name', 'Produit', (movement) => asText(movement?.product?.name), 'Produit.'),
      field('reference', 'Référence', (movement) => asText(movement?.product?.reference), 'Référence.', { defaultEnabled: false }),
      field('user_name', 'Utilisateur', (movement) => asText(movement?.user?.name), 'Utilisateur origine.'),
      field('qty', 'Quantité', (movement) => `${asNumber(movement?.qty) >= 0 ? '+' : ''}${formatQuantity(movement?.qty)}`, 'Quantité.'),
      field('note', 'Note', (movement) => asText(movement?.note), 'Note interne.', { defaultEnabled: false }),
      field('created_at', 'Date / heure', (movement) => formatDateTime(movement?.created_at), 'Date mouvement.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Mouvements', value: asText(records.length, '0') },
      { label: 'Qté nette', value: `${inventoryDeltaTotal(records) >= 0 ? '+' : ''}${formatQuantity(inventoryDeltaTotal(records))}` },
    ],
  },
  {
    key: 'stock_movement_item',
    label: 'Mouvement stock - ligne',
    description: 'Pièce unitaire pour un mouvement de stock.',
    scope: 'item',
    section: 'operations',
    title: 'Mouvement stock',
    filename: 'mouvement_stock',
    orientation: 'portrait',
    fields: [
      field('movement_type', 'Type', (movement) => mouvementLabel(movement?.type?.value ?? movement?.type), 'Type mouvement.'),
      field('product_name', 'Produit', (movement) => asText(movement?.product?.name), 'Produit.'),
      field('reference', 'Référence', (movement) => asText(movement?.product?.reference), 'Référence.', { defaultEnabled: false }),
      field('user_name', 'Utilisateur', (movement) => asText(movement?.user?.name), 'Utilisateur.'),
      field('qty', 'Quantité', (movement) => `${asNumber(movement?.qty) >= 0 ? '+' : ''}${formatQuantity(movement?.qty)}`, 'Quantité.'),
      field('note', 'Note', (movement) => asText(movement?.note), 'Note.', { defaultEnabled: false }),
      field('created_at', 'Date / heure', (movement) => formatDateTime(movement?.created_at), 'Date mouvement.'),
    ],
    buildSummary: ({ record }) => [
      { label: 'Quantité', value: `${asNumber(record?.qty) >= 0 ? '+' : ''}${formatQuantity(record?.qty)}` },
    ],
  },
  {
    key: 'inventory_history_list',
    label: 'Inventaire - historique',
    description: "Historique des ajustements d'inventaire visibles dans le panneau d'audit.",
    scope: 'list',
    section: 'operations',
    title: "Historique d'inventaire",
    filename: 'inventaire_historique',
    orientation: 'portrait',
    fields: [
      field('product_name', 'Produit', (movement) => asText(movement?.product?.name ?? movement?.product_name), 'Produit.'),
      field('reference', 'Référence', (movement) => asText(movement?.product?.reference), 'Référence.', { defaultEnabled: false }),
      field('user_name', 'Utilisateur', (movement) => asText(movement?.user?.name), 'Utilisateur.'),
      field('qty', 'Écart', (movement) => `${asNumber(movement?.qty) >= 0 ? '+' : ''}${formatQuantity(movement?.qty)}`, "Écart d'inventaire."),
      field('note', 'Note', (movement) => asText(movement?.note), 'Note batch.'),
      field('created_at', 'Date / heure', (movement) => formatDateTime(movement?.created_at), 'Date ajustement.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Ajustements', value: asText(records.length, '0') },
      { label: 'Écart net', value: `${inventoryDeltaTotal(records) >= 0 ? '+' : ''}${formatQuantity(inventoryDeltaTotal(records))}` },
    ],
  },
  {
    key: 'salary_run_item',
    label: 'Fiche de paie',
    description: 'Bulletin de paie unitaire pour un employé et une période.',
    scope: 'item',
    section: 'hr',
    title: 'Fiche de paie',
    filename: 'fiche_de_paie',
    orientation: 'portrait',
    fields: [
      field('employee_name', 'Employé', (run) => asText(run?.employee?.name), 'Employé concerné.'),
      field('period', 'Période', (run) => salaryRunPeriodLabel(run), 'Mois et année de paie.'),
      field('base_salary', 'Salaire de base', (run) => formatMoney(run?.base_salary), 'Salaire de base.'),
      field('primes_total', 'Primes', (run) => formatMoney(run?.primes_total), 'Total des primes de la période.'),
      field('avances_deducted', 'Avances déduites', (run) => formatMoney(run?.avances_deducted), 'Remboursements d’avance déduits.'),
      field('retenues_total', 'Retenues', (run) => formatMoney(run?.retenues_total), 'Total des retenues.'),
      field('cnss_employee_amount', 'CNSS salarié', (run) => formatMoney(run?.cnss_employee_amount), 'Cotisation CNSS part salarié (estimation).'),
      field('cnss_employer_amount', 'CNSS employeur', (run) => formatMoney(run?.cnss_employer_amount), 'Cotisation CNSS part employeur (estimation).', { defaultEnabled: false }),
      field('gross_pay', 'Brut', (run) => formatMoney(run?.gross_pay), 'Salaire brut.'),
      field('net_pay', 'Net à payer', (run) => formatMoney(run?.net_pay), 'Montant net à payer.'),
      field('status', 'Statut', (run) => salaryRunStatusLabel(run?.status), 'État de la fiche de paie.'),
      field('paid_at', 'Payée le', (run) => run?.paid_at ? formatDate(run.paid_at) : '-', 'Date de paiement.', { defaultEnabled: false }),
      field('note', 'Note', (run) => asText(run?.note), 'Note interne.', { defaultEnabled: false }),
    ],
    buildSummary: ({ record }) => [
      { label: 'Brut', value: formatMoney(record?.gross_pay) },
      { label: 'Net à payer', value: formatMoney(record?.net_pay) },
    ],
  },
  {
    key: 'salary_runs_list',
    label: 'Fiches de paie - liste',
    description: 'Fiches de paie de la période affichée, tous employés.',
    scope: 'list',
    section: 'hr',
    title: 'Fiches de paie',
    filename: 'fiches_de_paie',
    orientation: 'landscape',
    fields: [
      field('employee_name', 'Employé', (run) => asText(run?.employee?.name), 'Employé.'),
      field('period', 'Période', (run) => salaryRunPeriodLabel(run), 'Mois et année.'),
      field('base_salary', 'Salaire de base', (run) => formatMoney(run?.base_salary), 'Salaire de base.'),
      field('primes_total', 'Primes', (run) => formatMoney(run?.primes_total), 'Primes.'),
      field('avances_deducted', 'Avances déduites', (run) => formatMoney(run?.avances_deducted), 'Avances déduites.'),
      field('cnss_employee_amount', 'CNSS salarié', (run) => formatMoney(run?.cnss_employee_amount), 'CNSS salarié (estimation).'),
      field('net_pay', 'Net à payer', (run) => formatMoney(run?.net_pay), 'Net à payer.'),
      field('status', 'Statut', (run) => salaryRunStatusLabel(run?.status), 'État.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Fiches', value: asText(records.length, '0') },
      { label: 'Total net', value: formatMoney(records.reduce((sum, run) => sum + asNumber(run?.net_pay), 0)) },
      { label: 'Total CNSS salarié', value: formatMoney(records.reduce((sum, run) => sum + asNumber(run?.cnss_employee_amount), 0)) },
    ],
  },
  {
    key: 'camions_list',
    label: 'Camions - liste',
    description: 'État de la flotte : statut, disponibilité et affectation.',
    scope: 'list',
    section: 'operations',
    title: 'Camions',
    filename: 'camions',
    orientation: 'landscape',
    fields: [
      field('name', 'Camion', (camion) => asText(camion?.name), 'Nom du camion.'),
      field('plate', 'Plaque', (camion) => asText(camion?.plate), 'Plaque d’immatriculation.'),
      field('active', 'Actif', (camion) => (camion?.active ? 'Oui' : 'Non'), 'Statut actif/inactif.'),
      field('operational_status_label', 'État', (camion) => asText(camion?.operational_status_label), 'État opérationnel.'),
      field('workflow_status_label', 'Disponibilité', (camion) => asText(camion?.workflow_status_label), 'Disponibilité actuelle.'),
      field('assigned_rep', 'Affecté à', (camion) => asText(camion?.current_route_session?.rep?.name), 'Commercial affecté (session en cours).', { defaultEnabled: false }),
    ],
    buildSummary: ({ records }) => [
      { label: 'Camions', value: asText(records.length, '0') },
      { label: 'Actifs', value: asText(records.filter((camion) => camion?.active).length, '0') },
    ],
  },
  {
    key: 'users_list',
    label: 'Utilisateurs - liste',
    description: 'Comptes utilisateurs avec rôle, zone et statut.',
    scope: 'list',
    section: 'operations',
    title: 'Utilisateurs',
    filename: 'utilisateurs',
    orientation: 'landscape',
    fields: [
      field('name', 'Nom', (entry) => asText(entry?.name), 'Nom.'),
      field('email', 'Email', (entry) => asText(entry?.email), 'Email.'),
      field('role', 'Rôle', (entry) => asText(entry?.role), 'Rôle applicatif.'),
      field('zone_name', 'Zone', (entry) => asText(entry?.zone?.name), 'Zone commerciale.', { defaultEnabled: false }),
      field('depot_name', 'Dépôt', (entry) => asText(entry?.depot?.name), 'Dépôt affecté.', { defaultEnabled: false }),
      field('customers_count', 'Clients affectés', (entry) => asText(entry?.customers_count ?? 0), 'Nombre de clients affectés.'),
      field('active', 'Actif', (entry) => (entry?.active ? 'Oui' : 'Non'), 'Statut du compte.'),
      field('created_at', 'Créé le', (entry) => (entry?.created_at ? formatDate(entry.created_at) : '-'), 'Date de création.', { defaultEnabled: false }),
    ],
    buildSummary: ({ records }) => [
      { label: 'Utilisateurs', value: asText(records.length, '0') },
      { label: 'Actifs', value: asText(records.filter((entry) => entry?.active).length, '0') },
    ],
  },
  {
    key: 'pos_depots_list',
    label: 'Points de vente - liste',
    description: 'Liste des points de vente avec code, adresse et statut.',
    scope: 'list',
    section: 'operations',
    title: 'Points de vente',
    filename: 'points_de_vente',
    orientation: 'landscape',
    fields: [
      field('name', 'Point de vente', (depot) => asText(depot?.name), 'Nom du point de vente.'),
      field('code', 'Code', (depot) => asText(depot?.code), 'Code interne.'),
      field('address', 'Adresse', (depot) => asText(depot?.address), 'Adresse.'),
      field('stocked_products_count', 'Références', (depot) => asText(depot?.stocked_products_count ?? 0), 'Nombre de références en stock.'),
      field('users_count', 'Équipe', (depot) => asText(depot?.users_count ?? 0), 'Effectif affecté.'),
      field('total_stock_qty', 'Stock total', (depot) => formatQuantity(depot?.total_stock_qty), 'Quantité totale en stock.'),
      field('active', 'Actif', (depot) => (depot?.active ? 'Oui' : 'Non'), 'Statut actif/inactif.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Points de vente', value: asText(records.length, '0') },
      { label: 'Actifs', value: asText(records.filter((depot) => depot?.active).length, '0') },
    ],
  },
  {
    key: 'employees_list',
    label: 'Employés - liste',
    description: 'Liste des employés avec statut de profil et salaire de base.',
    scope: 'list',
    section: 'hr',
    title: 'Employés',
    filename: 'employes',
    orientation: 'landscape',
    fields: [
      field('name', 'Employé', (entry) => asText(entry?.name), 'Nom de l’employé.'),
      field('email', 'Email', (entry) => asText(entry?.email), 'Email.'),
      field('hire_date', 'Date d’embauche', (entry) => (entry?.hire_date ? formatDate(entry.hire_date) : '-'), 'Date d’embauche.'),
      field('base_salary', 'Salaire de base', (entry) => formatMoney(entry?.base_salary), 'Salaire de base.'),
      field('profile_status', 'Profil', (entry) => (entry?.has_profile ? 'Complet' : 'À compléter'), 'État du dossier RH.'),
      field('active', 'Actif', (entry) => (entry?.active ? 'Oui' : 'Non'), 'Statut du compte.', { defaultEnabled: false }),
    ],
    buildSummary: ({ records }) => [
      { label: 'Employés', value: asText(records.length, '0') },
      { label: 'Profils complets', value: asText(records.filter((entry) => entry?.has_profile).length, '0') },
    ],
  },
  {
    key: 'employee_profile_item',
    label: 'Employé - fiche',
    description: 'Fiche synthétique d’un employé (contact, embauche, salaire).',
    scope: 'item',
    section: 'hr',
    title: 'Fiche employé',
    filename: 'fiche_employe',
    orientation: 'portrait',
    fields: [
      field('name', 'Nom', (entry) => asText(entry?.name), 'Nom de l’employé.'),
      field('email', 'Email', (entry) => asText(entry?.email), 'Email.'),
      field('hire_date', 'Date d’embauche', (entry) => (entry?.hire_date ? formatDate(entry.hire_date) : '-'), 'Date d’embauche.'),
      field('base_salary', 'Salaire de base', (entry) => formatMoney(entry?.base_salary), 'Salaire de base.'),
      field('profile_status', 'Profil', (entry) => (entry?.has_profile ? 'Complet' : 'À compléter'), 'État du dossier RH.'),
      field('active', 'Statut du compte', (entry) => (entry?.active ? 'Actif' : 'Inactif'), 'Statut du compte.'),
    ],
    buildSummary: ({ record }) => [
      { label: 'Employé', value: asText(record?.name) },
      { label: 'Salaire de base', value: formatMoney(record?.base_salary) },
    ],
  },
  {
    key: 'employee_transactions_list',
    label: 'Employé - primes / avances',
    description: 'Historique des primes, avances et retenues pour un employé.',
    scope: 'list',
    section: 'hr',
    title: 'Primes et avances',
    filename: 'employe_primes_avances',
    orientation: 'portrait',
    fields: [
      field('created_at', 'Date', (entry) => formatDateTime(entry?.created_at), 'Date de la saisie.'),
      field('type', 'Type', (entry) => ledgerTypeLabel(entry?.type), 'Type de mouvement.'),
      field('amount', 'Montant', (entry) => formatMoney(entry?.amount), 'Montant.'),
      field('balance_after', 'Solde avance', (entry) => formatMoney(entry?.balance_after), 'Solde d’avance après ce mouvement.'),
      field('related_period', 'Période', (entry) => asText(entry?.related_period), 'Mois de rattachement.', { defaultEnabled: false }),
      field('created_by_name', 'Saisi par', (entry) => asText(entry?.created_by_name), 'Utilisateur ayant saisi le mouvement.', { defaultEnabled: false }),
      field('note', 'Note', (entry) => asText(entry?.note), 'Note.', { defaultEnabled: false }),
    ],
    buildSummary: ({ records }) => [
      { label: 'Mouvements', value: asText(records.length, '0') },
      { label: 'Solde avance actuel', value: formatMoney(records[0]?.balance_after ?? 0) },
    ],
  },
  {
    key: 'employee_leaves_list',
    label: 'Employé - congés',
    description: 'Historique des congés pour un employé.',
    scope: 'list',
    section: 'hr',
    title: 'Congés',
    filename: 'employe_conges',
    orientation: 'portrait',
    fields: [
      field('type', 'Type', (leave) => leaveTypeLabel(leave?.type), 'Type de congé.'),
      field('date_start', 'Du', (leave) => formatDate(leave?.date_start), 'Date de début.'),
      field('date_end', 'Au', (leave) => formatDate(leave?.date_end), 'Date de fin.'),
      field('days_count', 'Jours', (leave) => formatQuantity(leave?.days_count), 'Nombre de jours.'),
      field('status', 'Statut', (leave) => leaveStatusLabel(leave?.status), 'État de la demande.'),
      field('note', 'Note', (leave) => asText(leave?.note), 'Note.', { defaultEnabled: false }),
    ],
    buildSummary: ({ records }) => [
      { label: 'Congés', value: asText(records.length, '0') },
      { label: 'Jours pris', value: formatQuantity(records.filter((leave) => ['approved', 'taken'].includes(leave?.status)).reduce((sum, leave) => sum + asNumber(leave?.days_count), 0)) },
    ],
  },
  {
    key: 'supervisor_report_item',
    label: 'Rapport superviseur',
    description: 'Rapport consolidé : ventes, produits, commerciaux, créances et stock sur une période.',
    scope: 'item',
    section: 'operations',
    title: 'Rapport de gestion',
    filename: 'rapport_superviseur',
    orientation: 'portrait',
    fields: [
      field('period_label', 'Période', (report) => asText(report?.period_label), 'Période couverte par le rapport.'),
      field('revenue', 'Chiffre d’affaires', (report) => formatMoney(report?.revenue), 'Chiffre d’affaires sur la période.'),
      field('profit', 'Bénéfice', (report) => formatMoney(report?.profit), 'Bénéfice sur la période.'),
      field('expenses', 'Dépenses', (report) => formatMoney(report?.expenses), 'Dépenses sur la période.'),
      field('credit_outstanding', 'Créances en cours', (report) => formatMoney(report?.credit_outstanding), 'Total des créances clients en cours.'),
      field('stock_value', 'Valeur du stock', (report) => formatMoney(report?.stock_value), 'Valeur totale du stock.'),
      field('low_stock_count', 'Références en stock bas', (report) => asText(report?.low_stock_count), 'Nombre de références sous le seuil minimum.'),
    ],
    buildSummary: ({ record }) => [
      { label: 'Chiffre d’affaires', value: formatMoney(record?.revenue) },
      { label: 'Bénéfice', value: formatMoney(record?.profit) },
    ],
    buildSections: ({ record }) => [
      {
        kind: 'table',
        title: 'Ventes par canal',
        columns: ['Canal', 'Chiffre d’affaires'],
        rows: (record?.by_channel ?? []).map((row) => [asText(row.label), formatMoney(row.revenue)]),
        emptyMessage: 'Aucune vente sur la période.',
      },
      {
        kind: 'table',
        title: 'Top produits',
        columns: ['Produit', 'Qté vendue', 'Chiffre d’affaires'],
        rows: (record?.by_product ?? []).map((row) => [asText(row.product_name), formatQuantity(row.qty_sold), formatMoney(row.revenue)]),
        emptyMessage: 'Aucune donnée produit sur la période.',
      },
      {
        kind: 'table',
        title: 'Performance des commerciaux',
        columns: ['Commercial', 'Chiffre d’affaires', 'Marge'],
        rows: (record?.by_rep ?? []).map((row) => [asText(row.rep_name), formatMoney(row.revenue), `${formatQuantity(row.margin_pct)}%`]),
        emptyMessage: 'Aucune donnée commerciale sur la période.',
      },
      {
        kind: 'table',
        title: 'Principales créances clients',
        columns: ['Client', 'Montant dû'],
        rows: (record?.top_debtors ?? []).map((row) => [asText(row.customer_name), formatMoney(row.total_due)]),
        emptyMessage: 'Aucune créance en cours.',
      },
      {
        kind: 'table',
        title: 'Stock par dépôt',
        columns: ['Dépôt', 'Quantité', 'Valeur'],
        rows: (record?.by_depot ?? []).map((row) => [asText(row.depot_name), formatQuantity(row.total_qty), formatMoney(row.total_value)]),
        emptyMessage: 'Aucune donnée de stock.',
      },
    ],
  },
]

export function getDocumentDefinition(documentKey) {
  return DOCUMENT_DEFINITIONS.find((definition) => definition.key === documentKey) ?? null
}

export function getDocumentDefinitionsBySection(sectionKey) {
  return DOCUMENT_DEFINITIONS.filter((definition) => definition.section === sectionKey)
}

export function getDefaultDocumentFieldKeys(definition) {
  return (definition?.fields ?? [])
    .filter((item) => item.defaultEnabled !== false)
    .map((item) => item.key)
}
