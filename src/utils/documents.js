import { asText, formatDateTime, getDefaultDocumentFieldKeys, getDocumentDefinition } from './documentDefinitions'

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
  const combinedSummary = [
    ...(definition.buildSummary?.({ records: normalizedRecords, record }) ?? []),
    ...summary,
  ].filter((item) => item?.label && item?.value != null)
  const sections = []

  if (definition.scope === 'item') {
    sections.push({
      kind: 'keyValue',
      title: 'Détails',
      rows: layout.fields.map((field) => ({
        label: field.label,
        value: field.value(record),
      })),
    })
  } else {
    sections.push({
      kind: 'table',
      title: definition.tableTitle || 'Éléments',
      columns: layout.fields.map((field) => field.label),
      rows: normalizedRecords.map((currentRecord) => layout.fields.map((field) => field.value(currentRecord))),
      emptyMessage: definition.emptyMessage || 'Aucune donnée disponible pour cette vue.',
    })
  }

  sections.push(...(definition.buildSections?.({ records: normalizedRecords, record, fields: layout.fields }) ?? []))

  return {
    key: definition.key,
    title: title || definition.title,
    subtitle: subtitle || definition.description,
    filename: ensurePdfFilename(filename, definition.filename || definition.title),
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
  }
}

function buildPrintHtml(model) {
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
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 700;
        color: var(--brand);
        margin-bottom: 12px;
      }

      .brand-dot {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: linear-gradient(135deg, #14b8a6, #0f766e);
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
      <header class="header">
        <div>
          <div class="brand"><span class="brand-dot"></span>El Irtiwaa</div>
          <h1>${escapeHtml(model.title)}</h1>
          ${model.subtitle ? `<div class="subtitle">${escapeHtml(model.subtitle)}</div>` : ''}
        </div>
        <div class="meta">
          ${model.meta.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
        </div>
      </header>

      ${renderSummary(model.summary)}
      ${model.sections.map((section) => renderSection(section)).join('')}
    </main>
  </body>
</html>`
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

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const left = 40
  const right = 40
  const top = 42
  const bottom = 30
  const maxWidth = pageWidth - left - right
  let cursorY = top

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 118, 110)
  doc.setFontSize(11)
  doc.text('El Irtiwaa', left, cursorY)
  cursorY += 20

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

  const pageCount = doc.getNumberOfPages()

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`El Irtiwaa  |  Page ${page}/${pageCount}`, pageWidth - right, pageHeight - bottom, { align: 'right' })
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
