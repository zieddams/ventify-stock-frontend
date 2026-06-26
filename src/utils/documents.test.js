import { describe, expect, it } from 'vitest'
import {
  DOCUMENT_COMPANY_PROFILE_SETTING_KEY,
  DOCUMENT_INVOICE_PRINTING_SETTING_KEY,
} from '../hooks/useDocumentLayouts'
import { buildCompanyScopedFilename, buildDocumentModel, buildPrintHtml, resolveDocumentFallbackTitle } from './documents'

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

const stockMovementRecord = {
  id: 91,
  type: 'adjustment',
  qty: -3,
  note: 'Inventory correction.',
  created_at: '2026-06-25T11:15:00.000Z',
  product: {
    name: 'Pompe 12V',
    reference: 'PMP-12V',
  },
  user: {
    name: 'Nour Ben Ali',
  },
}

const currentUser = {
  company: {
    name: 'Atlas Distribution',
    slug: 'atlas-distribution',
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

  it('injects company-scoped business identity fields into document branding when configured', () => {
    const model = buildDocumentModel({
      documentKey: 'invoice_detail',
      records: [invoiceRecord],
      user: currentUser,
      documentSettings: {
        [DOCUMENT_COMPANY_PROFILE_SETTING_KEY]: {
          legal_name: 'Atlas Distribution SARL',
          siret: '123 456 789 00012',
          tax_id: '1234567/A/M/000',
          phone: '+216 55 100 200',
          email: 'contact@atlas.test',
          address: 'Rue du Lac, Tunis',
          admin_name: 'Nour Ben Ali',
          admin_email: 'admin@atlas.test',
        },
      },
    })

    expect(model.branding.companyName).toBe('Atlas Distribution')
    expect(model.branding.headerLines).toContain('Atlas Distribution SARL')
    expect(model.branding.headerLines).toContain('SIRET: 123 456 789 00012 | MF: 1234567/A/M/000')
    expect(model.branding.headerLines).toContain('+216 55 100 200 | contact@atlas.test')
    expect(model.branding.headerLines).toContain('Rue du Lac, Tunis')
    expect(model.branding.headerLines).toContain('Admin: Nour Ben Ali | admin@atlas.test')

    const html = buildPrintHtml(model)
    expect(html).toContain('Atlas Distribution SARL')
    expect(html).toContain('SIRET: 123 456 789 00012 | MF: 1234567/A/M/000')
    expect(html).not.toContain('Gestion de vente')
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

  it('builds company-scoped export names and fallback print titles without the old generic brand', () => {
    expect(buildCompanyScopedFilename('factures', currentUser, null)).toBe('atlas_distribution_factures')
    expect(resolveDocumentFallbackTitle('Factures', currentUser, null)).toBe('Factures | Atlas Distribution')
    expect(resolveDocumentFallbackTitle('', null, {
      [DOCUMENT_COMPANY_PROFILE_SETTING_KEY]: {
        legal_name: 'Societe Papier',
      },
    })).toBe('Societe Papier')
  })

  it('reuses the same company identity on non-invoice stock movement documents', () => {
    const model = buildDocumentModel({
      documentKey: 'stock_movement_item',
      records: [stockMovementRecord],
      user: currentUser,
      documentSettings: {
        [DOCUMENT_COMPANY_PROFILE_SETTING_KEY]: {
          legal_name: 'Atlas Distribution SARL',
          siret: '123 456 789 00012',
          phone: '+216 55 100 200',
        },
      },
    })

    expect(model.branding.companyName).toBe('Atlas Distribution')
    expect(model.branding.headerLines).toContain('Atlas Distribution SARL')
    expect(model.branding.headerLines).toContain('SIRET: 123 456 789 00012')
    expect(model.branding.headerLines).toContain('+216 55 100 200')

    const html = buildPrintHtml(model)
    expect(html).toContain('Mouvement stock')
    expect(html).toContain('Atlas Distribution SARL')
    expect(html).toContain('Pompe 12V')
  })
})
