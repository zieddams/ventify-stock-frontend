import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageExportActions from '../../components/PageExportActions'
import PageHeader from '../../components/PageHeader'
import RowDocumentActions from '../../components/RowDocumentActions'
import { PageLoader } from '../../components/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { useDocumentLayouts } from '../../hooks/useDocumentLayouts'
import api from '../../services/api'
import { formatCurrency, formatDate } from '../../utils/format'

export default function EmployeesIndex() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const canViewPayroll = ['admin', 'developer', 'comptable'].includes(me?.role)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const { layouts: documentLayouts, documentSettings } = useDocumentLayouts()

  useEffect(() => {
    let active = true

    api.get('/employees').then((response) => {
      if (active) setEmployees(Array.isArray(response.data) ? response.data : [])
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [])

  if (loading) {
    return <PageLoader />
  }

  return (
    <div>
      <PageHeader
        title={t('employeesPage.title')}
        subtitle={t('employeesPage.subtitle', { count: employees.length })}
        action={(
          <PageExportActions
            title={t('employeesPage.title')}
            documentKey="employees_list"
            records={employees}
            documentLayouts={documentLayouts}
            documentSettings={documentSettings}
          />
        )}
      />

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {[
                  t('employeesPage.columns.employee'),
                  t('employeesPage.columns.hireDate'),
                  ...(canViewPayroll ? [t('employeesPage.columns.baseSalary')] : []),
                  t('employeesPage.columns.profile'),
                  t('employeesPage.columns.actions'),
                ].map((heading) => (
                  <th key={heading} className="pb-3 pr-4 text-left">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((entry) => (
                <tr key={entry.id} className={`table-row ${!entry.active ? 'opacity-50' : ''}`}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}
                      >
                        {entry.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-base-color">{entry.name}</div>
                        <div className="text-xs text-secondary-color font-mono">{entry.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted-color text-xs">
                    {entry.hire_date ? formatDate(entry.hire_date) : t('common.notAvailable')}
                  </td>
                  {canViewPayroll && (
                    <td className="py-3 pr-4 text-secondary-color text-xs font-semibold">
                      {entry.base_salary != null ? formatCurrency(entry.base_salary) : t('common.notAvailable')}
                    </td>
                  )}
                  <td className="py-3 pr-4">
                    {entry.has_profile ? (
                      <span className="text-xs font-semibold text-emerald-600">
                        <i className="fa-solid fa-circle-check mr-1 text-[10px]" /> {t('employeesPage.profileComplete')}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600">
                        <i className="fa-solid fa-triangle-exclamation mr-1 text-[10px]" /> {t('employeesPage.profileMissing')}
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/employees/${entry.id}`)}
                        className="text-xs font-medium"
                        style={{ color: '#0d9488' }}
                      >
                        <i className="fa-solid fa-id-card mr-1" /> {t('employeesPage.actions.open')}
                      </button>
                      <RowDocumentActions
                        documentKey="employee_profile_item"
                        record={entry}
                        documentLayouts={documentLayouts}
                        documentSettings={documentSettings}
                        title={t('employeesPage.profileDocumentTitle', { name: entry.name })}
                        filename={`fiche_employe_${entry.id}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={canViewPayroll ? 5 : 4} className="py-12 text-center text-muted-color">
                    {t('employeesPage.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
