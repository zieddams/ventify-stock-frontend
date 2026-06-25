import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PaymentStatusBadge, StatusBadge } from '../../components/Badge'
import PageExportActions from '../../components/PageExportActions'
import { PageLoader } from '../../components/Spinner'
import { useI18n } from '../../contexts/I18nContext'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import { getConfigItemLabel, getDefaultConfigValue, useConfigItems } from '../../hooks/useConfigItems'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { filterPaymentMethodsByScope } from '../../utils/paymentMethodScopes'
import { formatCurrency, formatDate } from '../../utils/format'

const STATUSES = ['draft', 'sent', 'paid', 'cancelled']

export default function InvoiceShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const { items: configItems } = useConfigItems('payment_method')
  const { layouts: documentLayouts, invoicePrintSettings } = useDocumentLayouts()
  const paymentMethods = filterPaymentMethodsByScope(configItems.payment_method ?? [], 'customer')
  const availablePaymentMethods = paymentMethods.length > 0 ? paymentMethods : [{ value: 'cash', display_label: t('invoiceShow.cashFallback') }]
  const defaultPaymentMethod = getDefaultConfigValue(availablePaymentMethods, 'cash')
  const [payMethod, setPayMethod] = useState(defaultPaymentMethod)
  const [paying, setPaying] = useState(false)
  const { user, isAdmin } = useAuth()

  const statusLabels = useMemo(() => ({
    draft: t('badges.invoiceStatus.draft'),
    sent: t('badges.invoiceStatus.sent'),
    paid: t('badges.invoiceStatus.paid'),
    cancelled: t('badges.invoiceStatus.cancelled'),
  }), [t])

  const reload = async () => {
    const response = await api.get(`/invoices/${id}`)
    setInvoice(response.data)
  }

  useEffect(() => {
    api.get(`/invoices/${id}`).then((response) => {
      setInvoice(response.data)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    setPayMethod((current) => current || defaultPaymentMethod)
  }, [defaultPaymentMethod])

  const recordPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      return
    }

    setPaying(true)
    try {
      await api.post(`/invoices/${id}/payments`, { amount: Number(payAmount), method: payMethod })
      setPayAmount('')
      await reload()
    } catch (error) {
      window.alert(error.response?.data?.message ?? t('invoiceShow.genericError'))
    } finally {
      setPaying(false)
    }
  }

  const updateStatus = async (status) => {
    setUpdating(true)
    await api.patch(`/invoices/${id}/status`, { status })
    await reload()
    setUpdating(false)
  }

  const removeInvoice = async () => {
    if (!window.confirm(t('invoiceShow.deleteConfirm'))) {
      return
    }

    await api.delete(`/invoices/${id}`)
    navigate('/invoices')
  }

  if (loading) {
    return <PageLoader />
  }

  if (!invoice) {
    return (
      <div className="text-center py-20 text-muted-color">
        <i className="fa-solid fa-file-circle-xmark text-4xl opacity-30 mb-3 block" />
        {t('invoiceShow.notFound')}
      </div>
    )
  }

  const due = Number(invoice.total) - Number(invoice.paid_amount ?? 0)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-6 no-print">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/invoices" className="text-muted-color hover:text-base-color transition-colors">
            <i className="fa-solid fa-arrow-left mr-1.5" /> {t('layout.nav.invoices')}
          </Link>
          <span className="text-muted-color">/</span>
          <span className="font-mono text-secondary-color">{invoice.number}</span>
        </div>
        <PageExportActions
          title={t('invoiceShow.documentTitle', { number: invoice.number })}
          subtitle={invoice.customer_name ? t('invoiceShow.documentSubtitle', { customer: invoice.customer_name }) : ''}
          filename={`facture_${invoice.number}`}
          documentKey="invoice_detail"
          record={invoice}
          documentLayouts={documentLayouts}
          documentSettings={{ invoicePrintSettings }}
          currentUser={user}
        />
      </div>

      <div className="card mb-4">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-base-color">{invoice.number}</h1>
            <div className="text-sm text-muted-color mt-1">{formatDate(invoice.created_at)}</div>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-semibold text-muted-color uppercase tracking-wider mb-1.5">{t('invoiceShow.customerSection')}</div>
            <div className="font-semibold text-base-color">{invoice.customer_name}</div>
            {invoice.customer_phone ? <div className="text-secondary-color mt-0.5">{invoice.customer_phone}</div> : null}
            {invoice.customer_address ? <div className="text-secondary-color">{invoice.customer_address}</div> : null}
            {invoice.customer_tax_id ? <div className="text-muted-color font-mono text-xs mt-0.5">{t('invoiceShow.taxIdLabel', { value: invoice.customer_tax_id })}</div> : null}
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-color uppercase tracking-wider mb-1.5">{t('invoiceShow.repSection')}</div>
            <div className="text-secondary-color">{invoice.rep_name}</div>
            {invoice.zone ? <div className="text-muted-color text-xs mt-0.5">{invoice.zone.name}</div> : null}
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-base-color mb-4">{t('invoiceShow.linesTitle')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">{t('invoiceShow.columns.product')}</th>
                <th className="text-right pb-3 pr-3">{t('invoiceShow.columns.qty')}</th>
                <th className="text-right pb-3 pr-3">{t('invoiceShow.columns.unitPrice')}</th>
                <th className="text-right pb-3">{t('invoiceShow.columns.total')}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines?.map((line, index) => (
                <tr key={index} className="table-row">
                  <td className="py-2.5 pr-3 font-medium text-base-color">{line.product_name}</td>
                  <td className="py-2.5 pr-3 text-right text-secondary-color">{formatCurrency(line.qty, 3).replace(' TND', '')} {line.unit}</td>
                  <td className="py-2.5 pr-3 text-right font-mono text-secondary-color">{formatCurrency(line.unit_price ?? line.price, 3).replace(' TND', '')}</td>
                  <td className="py-2.5 text-right font-mono font-semibold text-base-color">{formatCurrency(line.total, 3).replace(' TND', '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 space-y-1.5 text-sm" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex justify-between text-secondary-color">
            <span>{t('invoiceShow.summary.subtotal')}</span>
            <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
          </div>
          {Number(invoice.tax_rate ?? 0) > 0 ? (
            <div className="flex justify-between text-secondary-color">
              <span>{t('invoiceShow.summary.tax', { rate: invoice.tax_rate })}</span>
              <span className="font-mono">{formatCurrency(invoice.tax_amount)}</span>
            </div>
          ) : null}
          {invoice.notes ? <div className="py-2 text-muted-color text-xs italic">{invoice.notes}</div> : null}
          <div className="flex justify-between font-bold text-base pt-1 text-base-color">
            <span>{t('invoiceShow.summary.total')}</span>
            <span className="font-mono">{formatCurrency(invoice.total)}</span>
          </div>
          {invoice.payment_status ? (
            <>
              <div className="flex justify-between text-secondary-color">
                <span>{t('invoiceShow.summary.paid')}</span>
                <span className="font-mono" style={{ color: '#059669' }}>{formatCurrency(invoice.paid_amount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-secondary-color">{t('invoiceShow.summary.remaining')}</span>
                <span className="font-mono" style={{ color: due > 0 ? '#dc2626' : '#059669' }}>
                  {formatCurrency(due)}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {invoice.customer_id && invoice.payment_status !== 'paid' ? (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-base-color">{t('invoiceShow.collectPaymentTitle')}</h2>
            <PaymentStatusBadge status={invoice.payment_status} />
          </div>
          <div className="flex gap-2">
            <input type="number" step="0.001" min="0" placeholder={t('invoiceShow.paymentAmountPlaceholder')} value={payAmount} onChange={(event) => setPayAmount(event.target.value)} className="flex-1" />
            <select value={payMethod} onChange={(event) => setPayMethod(event.target.value)} className="w-44">
              {availablePaymentMethods.map((method) => (
                <option key={method.id ?? method.value} value={method.value}>
                  {getConfigItemLabel(method)}
                </option>
              ))}
            </select>
            <button onClick={recordPayment} disabled={paying || !payAmount} className="btn-primary">
              {paying ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-check" /> {t('invoiceShow.collectAction')}</>}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 flex-wrap no-print">
        {STATUSES.filter((status) => status !== (invoice.status?.value ?? invoice.status)).map((status) => (
          <button key={status} onClick={() => updateStatus(status)} disabled={updating} className="btn-secondary text-xs">
            <i className="fa-solid fa-circle-dot mr-1 text-xs" />
            {t('invoiceShow.markAs', { status: statusLabels[status] })}
          </button>
        ))}
        {isAdmin() ? (
          <button onClick={removeInvoice} className="btn-danger text-xs ml-auto">
            <i className="fa-solid fa-trash-can" /> {t('invoiceShow.deleteAction')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
