import {
  DOCUMENT_COMPANY_PROFILE_SETTING_KEY,
  DOCUMENT_INVOICE_PRINTING_SETTING_KEY,
  normalizeCompanyEntityDocumentProfile,
  normalizeDocumentCompanyProfile,
  normalizeInvoicePrintingSettings,
} from '../hooks/useDocumentLayouts'
import { companyHasDedicatedLogo } from './branding'
import {
  asNumber,
  asText,
  formatDate,
  formatDateTime,
  formatMoney,
  formatQuantity,
  getDefaultDocumentFieldKeys,
  getDocumentDefinition,
} from './documentDefinitions'

const DEFAULT_DOCUMENT_BRAND_NAME = 'El Irtiwaa'

function normalizeFileSafeSegment(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function buildFilename(baseName) {
  const normalizedBase = normalizeFileSafeSegment(baseName) || 'document'
  const stamp = new Date().toISOString().slice(0, 10)
  return `${normalizedBase}_${stamp}.pdf`
}

function ensurePdfFilename(value, fallbackBaseName) {
  if (!value) {
    return buildFilename(fallbackBaseName)
  }

  const hasPdfExtension = String(value).toLowerCase().endsWith('.pdf')
  const normalized = normalizeFileSafeSegment(hasPdfExtension ? String(value).slice(0, -4) : value)

  if (!normalized) {
    return buildFilename(fallbackBaseName)
  }

  return `${normalized}.pdf`
}

function normalizeText(value) {
  return asText(value)
    .replace(/\s+/g, ' ')
    .replace(/[^\u0020-\u00FF]/g, ' ')
    .trim()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function cleanOptionalText(value) {
  return String(value ?? '').trim()
}

function splitMultilineText(value) {
  return cleanOptionalText(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function isInvoiceDocument(definition) {
  return ['invoice_item', 'invoice_detail', 'invoices_list'].includes(definition?.key)
}

// Single-invoice documents get a dedicated pad-style layout (see
// buildInvoicePadHtml/buildInvoicePadPdf) matching the company's real paper
// "Facture" pad instead of the generic report template below - the invoices
// list view is excluded since the pad layout only makes sense for one
// invoice at a time.
function isSinglePadInvoiceDocument(definitionOrModel) {
  return ['invoice_item', 'invoice_detail'].includes(definitionOrModel?.key)
}

function buildDepotLines(record, showDepotDetails) {
  if (!showDepotDetails) {
    return []
  }

  const depotName = cleanOptionalText(record?.depot?.name)
  const depotCode = cleanOptionalText(record?.depot?.code)
  const depotAddress = cleanOptionalText(record?.depot?.address)
  const depotNote = cleanOptionalText(record?.depot?.note)
  const lines = []

  if (depotName) {
    lines.push(depotCode ? `Depot: ${depotName} (${depotCode})` : `Depot: ${depotName}`)
  } else if (depotCode) {
    lines.push(`Depot code: ${depotCode}`)
  }

  if (depotAddress) {
    lines.push(depotAddress)
  }

  if (depotNote) {
    lines.push(depotNote)
  }

  return lines
}

// Builds the invoice pad's company header body (up to 5 lines: legal name if
// different from the display brand, up to 2 free-text header-note lines,
// address, phone/email, first depot line) and pulls the fiscal-identity line
// (Matricule fiscal / SIRET) out into its own badge instead of leaving it
// mixed into the body lines.
function buildInvoicePadCompanyLines(branding) {
  const companyName = cleanOptionalText(branding?.companyName)
  const companyProfile = branding?.companyProfile ?? {}
  const headerNoteLines = Array.isArray(branding?.headerNoteLines) ? branding.headerNoteLines : []
  const depotLines = Array.isArray(branding?.depotLines) ? branding.depotLines : []
  const legalName = cleanOptionalText(companyProfile.legal_name)
  const tagline = cleanOptionalText(companyProfile.tagline)
  const address = cleanOptionalText(companyProfile.address)
  const phone = cleanOptionalText(companyProfile.phone)
  const email = cleanOptionalText(companyProfile.email)
  const taxId = cleanOptionalText(companyProfile.tax_id)
  const siret = cleanOptionalText(companyProfile.siret)
  const lines = []

  if (legalName && legalName.toLowerCase() !== companyName.toLowerCase()) {
    lines.push(legalName)
  }

  if (tagline) {
    lines.push(tagline)
  }

  lines.push(...headerNoteLines.slice(0, 2))

  if (address) {
    lines.push(address)
  }

  if (phone || email) {
    lines.push([phone ? `Tel : ${phone}` : '', email].filter(Boolean).join(' | '))
  }

  if (taxId || siret) {
    lines.push([taxId ? `Matricule fiscal : ${taxId}` : '', siret ? `SIRET : ${siret}` : ''].filter(Boolean).join(' | '))
  }

  if (depotLines.length > 0) {
    lines.push(depotLines[0])
  }

  const bodyLines = lines.filter(Boolean).slice(0, 5)
  const identityIndex = bodyLines.findIndex((line) => /matricule fiscal|siret/i.test(line))

  return {
    companyBodyLines: bodyLines.filter((_, index) => index !== identityIndex),
    identityLine: identityIndex >= 0 ? bodyLines[identityIndex] : '',
    companyNameAr: branding?.companyNameAr ?? '',
    companyBodyLinesAr: branding?.companyBodyLinesAr ?? [],
  }
}

// Purchased invoice lines only (matches the paper pad's behavior of leaving
// unpurchased catalog rows blank rather than printing every product line
// with zero quantity).
function buildInvoiceLineItems(record) {
  return (Array.isArray(record?.lines) ? record.lines : [])
    .filter((line) => cleanOptionalText(line?.product_name) !== '')
    .filter((line) => asNumber(line?.qty) > 0 || asNumber(line?.total) > 0)
    .map((line) => ({
      name: asText(line?.product_name, 'Produit'),
      quantity: formatQuantity(line?.qty),
      unitPrice: formatMoney(line?.unit_price ?? line?.price),
      total: formatMoney(line?.total),
    }))
}

function resolveInvoicePrintingConfig(documentSettings) {
  if (documentSettings?.invoicePrintSettings) {
    return normalizeInvoicePrintingSettings(documentSettings.invoicePrintSettings)
  }

  return normalizeInvoicePrintingSettings(
    documentSettings?.[DOCUMENT_INVOICE_PRINTING_SETTING_KEY],
  )
}

function resolveDocumentCompanyProfile(documentSettings, user) {
  const settingsProfile = documentSettings?.companyProfile
    ? normalizeDocumentCompanyProfile(documentSettings.companyProfile)
    : normalizeDocumentCompanyProfile(
        documentSettings?.[DOCUMENT_COMPANY_PROFILE_SETTING_KEY],
      )
  const companyProfile = normalizeCompanyEntityDocumentProfile(user?.company)

  return {
    ...settingsProfile,
    ...Object.fromEntries(
      Object.entries(companyProfile).filter(([, value]) => cleanOptionalText(value) !== ''),
    ),
  }
}

function cleanDocumentBrandName(user, companyProfile) {
  return cleanOptionalText(user?.company?.name)
    || cleanOptionalText(companyProfile?.legal_name)
    || DEFAULT_DOCUMENT_BRAND_NAME
}

function buildCompanyProfileLines(companyName, companyProfile) {
  const lines = []
  const legalName = cleanOptionalText(companyProfile?.legal_name)
  const identityBits = []
  const contactBits = []
  const adminBits = []

  if (legalName && legalName.toLowerCase() !== companyName.toLowerCase()) {
    lines.push(legalName)
  }

  if (cleanOptionalText(companyProfile?.siret)) {
    identityBits.push(`SIRET: ${cleanOptionalText(companyProfile.siret)}`)
  }

  if (cleanOptionalText(companyProfile?.tax_id)) {
    identityBits.push(`MF: ${cleanOptionalText(companyProfile.tax_id)}`)
  }

  if (identityBits.length > 0) {
    lines.push(identityBits.join(' | '))
  }

  if (cleanOptionalText(companyProfile?.phone)) {
    contactBits.push(cleanOptionalText(companyProfile.phone))
  }

  if (cleanOptionalText(companyProfile?.email)) {
    contactBits.push(cleanOptionalText(companyProfile.email))
  }

  if (contactBits.length > 0) {
    lines.push(contactBits.join(' | '))
  }

  if (cleanOptionalText(companyProfile?.address)) {
    lines.push(cleanOptionalText(companyProfile.address))
  }

  if (cleanOptionalText(companyProfile?.admin_name)) {
    adminBits.push(`Admin: ${cleanOptionalText(companyProfile.admin_name)}`)
  }

  if (cleanOptionalText(companyProfile?.admin_email)) {
    adminBits.push(cleanOptionalText(companyProfile.admin_email))
  }

  if (adminBits.length > 0) {
    lines.push(adminBits.join(' | '))
  }

  return lines
}

function resolveDocumentTitleBrand(user, documentSettings) {
  const companyProfile = resolveDocumentCompanyProfile(documentSettings, user)

  return cleanDocumentBrandName(user, companyProfile)
}

export function buildCompanyScopedFilename(baseName, user, documentSettings) {
  const companyProfile = resolveDocumentCompanyProfile(documentSettings, user)
  const companySegment = normalizeFileSafeSegment(
    cleanOptionalText(user?.company?.slug)
      || cleanDocumentBrandName(user, companyProfile),
  )
  const baseSegment = normalizeFileSafeSegment(baseName) || 'document'

  return companySegment ? `${companySegment}_${baseSegment}` : baseSegment
}

// Arabic mirror column shared by every document template (pad and generic
// alike): legal name (ar) stands in for the heading, tagline and address (ar)
// are the body - phone/email/tax IDs are locale-invariant so they aren't
// duplicated on this side. Populated only when an admin has actually filled
// in the Arabic company-profile fields (see ConfigIndex.jsx "Company Profile"
// card); every template falls back to its existing single-language layout
// when this is empty.
function buildCompanyArabicLines(companyProfile) {
  const companyNameAr = cleanOptionalText(companyProfile?.legal_name_ar)
  const taglineAr = cleanOptionalText(companyProfile?.tagline_ar)
  const addressAr = cleanOptionalText(companyProfile?.address_ar)

  return {
    companyNameAr,
    companyBodyLinesAr: [taglineAr, addressAr].filter(Boolean),
  }
}

function buildDocumentBranding({ definition, record, user, documentSettings }) {
  const invoicePrinting = resolveInvoicePrintingConfig(documentSettings)
  const companyProfile = resolveDocumentCompanyProfile(documentSettings, user)
  const companyName = cleanDocumentBrandName(user, companyProfile)
  const companyLogoUrl = invoicePrinting.header_style === 'logo_and_name'
    && companyHasDedicatedLogo(user?.company)
    ? cleanOptionalText(user?.company?.logo_url)
    : ''
  const headerNoteLines = splitMultilineText(invoicePrinting.header_note)
  const depotLines = isInvoiceDocument(definition) ? buildDepotLines(record, invoicePrinting.show_depot_details) : []
  const headerLines = [
    ...buildCompanyProfileLines(companyName, companyProfile),
    ...headerNoteLines,
    ...depotLines,
  ]

  return {
    companyName,
    companyLogoUrl,
    headerStyle: invoicePrinting.header_style,
    headerLines,
    footerNote: cleanOptionalText(invoicePrinting.footer_note),
    showTaxBreakdown: invoicePrinting.show_tax_breakdown,
    // Raw pieces (as opposed to the pre-joined `headerLines` above) for the
    // dedicated single-invoice pad layout, which lays out company identity
    // fields itself (see buildInvoicePadCompanyLines) rather than consuming
    // one flat pre-joined line array like the generic document template does.
    companyProfile,
    headerNoteLines,
    depotLines,
    ...buildCompanyArabicLines(companyProfile),
  }
}

function filterDocumentFields(definition, fields, branding, record) {
  let visibleFields = fields

  if (isInvoiceDocument(definition) && !branding.showTaxBreakdown) {
    visibleFields = visibleFields.filter((field) => !['tax_rate', 'tax_amount'].includes(field.key))
  }

  // Item-scope only: a list column staying at 0 for every row is still useful
  // (comparing employees), but a single printed document repeating "0.000" rows
  // for deductions that don't apply this period is just noise - see the HR
  // redesign plan's "documents stay clean" rule.
  if (definition.scope === 'item') {
    visibleFields = visibleFields.filter((field) => !field.hideIfZero || asNumber(record?.[field.key]) !== 0)
  }

  return visibleFields
}

function renderSummary(summary) {
  if (!summary.length) {
    return ''
  }

  return `
    <section class="summary-grid">
      ${summary.map((item) => `
        <div class="summary-card">
          <div class="summary-label">${escapeHtml(item.label)}</div>
          <div class="summary-value">${escapeHtml(item.value)}</div>
        </div>
      `).join('')}
    </section>
  `
}

function renderTableSection(section) {
  const head = section.columns?.length
    ? `
      <thead>
        <tr>${section.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>
      </thead>
    `
    : ''

  const body = section.rows?.length
    ? `
      <tbody>
        ${section.rows.map((row) => `
          <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
        `).join('')}
      </tbody>
    `
    : `
      <tbody>
        <tr><td class="empty-row" colspan="${Math.max(section.columns?.length ?? 1, 1)}">${escapeHtml(section.emptyMessage || 'Aucune donnée disponible.')}</td></tr>
      </tbody>
    `

  return `
    <section class="document-section">
      ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}
      <table>
        ${head}
        ${body}
      </table>
    </section>
  `
}

function renderKeyValueSection(section) {
  return `
    <section class="document-section">
      ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}
      <table class="key-value-table">
        <tbody>
          ${section.rows.map((row) => `
            <tr>
              <th>${escapeHtml(row.label)}</th>
              <td>${escapeHtml(row.value)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `
}

function renderTextSection(section) {
  return `
    <section class="document-section">
      ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}
      <p class="text-section">${escapeHtml(section.text)}</p>
    </section>
  `
}

function renderSection(section) {
  if (section.kind === 'keyValue') {
    return renderKeyValueSection(section)
  }

  if (section.kind === 'text') {
    return renderTextSection(section)
  }

  return renderTableSection(section)
}

export function resolveDocumentLayout(definition, layouts = {}) {
  const saved = layouts?.[definition.key] ?? {}
  const allowedFieldKeys = new Set((definition.fields ?? []).map((field) => field.key))
  const defaultFieldKeys = getDefaultDocumentFieldKeys(definition)
  const preferredFieldKeys = Array.isArray(saved.fields) && saved.fields.length > 0
    ? saved.fields.filter((fieldKey) => allowedFieldKeys.has(fieldKey))
    : defaultFieldKeys
  const selectedFieldKeys = preferredFieldKeys.length > 0 ? preferredFieldKeys : defaultFieldKeys
  const selectedFields = (definition.fields ?? []).filter((field) => selectedFieldKeys.includes(field.key))
  const orientation = saved.orientation === 'portrait' || saved.orientation === 'landscape'
    ? saved.orientation
    : (definition.orientation ?? (definition.scope === 'list' ? 'landscape' : 'portrait'))

  return {
    fields: selectedFields,
    fieldKeys: selectedFields.map((field) => field.key),
    orientation,
  }
}

export function buildDocumentModel({
  documentKey,
  records = [],
  documentLayouts = {},
  title,
  subtitle,
  filename,
  meta = [],
  summary = [],
  documentSettings = null,
  user = null,
}) {
  const definition = getDocumentDefinition(documentKey)

  if (!definition) {
    throw new Error(`document_definition_missing:${documentKey}`)
  }

  const normalizedRecords = Array.isArray(records)
    ? records
    : records
      ? [records]
      : []
  const record = normalizedRecords[0] ?? null
  const layout = resolveDocumentLayout(definition, documentLayouts)
  const branding = buildDocumentBranding({ definition, record, user, documentSettings })
  const visibleFields = filterDocumentFields(definition, layout.fields, branding, record)
  const combinedSummary = [
    ...(definition.buildSummary?.({ records: normalizedRecords, record }) ?? []),
    ...summary,
  ].filter((item) => item?.label && item?.value != null)
  const sections = []

  if (definition.scope === 'item') {
    sections.push({
      kind: 'keyValue',
      title: 'Détails',
      rows: visibleFields.map((field) => ({
        label: field.label,
        value: field.value(record),
      })),
    })
  } else {
    sections.push({
      kind: 'table',
      title: definition.tableTitle || 'Éléments',
      columns: visibleFields.map((field) => field.label),
      rows: normalizedRecords.map((currentRecord) => visibleFields.map((field) => field.value(currentRecord))),
      emptyMessage: definition.emptyMessage || 'Aucune donnée disponible pour cette vue.',
    })
  }

  sections.push(...(definition.buildSections?.({ records: normalizedRecords, record, fields: visibleFields }) ?? []))

  return {
    key: definition.key,
    record,
    title: title || definition.title,
    subtitle: subtitle || definition.description,
    filename: ensurePdfFilename(
      buildCompanyScopedFilename(filename || definition.filename || definition.title, user, documentSettings),
      buildCompanyScopedFilename(definition.filename || definition.title, user, documentSettings),
    ),
    orientation: layout.orientation,
    meta: [
      ...meta.filter(Boolean),
      `Généré le ${formatDateTime(new Date())}`,
      definition.scope === 'item'
        ? 'Document unitaire'
        : `${normalizedRecords.length} élément(s) inclus`,
    ],
    summary: combinedSummary,
    sections,
    branding,
  }
}

// Dedicated single-invoice layout matching the company's real paper
// "Facture" pad: bilingual-ready company block + boxed fiscal-identity
// badge on the left, boxed "N°" invoice number on the right, a dotted
// Client/date line, then a Quantité | Désignation | P.U. | Montant table
// with a TOTAL row. Used only for invoice_item/invoice_detail - every other
// document type (including the invoices list) keeps the generic report
// template in buildPrintHtml below.
function buildInvoicePadHtml(model) {
  const record = model.record ?? {}
  const companyName = cleanOptionalText(model.branding?.companyName) || DEFAULT_DOCUMENT_BRAND_NAME
  const companyLogoUrl = cleanOptionalText(model.branding?.companyLogoUrl)
  const { companyBodyLines, identityLine, companyNameAr, companyBodyLinesAr } = buildInvoicePadCompanyLines(model.branding)
  const hasArabicHeader = Boolean(companyNameAr)
  const lineItems = buildInvoiceLineItems(record)
  const customerName = asText(record?.customer_name)
  const invoiceNumber = asText(record?.number)
  const invoiceDate = formatDate(record?.created_at)
  const footerNote = cleanOptionalText(model.branding?.footerNote)
  const noteLines = splitMultilineText(record?.notes)

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(model.title)}</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 24px;
        background: #ece8df;
        color: #111827;
        font-family: "Arial", "Helvetica Neue", sans-serif;
      }

      .sheet {
        width: 100%;
        max-width: 670px;
        margin: 0 auto;
        padding: 10mm 11mm 12mm;
        background: #ffffff;
        box-shadow: 0 14px 40px rgba(15, 23, 42, 0.12);
      }

      .header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 205px;
        align-items: flex-start;
        gap: 14px;
      }

      .header-bilingual {
        grid-template-columns: minmax(0, 1fr) 205px minmax(0, 1fr);
      }

      .company-block {
        min-width: 0;
      }

      .company-heading-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .company-logo {
        width: 34px;
        height: 34px;
        object-fit: contain;
        border-radius: 8px;
        flex-shrink: 0;
      }

      .company-block-ar {
        min-width: 0;
        text-align: right;
        font-family: "Tahoma", "Segoe UI", "Geeza Pro", "Arial", sans-serif;
      }

      .company-block-ar .company-name {
        text-transform: none;
        letter-spacing: normal;
      }

      .company-name {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      .company-line {
        margin-top: 2px;
        font-size: 10.3px;
        line-height: 1.25;
      }

      .identity-box {
        display: inline-flex;
        align-items: center;
        margin-top: 7px;
        padding: 6px 12px;
        border: 1px solid #111827;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        line-height: 1.4;
      }

      .invoice-block {
        min-width: 0;
        padding-top: 3px;
      }

      .invoice-title-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 0;
      }

      .invoice-title {
        margin: 0;
        font-size: 21px;
        font-weight: 700;
      }

      .invoice-number-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 8px;
      }

      .invoice-number-prefix {
        font-size: 18px;
        font-weight: 700;
      }

      .invoice-number {
        min-width: 128px;
        padding: 5px 8px;
        border: 1px solid #111827;
        text-align: center;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.12em;
      }

      .meta-row {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        margin-top: 20px;
      }

      .client-line,
      .date-line {
        font-size: 12px;
      }

      .client-line {
        flex: 1;
        border-bottom: 1px dotted #111827;
        padding-bottom: 3px;
        font-family: "Times New Roman", Georgia, serif;
        font-style: italic;
      }

      .client-label,
      .date-label {
        font-weight: 700;
        font-style: italic;
      }

      .date-line {
        min-width: 125px;
        text-align: right;
        font-family: "Times New Roman", Georgia, serif;
        font-style: italic;
      }

      table {
        width: 100%;
        margin-top: 18px;
        border-collapse: collapse;
        table-layout: fixed;
      }

      thead {
        display: table-header-group;
      }

      th,
      td {
        border: 1px solid #111827;
        padding: 3px 6px;
        font-size: 10px;
        vertical-align: middle;
      }

      th {
        text-transform: uppercase;
        text-align: center;
        font-size: 9.8px;
        letter-spacing: 0.03em;
        font-weight: 700;
      }

      .qty-col {
        width: 18%;
        text-align: center;
      }

      .designation-col {
        width: 44%;
      }

      .unit-col {
        width: 17%;
        text-align: right;
      }

      .amount-col {
        width: 21%;
        text-align: right;
      }

      tbody td {
        height: 20px;
      }

      .designation-cell {
        text-align: left;
        letter-spacing: 0.01em;
      }

      tfoot td {
        height: 24px;
        font-weight: 700;
      }

      .total-label-cell {
        text-align: center;
        letter-spacing: 0.08em;
      }

      .total-value-cell {
        text-align: right;
        font-size: 11px;
      }

      .notes,
      .footer-note {
        margin-top: 22px;
        font-size: 10px;
        line-height: 1.4;
        white-space: pre-wrap;
      }

      .notes + .footer-note {
        margin-top: 10px;
      }

      .notes-label {
        font-weight: 700;
      }

      @page {
        size: A4 portrait;
        margin: 12mm;
      }

      @media print {
        body {
          padding: 0;
          background: #ffffff;
        }

        .sheet {
          max-width: none;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <header class="header${hasArabicHeader ? ' header-bilingual' : ''}">
        <section class="company-block">
          <div class="company-heading-row">
            ${companyLogoUrl ? `<img src="${escapeHtml(companyLogoUrl)}" alt="" class="company-logo" />` : ''}
            <h1 class="company-name">${escapeHtml(companyName)}</h1>
          </div>
          ${companyBodyLines.map((line) => `<div class="company-line">${escapeHtml(line)}</div>`).join('')}
          ${identityLine ? `<div class="identity-box">${escapeHtml(identityLine)}</div>` : ''}
        </section>
        <section class="invoice-block">
          <div class="invoice-title-row">
            <h2 class="invoice-title">Facture</h2>
          </div>
          <div class="invoice-number-row">
            <span class="invoice-number-prefix">N°</span>
            <div class="invoice-number">${escapeHtml(invoiceNumber)}</div>
          </div>
        </section>
        ${hasArabicHeader ? `
        <section class="company-block-ar" dir="rtl" lang="ar">
          <h1 class="company-name">${escapeHtml(companyNameAr)}</h1>
          ${companyBodyLinesAr.map((line) => `<div class="company-line">${escapeHtml(line)}</div>`).join('')}
        </section>
        ` : ''}
      </header>

      <div class="meta-row">
        <div class="client-line">
          <span class="client-label">Client :</span>
          <span>${escapeHtml(customerName)}</span>
        </div>
        <div class="date-line">
          <span class="date-label">Le :</span>
          <span>${escapeHtml(invoiceDate)}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="qty-col">Quantité</th>
            <th class="designation-col">Désignation</th>
            <th class="unit-col">P.U.</th>
            <th class="amount-col">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.length > 0 ? lineItems.map((item) => `
            <tr>
              <td class="qty-col">${escapeHtml(item.quantity)}</td>
              <td class="designation-col designation-cell">${escapeHtml(item.name)}</td>
              <td class="unit-col">${escapeHtml(item.unitPrice)}</td>
              <td class="amount-col">${escapeHtml(item.total)}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="4">Aucune ligne facture disponible.</td>
            </tr>
          `}
        </tbody>
        <tfoot>
          <tr>
            <td class="qty-col"></td>
            <td class="designation-col"></td>
            <td class="unit-col total-label-cell">TOTAL</td>
            <td class="amount-col total-value-cell">${escapeHtml(formatMoney(record?.total))}</td>
          </tr>
        </tfoot>
      </table>

      ${noteLines.length > 0 ? `
        <div class="notes">
          <span class="notes-label">Note :</span>
          <span>${escapeHtml(noteLines.join(' | '))}</span>
        </div>
      ` : ''}
      ${footerNote ? `<div class="footer-note">${escapeHtml(footerNote)}</div>` : ''}
    </main>
  </body>
</html>`
}

export function buildPrintHtml(model) {
  if (isSinglePadInvoiceDocument(model)) {
    return buildInvoicePadHtml(model)
  }

  const brandLogoUrl = cleanOptionalText(model.branding?.companyLogoUrl)
  const brandName = cleanOptionalText(model.branding?.companyName) || DEFAULT_DOCUMENT_BRAND_NAME
  const headerLines = Array.isArray(model.branding?.headerLines) ? model.branding.headerLines : []
  const footerNote = cleanOptionalText(model.branding?.footerNote)
  const companyNameAr = cleanOptionalText(model.branding?.companyNameAr)
  const companyBodyLinesAr = Array.isArray(model.branding?.companyBodyLinesAr) ? model.branding.companyBodyLinesAr : []
  const hasArabicHeader = Boolean(companyNameAr)

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(model.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #475569;
        --line: #dbe3ec;
        --surface: #ffffff;
        --soft: #f8fafc;
        --brand: #0f766e;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 32px;
        font-family: "Segoe UI", Tahoma, sans-serif;
        color: var(--ink);
        background: #eef4f5;
      }

      .sheet {
        max-width: 1120px;
        margin: 0 auto;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 28px 30px 34px;
      }

      .header {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 22px;
        padding-bottom: 18px;
        border-bottom: 1px solid var(--line);
      }

      .brand {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        margin-bottom: 14px;
      }

      .brand-logo {
        width: 58px;
        height: 58px;
        object-fit: contain;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: #ffffff;
        padding: 8px;
        flex-shrink: 0;
      }

      .brand-copy {
        min-width: 0;
      }

      .brand-name {
        font-size: 15px;
        font-weight: 700;
        color: var(--brand);
      }

      .brand-line {
        margin-top: 4px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.5;
      }

      h1 {
        margin: 0;
        font-size: 26px;
        line-height: 1.1;
      }

      .subtitle {
        margin-top: 8px;
        color: var(--muted);
        font-size: 13px;
      }

      .meta {
        min-width: 260px;
        text-align: right;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.6;
      }

      .header-bilingual {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 260px) minmax(0, 1fr);
      }

      .header-bilingual .meta {
        min-width: 0;
      }

      .brand-ar {
        min-width: 0;
        text-align: right;
        font-family: "Tahoma", "Segoe UI", "Geeza Pro", "Arial", sans-serif;
      }

      .brand-ar .brand-name {
        color: var(--brand);
      }

      .brand-ar .brand-line {
        margin-top: 4px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.5;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 12px;
        margin-bottom: 22px;
      }

      .summary-card {
        background: var(--soft);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 14px 16px;
      }

      .summary-label {
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 6px;
      }

      .summary-value {
        font-size: 16px;
        font-weight: 700;
      }

      .document-section + .document-section {
        margin-top: 22px;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 15px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid var(--line);
        border-radius: 16px;
        overflow: hidden;
      }

      thead {
        background: #eff6ff;
      }

      th,
      td {
        border-bottom: 1px solid var(--line);
        padding: 11px 12px;
        text-align: left;
        font-size: 12px;
        vertical-align: top;
      }

      th {
        font-size: 11px;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: var(--muted);
      }

      tbody tr:nth-child(even) {
        background: #fcfdff;
      }

      .empty-row {
        text-align: center;
        color: var(--muted);
        font-style: italic;
      }

      .key-value-table th {
        width: 240px;
        background: var(--soft);
        text-transform: none;
        letter-spacing: 0;
      }

      .text-section {
        margin: 0;
        padding: 16px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: var(--soft);
        color: var(--muted);
        white-space: pre-wrap;
      }

      .footer-note {
        margin-top: 22px;
        padding: 14px 16px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: var(--soft);
        color: var(--muted);
        font-size: 12px;
        line-height: 1.6;
        white-space: pre-wrap;
      }

      @media print {
        body {
          background: transparent;
          padding: 0;
        }

        .sheet {
          border: none;
          border-radius: 0;
          padding: 0;
          max-width: none;
        }

        @page {
          size: ${model.orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
          margin: 14mm;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <header class="header${hasArabicHeader ? ' header-bilingual' : ''}">
        <div>
          <div class="brand">
            ${brandLogoUrl ? `<img src="${escapeHtml(brandLogoUrl)}" alt="${escapeHtml(brandName)}" class="brand-logo" />` : ''}
            <div class="brand-copy">
              <div class="brand-name">${escapeHtml(brandName)}</div>
              ${headerLines.map((line) => `<div class="brand-line">${escapeHtml(line)}</div>`).join('')}
            </div>
          </div>
          <h1>${escapeHtml(model.title)}</h1>
          ${model.subtitle ? `<div class="subtitle">${escapeHtml(model.subtitle)}</div>` : ''}
        </div>
        <div class="meta">
          ${model.meta.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
        </div>
        ${hasArabicHeader ? `
        <div class="brand-ar" dir="rtl" lang="ar">
          <div class="brand-name">${escapeHtml(companyNameAr)}</div>
          ${companyBodyLinesAr.map((line) => `<div class="brand-line">${escapeHtml(line)}</div>`).join('')}
        </div>
        ` : ''}
      </header>

      ${renderSummary(model.summary)}
      ${model.sections.map((section) => renderSection(section)).join('')}
      ${footerNote ? `<div class="footer-note">${escapeHtml(footerNote)}</div>` : ''}
    </main>
  </body>
</html>`
}

async function loadImageAsDataUrl(url) {
  const targetUrl = cleanOptionalText(url)

  if (!targetUrl || typeof fetch !== 'function' || typeof FileReader === 'undefined') {
    return null
  }

  try {
    const response = await fetch(targetUrl)

    if (!response.ok) {
      return null
    }

    const blob = await response.blob()

    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function imageFormatFromDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') {
    return 'PNG'
  }

  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return 'JPEG'
  }

  if (dataUrl.startsWith('data:image/webp')) {
    return 'WEBP'
  }

  return 'PNG'
}

function cleanupPrintFrame(frame) {
  if (frame?.parentNode) {
    frame.parentNode.removeChild(frame)
  }
}

function createInlinePrintTarget(html) {
  if (typeof document === 'undefined' || !document.body) {
    throw new Error('print_target_unavailable')
  }

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  frame.style.opacity = '0'
  frame.style.pointerEvents = 'none'
  frame.style.visibility = 'hidden'

  document.body.appendChild(frame)

  const printWindow = frame.contentWindow
  const printDocument = printWindow?.document

  if (!printWindow || !printDocument) {
    cleanupPrintFrame(frame)
    throw new Error('print_target_unavailable')
  }

  printDocument.open()
  printDocument.write(html)
  printDocument.close()

  return {
    printWindow,
    cleanup: () => cleanupPrintFrame(frame),
  }
}

function createPopupPrintTarget(html) {
  const printWindow = window.open('', '_blank', 'width=1280,height=900')

  if (!printWindow) {
    throw new Error('print_window_blocked')
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  return {
    printWindow,
    cleanup: () => printWindow.close(),
  }
}

function schedulePrint(printWindow, cleanup) {
  let cleanedUp = false

  const finalize = () => {
    if (cleanedUp) return
    cleanedUp = true
    cleanup?.()
  }

  const fallbackTimer = window.setTimeout(() => {
    finalize()
  }, 60000)

  const handleAfterPrint = () => {
    window.clearTimeout(fallbackTimer)
    window.setTimeout(finalize, 150)
  }

  if (typeof printWindow.addEventListener === 'function') {
    printWindow.addEventListener('afterprint', handleAfterPrint, { once: true })
  } else {
    printWindow.onafterprint = handleAfterPrint
  }

  window.setTimeout(() => {
    try {
      if (typeof printWindow.focus === 'function') {
        printWindow.focus()
      }

      if (typeof printWindow.print === 'function') {
        printWindow.print()
        return
      }

      handleAfterPrint()
    } catch (error) {
      console.error('print_failed', error)
      window.clearTimeout(fallbackTimer)
      finalize()
    }
  }, 250)
}

// jsPDF/autoTable equivalent of buildInvoicePadHtml, drawn directly onto the
// PDF canvas so "Télécharger le PDF" matches the print/HTML layout exactly.
// French-only vector text by design: jsPDF's standard fonts have no Arabic
// glyphs and jsPDF does no bidi/contextual letter-shaping. Only called when
// no Arabic company content is configured - downloadDocumentPdf routes to
// renderDocumentSnapshotCanvas (a real browser-rendered rasterization)
// instead whenever it is, for every document type, not just invoices.
function buildInvoicePadPdf(doc, autoTable, model, logoDataUrl) {
  const record = model.record ?? {}
  const lineItems = buildInvoiceLineItems(record)
  const companyName = cleanOptionalText(model.branding?.companyName) || DEFAULT_DOCUMENT_BRAND_NAME
  const { companyBodyLines, identityLine } = buildInvoicePadCompanyLines(model.branding)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const left = 58
  const right = 58
  const top = 54
  const contentWidth = pageWidth - left - right
  const invoiceBlockWidth = 168
  const companyBlockWidth = contentWidth - invoiceBlockWidth - 14
  const qtyColWidth = 86
  const designationColWidth = 211
  const unitColWidth = 80
  const amountColWidth = contentWidth - qtyColWidth - designationColWidth - unitColWidth
  const logoSize = logoDataUrl ? 28 : 0
  const textLeft = left + (logoSize > 0 ? logoSize + 8 : 0)

  let cursorY = top

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, imageFormatFromDataUrl(logoDataUrl), left, cursorY - 4, logoSize, logoSize)
    } catch {
      // Ignore image rendering failures and continue with text branding.
    }
  }

  doc.setDrawColor(17, 24, 39)
  doc.setTextColor(17, 24, 39)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(normalizeText(companyName), textLeft, cursorY)
  cursorY += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.8)
  companyBodyLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(normalizeText(line), companyBlockWidth - (textLeft - left))
    doc.text(wrapped, textLeft, cursorY)
    cursorY += wrapped.length * 9.5
  })

  if (identityLine) {
    const badgeWidth = Math.min(companyBlockWidth, Math.max(132, doc.getTextWidth(normalizeText(identityLine)) + 20))
    doc.roundedRect(left, cursorY + 2, badgeWidth, 16, 7, 7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.text(normalizeText(identityLine), left + 10, cursorY + 12)
    cursorY += 24
  }

  const invoiceBlockLeft = pageWidth - right - invoiceBlockWidth
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Facture', invoiceBlockLeft + invoiceBlockWidth / 2, top + 2, { align: 'center' })
  doc.setFontSize(15)
  doc.text('N°', invoiceBlockLeft + 14, top + 25)
  doc.rect(invoiceBlockLeft + 34, top + 12, invoiceBlockWidth - 34, 24)
  doc.setFontSize(14)
  doc.text(
    normalizeText(asText(record?.number)),
    invoiceBlockLeft + 34 + (invoiceBlockWidth - 34) / 2,
    top + 28,
    { align: 'center' },
  )

  cursorY = Math.max(cursorY + 16, top + 52)
  doc.setFont('times', 'italic')
  doc.setFontSize(10.5)
  doc.text('Client :', left, cursorY)
  doc.text(normalizeText(asText(record?.customer_name)), left + 42, cursorY)
  doc.line(left + 40, cursorY + 2, pageWidth - right - 110, cursorY + 2)
  doc.text(`Le : ${normalizeText(formatDate(record?.created_at))}`, pageWidth - right, cursorY, { align: 'right' })
  cursorY += 16

  doc.setFont('helvetica', 'normal')
  autoTable(doc, {
    startY: cursorY,
    head: [['Quantité', 'Désignation', 'P.U.', 'Montant']],
    body: lineItems.length > 0
      ? lineItems.map((item) => [item.quantity, item.name, item.unitPrice, item.total])
      : [['-', 'Aucune ligne facture disponible.', '-', '-']],
    theme: 'grid',
    margin: { left, right },
    styles: {
      font: 'helvetica',
      fontSize: 8.4,
      textColor: [17, 24, 39],
      lineColor: [17, 24, 39],
      lineWidth: 0.45,
      cellPadding: { top: 3.2, right: 4.5, bottom: 3.2, left: 4.5 },
      overflow: 'linebreak',
      valign: 'middle',
      minCellHeight: 18,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: qtyColWidth, halign: 'center' },
      1: { cellWidth: designationColWidth },
      2: { cellWidth: unitColWidth, halign: 'right' },
      3: { cellWidth: amountColWidth, halign: 'right' },
    },
  })

  cursorY = doc.lastAutoTable.finalY

  if (cursorY > pageHeight - 64) {
    doc.addPage()
    cursorY = top
  } else {
    cursorY += 1.5
  }

  doc.setFont('helvetica', 'bold')
  doc.rect(left, cursorY, qtyColWidth, 18)
  doc.rect(left + qtyColWidth, cursorY, designationColWidth, 18)
  doc.rect(left + qtyColWidth + designationColWidth, cursorY, unitColWidth, 18)
  doc.rect(left + qtyColWidth + designationColWidth + unitColWidth, cursorY, amountColWidth, 18)
  doc.text('TOTAL', left + qtyColWidth + designationColWidth + unitColWidth / 2, cursorY + 12.5, { align: 'center' })
  doc.text(normalizeText(formatMoney(record?.total)), pageWidth - right - 6, cursorY + 12.5, { align: 'right' })
  cursorY += 40

  const trailingLines = [
    ...splitMultilineText(record?.notes).map((line) => `Note : ${line}`),
    cleanOptionalText(model.branding?.footerNote),
  ].filter(Boolean)

  if (trailingLines.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.3)
    trailingLines.forEach((line) => {
      if (cursorY > pageHeight - 40) {
        doc.addPage()
        cursorY = top
      }
      const wrapped = doc.splitTextToSize(normalizeText(line), contentWidth)
      doc.text(wrapped, left, cursorY)
      cursorY += wrapped.length * 9.5
    })
  }
}

function extractHtmlTag(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i'))
  return match ? match[1] : ''
}

// jsPDF's own `doc.html()` helper still routes text through jsPDF's standard
// fonts (WinAnsi-only, no Arabic glyphs, no bidi/shaping) via its context2d
// bridge - it does NOT rasterize by default, so it would not actually solve
// the Arabic rendering problem. This renders the document's real HTML/CSS
// (whichever template buildPrintHtml dispatches to for this document type)
// into a detached, off-screen DOM node and rasterizes it with html2canvas
// directly, so the browser's own text engine (which shapes Arabic correctly)
// draws the pixels once, and the PDF just embeds that as an image. Used for
// every document type once Arabic company content is configured, not just
// the invoice pad - see downloadDocumentPdf.
async function renderDocumentSnapshotCanvas(model) {
  const html = buildPrintHtml(model)
  const styleEl = document.createElement('style')
  styleEl.setAttribute('data-invoice-pdf-snapshot', 'true')
  styleEl.textContent = extractHtmlTag(html, 'style')

  const container = document.createElement('div')
  container.setAttribute('data-invoice-pdf-snapshot', 'true')
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '-10000px'
  container.style.background = '#ffffff'
  container.innerHTML = extractHtmlTag(html, 'body')

  document.head.appendChild(styleEl)
  document.body.appendChild(container)

  try {
    const { default: html2canvas } = await import('html2canvas')
    return await html2canvas(container.querySelector('.sheet') || container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    })
  } finally {
    document.body.removeChild(container)
    document.head.removeChild(styleEl)
  }
}

function addCanvasImageWithPagination(doc, canvas, margin) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const imgWidth = pageWidth - margin * 2
  const pageSlicePx = Math.floor(((pageHeight - margin * 2) * canvas.width) / imgWidth)

  let renderedPx = 0
  let firstPage = true

  while (renderedPx < canvas.height) {
    const sliceHeightPx = Math.min(pageSlicePx, canvas.height - renderedPx)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeightPx
    pageCanvas.getContext('2d').drawImage(
      canvas,
      0, renderedPx, canvas.width, sliceHeightPx,
      0, 0, canvas.width, sliceHeightPx,
    )

    if (!firstPage) {
      doc.addPage()
    }

    doc.addImage(
      pageCanvas.toDataURL('image/png'),
      'PNG',
      margin,
      margin,
      imgWidth,
      (sliceHeightPx * imgWidth) / canvas.width,
    )

    renderedPx += sliceHeightPx
    firstPage = false
  }
}

export async function downloadDocumentPdf(options) {
  const model = buildDocumentModel(options)
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({
    orientation: model.orientation,
    unit: 'pt',
    format: 'a4',
    compress: true,
  })

  if (model.branding?.companyNameAr) {
    const canvas = await renderDocumentSnapshotCanvas(model)
    addCanvasImageWithPagination(doc, canvas, 24)
    doc.save(model.filename)
    return model.filename
  }

  if (isSinglePadInvoiceDocument(model)) {
    const logoDataUrl = await loadImageAsDataUrl(model.branding?.companyLogoUrl)
    buildInvoicePadPdf(doc, autoTable, model, logoDataUrl)
    doc.save(model.filename)
    return model.filename
  }

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const left = 40
  const right = 40
  const top = 42
  const bottom = 30
  const maxWidth = pageWidth - left - right
  let cursorY = top
  const brandName = cleanOptionalText(model.branding?.companyName) || DEFAULT_DOCUMENT_BRAND_NAME
  const brandLogoDataUrl = await loadImageAsDataUrl(model.branding?.companyLogoUrl)
  const brandHeaderLines = Array.isArray(model.branding?.headerLines) ? model.branding.headerLines : []
  const footerNote = cleanOptionalText(model.branding?.footerNote)

  const brandLogoSize = brandLogoDataUrl ? 44 : 0
  const brandTextLeft = left + (brandLogoSize > 0 ? brandLogoSize + 14 : 0)

  if (brandLogoDataUrl) {
    try {
      doc.addImage(
        brandLogoDataUrl,
        imageFormatFromDataUrl(brandLogoDataUrl),
        left,
        cursorY - 2,
        brandLogoSize,
        brandLogoSize,
      )
    } catch {
      // Ignore image rendering failures and continue with text branding.
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 118, 110)
  doc.setFontSize(11)
  doc.text(normalizeText(brandName), brandTextLeft, cursorY + 10)

  let brandBlockHeight = 18

  if (brandHeaderLines.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(9)
    const detailLines = brandHeaderLines.flatMap((line) => doc.splitTextToSize(normalizeText(line), maxWidth - (brandTextLeft - left)))
    doc.text(detailLines, brandTextLeft, cursorY + 24)
    brandBlockHeight = Math.max(brandBlockHeight, 24 + (detailLines.length * 11))
  }

  brandBlockHeight = Math.max(brandBlockHeight, brandLogoSize)
  cursorY += brandBlockHeight + 12

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(20)
  const titleLines = doc.splitTextToSize(normalizeText(model.title), maxWidth)
  doc.text(titleLines, left, cursorY)
  cursorY += titleLines.length * 20

  if (model.subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(10)
    const subtitleLines = doc.splitTextToSize(normalizeText(model.subtitle), maxWidth)
    doc.text(subtitleLines, left, cursorY)
    cursorY += subtitleLines.length * 14 + 8
  }

  if (model.meta.length > 0) {
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(9)
    const metaLines = model.meta.flatMap((line) => doc.splitTextToSize(normalizeText(line), maxWidth))
    doc.text(metaLines, left, cursorY)
    cursorY += metaLines.length * 12 + 12
  }

  if (model.summary.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      body: model.summary.map((item) => [normalizeText(item.label), normalizeText(item.value)]),
      theme: 'grid',
      margin: { left, right },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [15, 23, 42],
        cellPadding: 6,
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [240, 249, 255], cellWidth: 160 },
      },
    })
    cursorY = doc.lastAutoTable.finalY + 18
  }

  model.sections.forEach((section) => {
    if (cursorY > pageHeight - 120) {
      doc.addPage()
      cursorY = top
    }

    if (section.title) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(12)
      doc.text(normalizeText(section.title), left, cursorY)
      cursorY += 12
    }

    if (section.kind === 'keyValue') {
      autoTable(doc, {
        startY: cursorY,
        body: section.rows.map((row) => [normalizeText(row.label), normalizeText(row.value)]),
        theme: 'grid',
        margin: { left, right },
        styles: {
          font: 'helvetica',
          fontSize: 9,
          textColor: [15, 23, 42],
          cellPadding: 6,
        },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 180 },
        },
      })
      cursorY = doc.lastAutoTable.finalY + 18
      return
    }

    if (section.kind === 'text') {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      const textLines = doc.splitTextToSize(normalizeText(section.text), maxWidth)
      doc.text(textLines, left, cursorY + 10)
      cursorY += textLines.length * 12 + 18
      return
    }

    autoTable(doc, {
      startY: cursorY,
      head: section.columns?.length ? [section.columns.map((column) => normalizeText(column))] : undefined,
      body: section.rows?.length
        ? section.rows.map((row) => row.map((cell) => normalizeText(cell)))
        : [[normalizeText(section.emptyMessage || 'Aucune donnée disponible.')]],
      theme: 'grid',
      margin: { left, right },
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        textColor: [15, 23, 42],
        cellPadding: 5,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [13, 148, 136],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
    })
    cursorY = doc.lastAutoTable.finalY + 18
  })

  if (footerNote) {
    if (cursorY > pageHeight - 90) {
      doc.addPage()
      cursorY = top
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    const footerLines = doc.splitTextToSize(normalizeText(footerNote), maxWidth)
    doc.text(footerLines, left, cursorY + 10)
    cursorY += footerLines.length * 12 + 18
  }

  const pageCount = doc.getNumberOfPages()

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`${normalizeText(brandName)}  |  Page ${page}/${pageCount}`, pageWidth - right, pageHeight - bottom, { align: 'right' })
  }

  doc.save(model.filename)

  return model.filename
}

export function printGeneratedDocument(options) {
  const model = buildDocumentModel(options)
  const html = buildPrintHtml(model)

  try {
    const inlineTarget = createInlinePrintTarget(html)
    schedulePrint(inlineTarget.printWindow, inlineTarget.cleanup)
  } catch (inlineError) {
    const popupTarget = createPopupPrintTarget(html)
    schedulePrint(popupTarget.printWindow, popupTarget.cleanup)
  }
}

export function resolveDocumentFallbackTitle(title, user, documentSettings) {
  const brandName = resolveDocumentTitleBrand(user, documentSettings)

  return title ? `${title} | ${brandName}` : brandName || DEFAULT_DOCUMENT_BRAND_NAME
}
