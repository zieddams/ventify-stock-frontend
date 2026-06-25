import { describe, expect, it } from 'vitest'
import { DOCUMENT_INVOICE_PRINTING_SETTING_KEY } from '../hooks/useDocumentLayouts'
import { buildDocumentModel, buildPrintHtml } from './documents'

const invoiceRecord = {
  id: 14,
  number: 'INV-20260625-0001',
  customer_name: 'Atlas Market',
  customer_phone: '55 100 200',
  customer_address: 'Rue du Lac',
  customer_tax_id: '1234567/A/M/000',
  rep_name: 'Nour Ben Ali',
  subtotal: 120,
  tax_rate: 19,
  tax_amount: 22.8,
  total: 142.8,
  paid_amount: 40,
  payment_status: 'partial',
  status: 'sent',
  created_at: '2026-06-25T09:30:00.000Z',
  notes: 'Deliver before noon.',
  depot: {
    name: 'Depot Centre',
    code: 'DEP-01',
    address: 'Zone industrielle, Bloc C',
    note: 'Open 08:00 - 17:00',
  },
  lines: [
    {
      product_name: 'Pompe 12V',
      qty: 2,
      unit: 'pcs',
      price: 60,
      total: 120,
    },
  ],
}

const currentUser = {
  company: {
    name: 'Atlas Distribution',
    logo_path: 'company-logos/atlas.png',
    logo_url: 'https://example.test/logo-atlas.png',
  },
}

describe('invoice documents', () => {
  it('uses company invoice settings for branding, depot details, and tax visibility', () => {
    const model = buildDocumentModel({
      documentKey: 'invoice_detail',
      records: [invoiceRecord],
      user: currentUser,
      documentSettings: {
        [DOCUMENT_INVOICE_PRINTING_SETTING_KEY]: {
          header_style: 'name_only',
          show_tax_breakdown: false,
          show_depot_details: true,
          header_note: 'Rue des Oliviers\nTunis 1001',
          footer_note: 'No returns after delivery.',
        },
      },
    })

    expect(model.branding.companyName).toBe('Atlas Distribution')
    expect(model.branding.companyLogoUrl).toBe('')
    expect(model.branding.headerLines).toEqual([
      'Rue des Oliviers',
      'Tunis 1001',
      'Depot: Depot Centre (DEP-01)',
      'Zone industrielle, Bloc C',
      'Open 08:00 - 17:00',
    ])
    expect(model.branding.footerNote).toBe('No returns after delivery.')

    const detailLabels = model.sections[0].rows.map((row) => row.label)
    expect(detailLabels).not.toContain('TVA')
    expect(detailLabels).not.toContain('Montant TVA')

    const html = buildPrintHtml(model)
    expect(html).toContain('Atlas Distribution')
    expect(html).toContain('Depot: Depot Centre (DEP-01)')
    expect(html).toContain('No returns after delivery.')
    expect(html).not.toContain('El Irtiwaa')
    expect(html).not.toContain('Montant TVA')
  })

  it('keeps tax fields and logo branding enabled by default', () => {
    const model = buildDocumentModel({
      documentKey: 'invoice_detail',
      records: [invoiceRecord],
      user: currentUser,
      documentLayouts: {
        invoice_detail: {
          fields: ['number', 'customer_name', 'tax_rate', 'tax_amount', 'total'],
          orientation: 'portrait',
        },
      },
    })

    expect(model.branding.companyLogoUrl).toBe('https://example.test/logo-atlas.png')
    expect(model.branding.showTaxBreakdown).toBe(true)

    const detailLabels = model.sections[0].rows.map((row) => row.label)
    expect(detailLabels).toContain('TVA')
    expect(detailLabels).toContain('Montant TVA')
  })

  it('does not inject the shared fallback logo into invoice branding when a company has no dedicated logo', () => {
    const model = buildDocumentModel({
      documentKey: 'invoice_detail',
      records: [invoiceRecord],
      user: {
        company: {
          name: 'Shared Brand Company',
          logo_path: '',
          logo_url: 'https://example.test/shared-fallback.png',
        },
      },
    })

    expect(model.branding.companyLogoUrl).toBe('')
  })
})
