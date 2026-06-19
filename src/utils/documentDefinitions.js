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
    ],
    buildSummary: ({ records }) => [
      { label: 'Dépenses', value: asText(records.length, '0') },
      { label: 'Total', value: formatMoney(records.reduce((sum, expense) => sum + asNumber(expense?.amount), 0)) },
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
      field('created_at', 'Créée le', (expense) => formatDateTime(expense?.created_at), 'Date de création.', { defaultEnabled: false }),
    ],
    buildSummary: ({ record }) => [
      { label: 'Montant', value: formatMoney(record?.amount) },
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
