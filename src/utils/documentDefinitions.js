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
  depot_in: 'Reception',
  depot_to_camion: 'Vers camion',
  camion_to_customer: 'Vers client',
  return: 'Retour',
  adjustment: 'Ajustement',
}

const INVOICE_STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'Envoyee',
  paid: 'Payee',
  cancelled: 'Annulee',
}

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Impaye',
  partial: 'Partiel',
  paid: 'Paye',
}

const ROUTE_SESSION_STATUS_LABELS = {
  open: 'En cours',
  closed: 'Cloturee',
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
  return customer?.lat != null && customer?.lng != null ? 'Position OK' : 'A geolocaliser'
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
  return session?.camion?.name ? asText(session.camion.name) : 'Non assigne'
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
    description: 'Factures, clients et pieces commerciales.',
  },
  {
    key: 'catalog',
    label: 'Catalogue',
    icon: 'fa-solid fa-box-open',
    description: 'Produits et etat du stock catalogue.',
  },
  {
    key: 'operations',
    label: 'Operations',
    icon: 'fa-solid fa-warehouse',
    description: 'Depot, mouvements, inventaire et sorties terrain.',
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: 'fa-solid fa-wallet',
    description: 'Depenses et sorties financieres.',
  },
]

export const DOCUMENT_DEFINITIONS = [
  {
    key: 'customers_list',
    label: 'Clients - liste',
    description: 'Liste filtree des clients avec affectation et statut de geolocalisation.',
    scope: 'list',
    section: 'sales',
    title: 'Clients',
    filename: 'clients',
    orientation: 'landscape',
    fields: [
      field('name', 'Nom', (customer) => asText(customer?.name), 'Nom du client.'),
      field('phone', 'Telephone', (customer) => asText(customer?.phone), 'Numero principal.'),
      field('owner', 'Affecte a', (customer) => customer?.owner?.name ? `${customer.owner.name} (${asText(customer.owner.role, '-')})` : '-', 'Compte proprietaire.'),
      field('wilaya', 'Gouvernorat', (customer) => asText(customer?.wilaya), 'Gouvernorat / wilaya.'),
      field('zone', 'Zone', (customer) => asText(customer?.zone?.name), 'Zone commerciale.'),
      field('map_status', 'Carte', (customer) => mapStatus(customer), 'Statut de geolocalisation.', { defaultEnabled: false }),
      field('credit_balance', 'Solde credit', (customer) => formatMoney(customer?.credit_balance), 'Solde client courant.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Clients', value: asText(records.length, '0') },
      { label: 'Positions OK', value: asText(records.filter((item) => item?.lat != null && item?.lng != null).length, '0') },
      { label: 'Credit total', value: formatMoney(records.reduce((sum, item) => sum + asNumber(item?.credit_balance), 0)) },
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
      field('name', 'Nom', (product) => asText(product?.name), 'Designation produit.'),
      field('reference', 'Reference', (product) => asText(product?.reference), 'Reference interne.'),
      field('category', 'Categorie', (product) => asText(product?.category), 'Categorie produit.'),
      field('buy_price', 'Prix achat', (product) => product?.buy_price != null ? formatMoney(product.buy_price) : '-', 'Cout d achat.', { defaultEnabled: false }),
      field('depot_price', 'Prix depot', (product) => formatMoney(product?.depot_price ?? product?.price), 'Prix depot / vente.'),
      field('depot_qty', 'Stock depot', (product) => formatQuantity(product?.depot_qty), 'Stock depot courant.'),
      field('camion_qty', 'Stock camion', (product) => formatQuantity(product?.camion_qty), 'Stock total camion.'),
      field('min_stock', 'Min stock', (product) => formatQuantity(Math.max(asNumber(product?.min_stock, 1), 1)), 'Seuil minimum.'),
      field('unit', 'Unite', (product) => asText(product?.unit), 'Unite produit.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Produits', value: asText(records.length, '0') },
      { label: 'Stock bas', value: asText(records.filter((product) => asNumber(product?.depot_qty) <= Math.max(asNumber(product?.min_stock, 1), 1) || asNumber(product?.camion_qty) <= Math.max(asNumber(product?.min_stock, 1), 1)).length, '0') },
      { label: 'Valeur depot', value: formatMoney(records.reduce((sum, product) => sum + (asNumber(product?.depot_qty) * asNumber(product?.buy_price ?? product?.depot_price ?? product?.price)), 0)) },
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
      field('number', 'Numero', (invoice) => asText(invoice?.number), 'Numero de facture.'),
      field('customer_name', 'Client', (invoice) => asText(invoice?.customer_name), 'Client facture.'),
      field('rep_name', 'Commercial', (invoice) => asText(invoice?.rep_name), 'Commercial associe.', { defaultEnabled: false }),
      field('total', 'Total', (invoice) => formatMoney(invoice?.total), 'Total facture.'),
      field('paid_amount', 'Paye', (invoice) => formatMoney(invoice?.paid_amount), 'Montant deja encaisse.', { defaultEnabled: false }),
      field('due_amount', 'Reste du', (invoice) => formatMoney(invoiceDue(invoice)), 'Montant restant.'),
      field('payment_status', 'Paiement', (invoice) => paymentStatusLabel(invoice?.payment_status?.value ?? invoice?.payment_status), 'Etat de paiement.'),
      field('status', 'Statut', (invoice) => invoiceStatusLabel(invoice?.status?.value ?? invoice?.status), 'Etat metier.'),
      field('created_at', 'Date', (invoice) => formatDate(invoice?.created_at), 'Date facture.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Factures', value: asText(records.length, '0') },
      { label: 'Total', value: formatMoney(records.reduce((sum, invoice) => sum + asNumber(invoice?.total), 0)) },
      { label: 'Reste du', value: formatMoney(records.reduce((sum, invoice) => sum + invoiceDue(invoice), 0)) },
    ],
  },
  {
    key: 'invoice_item',
    label: 'Facture - ligne',
    description: 'Piece unitaire depuis la liste des factures.',
    scope: 'item',
    section: 'sales',
    title: 'Facture',
    filename: 'facture',
    orientation: 'portrait',
    fields: [
      field('number', 'Numero', (invoice) => asText(invoice?.number), 'Numero facture.'),
      field('customer_name', 'Client', (invoice) => asText(invoice?.customer_name), 'Client facture.'),
      field('rep_name', 'Commercial', (invoice) => asText(invoice?.rep_name), 'Commercial associe.', { defaultEnabled: false }),
      field('total', 'Total', (invoice) => formatMoney(invoice?.total), 'Montant total.'),
      field('paid_amount', 'Paye', (invoice) => formatMoney(invoice?.paid_amount), 'Montant encaisse.', { defaultEnabled: false }),
      field('due_amount', 'Reste du', (invoice) => formatMoney(invoiceDue(invoice)), 'Solde restant.'),
      field('payment_status', 'Paiement', (invoice) => paymentStatusLabel(invoice?.payment_status?.value ?? invoice?.payment_status), 'Etat paiement.'),
      field('status', 'Statut', (invoice) => invoiceStatusLabel(invoice?.status?.value ?? invoice?.status), 'Etat facture.'),
      field('created_at', 'Date', (invoice) => formatDate(invoice?.created_at), 'Date facture.'),
    ],
    buildSummary: ({ record }) => [
      { label: 'Total', value: formatMoney(record?.total) },
      { label: 'Reste du', value: formatMoney(invoiceDue(record)) },
    ],
  },
  {
    key: 'invoice_detail',
    label: 'Facture - detail',
    description: 'Version detaillee d une facture avec lignes et resume de paiement.',
    scope: 'item',
    section: 'sales',
    title: 'Facture detaillee',
    filename: 'facture_detail',
    orientation: 'portrait',
    alwaysVisibleNote: 'Les lignes produit et le resume financier restent toujours inclus dans la facture detaillee.',
    fields: [
      field('number', 'Numero', (invoice) => asText(invoice?.number), 'Numero facture.'),
      field('created_at', 'Date', (invoice) => formatDate(invoice?.created_at), 'Date facture.'),
      field('customer_name', 'Client', (invoice) => asText(invoice?.customer_name), 'Client facture.'),
      field('customer_phone', 'Telephone client', (invoice) => asText(invoice?.customer_phone), 'Contact client.', { defaultEnabled: false }),
      field('customer_address', 'Adresse client', (invoice) => asText(invoice?.customer_address), 'Adresse client.', { defaultEnabled: false }),
      field('customer_tax_id', 'MF client', (invoice) => asText(invoice?.customer_tax_id), 'Matricule fiscal.', { defaultEnabled: false }),
      field('rep_name', 'Commercial', (invoice) => asText(invoice?.rep_name), 'Commercial associe.'),
      field('zone_name', 'Zone', (invoice) => asText(invoice?.zone?.name), 'Zone commerciale.', { defaultEnabled: false }),
      field('payment_status', 'Paiement', (invoice) => paymentStatusLabel(invoice?.payment_status?.value ?? invoice?.payment_status), 'Etat paiement.'),
      field('status', 'Statut', (invoice) => invoiceStatusLabel(invoice?.status?.value ?? invoice?.status), 'Etat facture.'),
      field('subtotal', 'Sous-total', (invoice) => formatMoney(invoice?.subtotal), 'Sous-total.'),
      field('tax_rate', 'TVA', (invoice) => invoice?.tax_rate != null ? `${asNumber(invoice.tax_rate).toFixed(2)} %` : '-', 'Taux TVA.', { defaultEnabled: false }),
      field('tax_amount', 'Montant TVA', (invoice) => formatMoney(invoice?.tax_amount), 'Montant TVA.', { defaultEnabled: false }),
      field('total', 'Total', (invoice) => formatMoney(invoice?.total), 'Montant total.'),
      field('paid_amount', 'Paye', (invoice) => formatMoney(invoice?.paid_amount), 'Montant encaisse.'),
      field('due_amount', 'Reste du', (invoice) => formatMoney(invoiceDue(invoice)), 'Solde restant.'),
      field('notes', 'Notes', (invoice) => asText(invoice?.notes), 'Notes facture.', { defaultEnabled: false }),
    ],
    buildSummary: ({ record }) => [
      { label: 'Total', value: formatMoney(record?.total) },
      { label: 'Paye', value: formatMoney(record?.paid_amount) },
      { label: 'Reste du', value: formatMoney(invoiceDue(record)) },
    ],
    buildSections: ({ record }) => [
      {
        kind: 'table',
        title: 'Lignes facture',
        columns: ['Produit', 'Qte', 'P.U.', 'Total'],
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
    label: 'Depenses - liste',
    description: 'Liste filtree des depenses de la vue courante.',
    scope: 'list',
    section: 'finance',
    title: 'Depenses',
    filename: 'depenses',
    orientation: 'portrait',
    fields: [
      field('expense_date', 'Date', (expense) => formatDate(expense?.expense_date), 'Date de depense.'),
      field('category', 'Categorie', (expense) => expenseCategoryLabel(expense), 'Categorie dynamique.'),
      field('label', 'Libelle', (expense) => asText(expense?.label), 'Designation.'),
      field('amount', 'Montant', (expense) => formatMoney(expense?.amount), 'Montant depense.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Depenses', value: asText(records.length, '0') },
      { label: 'Total', value: formatMoney(records.reduce((sum, expense) => sum + asNumber(expense?.amount), 0)) },
    ],
  },
  {
    key: 'expense_item',
    label: 'Depense - ligne',
    description: 'Piece unitaire pour une depense.',
    scope: 'item',
    section: 'finance',
    title: 'Depense',
    filename: 'depense',
    orientation: 'portrait',
    fields: [
      field('expense_date', 'Date', (expense) => formatDate(expense?.expense_date), 'Date depense.'),
      field('category', 'Categorie', (expense) => expenseCategoryLabel(expense), 'Categorie.'),
      field('label', 'Libelle', (expense) => asText(expense?.label), 'Designation.'),
      field('amount', 'Montant', (expense) => formatMoney(expense?.amount), 'Montant.'),
      field('created_at', 'Cree le', (expense) => formatDateTime(expense?.created_at), 'Date creation.', { defaultEnabled: false }),
    ],
    buildSummary: ({ record }) => [
      { label: 'Montant', value: formatMoney(record?.amount) },
    ],
  },
  {
    key: 'route_sessions_list',
    label: 'Sorties journee - liste',
    description: 'Sessions de route affichees dans la vue actuelle.',
    scope: 'list',
    section: 'operations',
    title: 'Sorties journee',
    filename: 'sorties_journee',
    orientation: 'landscape',
    fields: [
      field('session_date', 'Date', (session) => formatDate(session?.session_date), 'Date session.'),
      field('rep_name', 'Commercial', (session) => asText(session?.rep?.name), 'Commercial affecte.'),
      field('zone_name', 'Zone', (session) => asText(session?.zone?.name), 'Zone session.'),
      field('camion_name', 'Camion', (session) => routeCamionLabel(session), 'Camion.'),
      field('camion_plate', 'Plaque', (session) => routeCamionPlate(session), 'Plaque camion.', { defaultEnabled: false }),
      field('total_sold', 'Total vendu', (session) => formatMoney(session?.total_sold), 'CA session.'),
      field('profit_total', 'Benefice', (session) => formatMoney(session?.profit_total), 'Benefice session.'),
      field('credit_given', 'Credit accorde', (session) => formatMoney(session?.credit_given), 'Credit du.'),
      field('status', 'Statut', (session) => routeStatusLabel(session?.status?.value ?? session?.status), 'Etat session.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Sessions', value: asText(records.length, '0') },
      { label: 'Total vendu', value: formatMoney(records.reduce((sum, session) => sum + asNumber(session?.total_sold), 0)) },
      { label: 'Benefice', value: formatMoney(records.reduce((sum, session) => sum + asNumber(session?.profit_total), 0)) },
    ],
  },
  {
    key: 'route_session_item',
    label: 'Sortie journee - ligne',
    description: 'Piece unitaire pour une session terrain.',
    scope: 'item',
    section: 'operations',
    title: 'Session terrain',
    filename: 'session_terrain',
    orientation: 'portrait',
    fields: [
      field('session_date', 'Date', (session) => formatDate(session?.session_date), 'Date session.'),
      field('rep_name', 'Commercial', (session) => asText(session?.rep?.name), 'Commercial.'),
      field('zone_name', 'Zone', (session) => asText(session?.zone?.name), 'Zone.'),
      field('camion_name', 'Camion', (session) => routeCamionLabel(session), 'Camion.'),
      field('camion_plate', 'Plaque', (session) => routeCamionPlate(session), 'Plaque.', { defaultEnabled: false }),
      field('total_sold', 'Total vendu', (session) => formatMoney(session?.total_sold), 'CA.'),
      field('profit_total', 'Benefice', (session) => formatMoney(session?.profit_total), 'Benefice.'),
      field('credit_given', 'Credit accorde', (session) => formatMoney(session?.credit_given), 'Credit.'),
      field('status', 'Statut', (session) => routeStatusLabel(session?.status?.value ?? session?.status), 'Etat session.'),
    ],
    buildSummary: ({ record }) => [
      { label: 'Vendu', value: formatMoney(record?.total_sold) },
      { label: 'Benefice', value: formatMoney(record?.profit_total) },
    ],
  },
  {
    key: 'depot_stock_list',
    label: 'Depot - stock',
    description: 'Etat du stock depot actuellement visible.',
    scope: 'list',
    section: 'operations',
    title: 'Stock depot',
    filename: 'stock_depot',
    orientation: 'landscape',
    fields: [
      field('product_name', 'Produit', (item) => asText(item?.product?.name), 'Produit.'),
      field('reference', 'Reference', (item) => asText(item?.product?.reference), 'Reference.'),
      field('category', 'Categorie', (item) => asText(item?.product?.category), 'Categorie.', { defaultEnabled: false }),
      field('unit', 'Unite', (item) => asText(item?.product?.unit), 'Unite.'),
      field('qty', 'Qte depot', (item) => formatQuantity(stockQty(item)), 'Stock depot.'),
      field('min_stock', 'Min stock', (item) => formatQuantity(stockMin(item)), 'Seuil minimum.'),
      field('status', 'Statut', (item) => stockStatus(item), 'Etat de stock.'),
      field('updated_at', 'Derniere maj', (item) => formatDateTime(item?.updated_at), 'Derniere mise a jour.', { defaultEnabled: false }),
    ],
    buildSummary: ({ records }) => [
      { label: 'References', value: asText(records.length, '0') },
      { label: 'Total unites', value: formatQuantity(records.reduce((sum, item) => sum + stockQty(item), 0)) },
      { label: 'Stock bas', value: asText(records.filter((item) => stockQty(item) <= stockMin(item)).length, '0') },
    ],
  },
  {
    key: 'stock_movements_list',
    label: 'Depot - mouvements',
    description: 'Journal visible des mouvements depot et terrain.',
    scope: 'list',
    section: 'operations',
    title: 'Mouvements stock',
    filename: 'mouvements_stock',
    orientation: 'landscape',
    fields: [
      field('movement_type', 'Type', (movement) => mouvementLabel(movement?.type?.value ?? movement?.type), 'Type mouvement.'),
      field('product_name', 'Produit', (movement) => asText(movement?.product?.name), 'Produit.'),
      field('reference', 'Reference', (movement) => asText(movement?.product?.reference), 'Reference.', { defaultEnabled: false }),
      field('user_name', 'Utilisateur', (movement) => asText(movement?.user?.name), 'Utilisateur origine.'),
      field('qty', 'Quantite', (movement) => `${asNumber(movement?.qty) >= 0 ? '+' : ''}${formatQuantity(movement?.qty)}`, 'Quantite.'),
      field('note', 'Note', (movement) => asText(movement?.note), 'Note interne.', { defaultEnabled: false }),
      field('created_at', 'Date / heure', (movement) => formatDateTime(movement?.created_at), 'Date mouvement.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Mouvements', value: asText(records.length, '0') },
      { label: 'Qte nette', value: `${inventoryDeltaTotal(records) >= 0 ? '+' : ''}${formatQuantity(inventoryDeltaTotal(records))}` },
    ],
  },
  {
    key: 'stock_movement_item',
    label: 'Mouvement stock - ligne',
    description: 'Piece unitaire pour un mouvement de stock.',
    scope: 'item',
    section: 'operations',
    title: 'Mouvement stock',
    filename: 'mouvement_stock',
    orientation: 'portrait',
    fields: [
      field('movement_type', 'Type', (movement) => mouvementLabel(movement?.type?.value ?? movement?.type), 'Type mouvement.'),
      field('product_name', 'Produit', (movement) => asText(movement?.product?.name), 'Produit.'),
      field('reference', 'Reference', (movement) => asText(movement?.product?.reference), 'Reference.', { defaultEnabled: false }),
      field('user_name', 'Utilisateur', (movement) => asText(movement?.user?.name), 'Utilisateur.'),
      field('qty', 'Quantite', (movement) => `${asNumber(movement?.qty) >= 0 ? '+' : ''}${formatQuantity(movement?.qty)}`, 'Quantite.'),
      field('note', 'Note', (movement) => asText(movement?.note), 'Note.', { defaultEnabled: false }),
      field('created_at', 'Date / heure', (movement) => formatDateTime(movement?.created_at), 'Date mouvement.'),
    ],
    buildSummary: ({ record }) => [
      { label: 'Quantite', value: `${asNumber(record?.qty) >= 0 ? '+' : ''}${formatQuantity(record?.qty)}` },
    ],
  },
  {
    key: 'inventory_history_list',
    label: 'Inventaire - historique',
    description: 'Historique des ajustements d inventaire visibles dans le panneau audit.',
    scope: 'list',
    section: 'operations',
    title: 'Historique inventaire',
    filename: 'inventaire_historique',
    orientation: 'portrait',
    fields: [
      field('product_name', 'Produit', (movement) => asText(movement?.product?.name ?? movement?.product_name), 'Produit.'),
      field('reference', 'Reference', (movement) => asText(movement?.product?.reference), 'Reference.', { defaultEnabled: false }),
      field('user_name', 'Utilisateur', (movement) => asText(movement?.user?.name), 'Utilisateur.'),
      field('qty', 'Ecart', (movement) => `${asNumber(movement?.qty) >= 0 ? '+' : ''}${formatQuantity(movement?.qty)}`, 'Ecart inventaire.'),
      field('note', 'Note', (movement) => asText(movement?.note), 'Note batch.'),
      field('created_at', 'Date / heure', (movement) => formatDateTime(movement?.created_at), 'Date ajustement.'),
    ],
    buildSummary: ({ records }) => [
      { label: 'Ajustements', value: asText(records.length, '0') },
      { label: 'Ecart net', value: `${inventoryDeltaTotal(records) >= 0 ? '+' : ''}${formatQuantity(inventoryDeltaTotal(records))}` },
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
