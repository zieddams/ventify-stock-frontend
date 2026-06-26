import { forwardRef, useMemo, useState } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { fr } from 'date-fns/locale/fr'
import Flatpickr from 'react-flatpickr'
import { French } from 'flatpickr/dist/l10n/fr.js'
import 'flatpickr/dist/flatpickr.css'
import 'react-datepicker/dist/react-datepicker.css'
import { Link } from 'react-router-dom'
import { useI18n } from '../../contexts/I18nContext'
import {
  DATE_SELECTOR_DEFAULTS,
  DATE_SELECTOR_VARIANTS,
  formatDateSelectorValue,
  getTodayDateSelectorValue,
  toDateSelectorFlatpickrValue,
  toDateSelectorPayload,
} from './dateSelectorPreview'

registerLocale('irtiwaa-fr', fr)

const FLATPICKR_LOCALE = {
  ...French,
  rangeSeparator: ' au ',
}

const REACT_DATEPICKER_PORTAL_ID = 'developer-elements-datepicker-portal'
const REACT_DATEPICKER_POPPER_PROPS = {
  strategy: 'fixed',
}

const PICKER_SCENARIOS = [
  {
    key: 'invoice',
    mode: 'date',
    icon: 'fa-solid fa-file-invoice',
  },
  {
    key: 'schedule',
    mode: 'datetime',
    icon: 'fa-solid fa-clock',
  },
  {
    key: 'report',
    mode: 'range',
    icon: 'fa-solid fa-chart-line',
  },
]

function AccentBadge({ accent, children, strong = false }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
      style={strong
        ? {
            background: accent,
            color: '#ffffff',
            boxShadow: `0 12px 24px ${accent}2e`,
          }
        : {
            background: `${accent}18`,
            color: accent,
            boxShadow: `inset 0 0 0 1px ${accent}26`,
          }}
    >
      {children}
    </span>
  )
}

function SummaryStrip({ summary, t }) {
  const emptyValue = t('developerElementsPage.summary.empty')

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div className="picker-lab__summary-item">
        <div className="picker-lab__summary-label">{t('developerElementsPage.summary.display')}</div>
        <div className="picker-lab__summary-value" dir="ltr">{summary.isEmpty ? emptyValue : summary.display}</div>
      </div>
      <div className="picker-lab__summary-item">
        <div className="picker-lab__summary-label">{t('developerElementsPage.summary.payload')}</div>
        <div className="picker-lab__summary-value" dir="ltr">{summary.normalized || '--'}</div>
      </div>
      <div className="picker-lab__summary-item">
        <div className="picker-lab__summary-label">{t('developerElementsPage.summary.context')}</div>
        <div className="picker-lab__summary-value">{summary.isEmpty ? emptyValue : summary.context}</div>
      </div>
    </div>
  )
}

function buildFlatpickrOptions(mode, variantId) {
  return {
    locale: FLATPICKR_LOCALE,
    dateFormat: mode === 'datetime' ? 'Y-m-d H:i' : 'Y-m-d',
    altInput: true,
    altFormat: mode === 'datetime' ? 'd/m/Y H:i' : 'd/m/Y',
    altInputClass: `picker-lab__text-input picker-lab__text-input--${variantId}`,
    monthSelectorType: 'static',
    time_24hr: true,
    enableTime: mode === 'datetime',
    minuteIncrement: mode === 'datetime' ? 5 : 1,
    allowInput: true,
    disableMobile: true,
    static: true,
    mode: mode === 'range' ? 'range' : 'single',
    nextArrow: '<span aria-hidden="true">&#8250;</span>',
    prevArrow: '<span aria-hidden="true">&#8249;</span>',
  }
}

function ActionCardChrome({ scenario, variant, summary, onChange, t, control }) {
  return (
    <div className="picker-lab__panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div
              className="picker-lab__scenario-icon"
              style={{
                background: `rgba(${variant.accentRgb}, 0.14)`,
                color: variant.accent,
                boxShadow: `inset 0 0 0 1px rgba(${variant.accentRgb}, 0.16)`,
              }}
            >
              <i className={scenario.icon} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="picker-lab__scenario-kicker">
                {t(`developerElementsPage.scenarios.${scenario.key}.eyebrow`)}
              </div>
              <div className="mt-1 text-base font-semibold text-base-color">
                {t(`developerElementsPage.scenarios.${scenario.key}.title`)}
              </div>
              <div className="mt-1 text-sm leading-6 text-secondary-color">
                {t(`developerElementsPage.scenarios.${scenario.key}.description`)}
              </div>
            </div>
          </div>
        </div>

        <AccentBadge accent={variant.accent}>
          {t(`developerElementsPage.scenarios.${scenario.key}.badge`)}
        </AccentBadge>
      </div>

      <div className="picker-lab__control mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">
            {t(`developerElementsPage.scenarios.${scenario.key}.fieldLabel`)}
          </div>
          <div className="picker-lab__open-hint">
            <i className="fa-solid fa-arrow-pointer" /> {t('developerElementsPage.scenarios.openHint')}
          </div>
        </div>

        <div className="mt-3">{control}</div>

        <div className="picker-lab__module-footer">
          <span>{t(`developerElementsPage.scenarios.${scenario.key}.context`)}</span>
        </div>
      </div>

      <div className="mt-4">
        <SummaryStrip summary={summary} t={t} />
      </div>
    </div>
  )
}

const DateSelectorTextInput = forwardRef(function DateSelectorTextInput(props, ref) {
  const { className, value, ...rest } = props

  return (
    <input
      ref={ref}
      type="text"
      autoComplete="off"
      className={className}
      value={value || ''}
      dir="ltr"
      translate="no"
      data-no-translate="true"
      readOnly
      {...rest}
    />
  )
})

function DockTimeField({ value = '', onChange }) {
  return (
    <input
      type="time"
      step="300"
      autoComplete="off"
      className="picker-lab__dock-time-field"
      value={value || ''}
      onChange={(event) => onChange?.(event.target.value)}
      lang="fr-FR"
      dir="ltr"
      translate="no"
      data-no-translate="true"
    />
  )
}

function FlatpickrActionExampleCard({ scenario, variant, value, summary, onChange, t }) {
  const options = useMemo(
    () => buildFlatpickrOptions(scenario.mode, variant.id),
    [scenario.mode, variant.id],
  )

  return (
    <ActionCardChrome
      scenario={scenario}
      variant={variant}
      summary={summary}
      onChange={onChange}
      t={t}
      control={(
        <Flatpickr
          value={toDateSelectorFlatpickrValue(scenario.mode, value)}
          options={options}
          className="picker-lab__raw-input"
          placeholder={t(`developerElementsPage.scenarios.${scenario.key}.placeholder`)}
          onChange={(selectedDates) => {
            onChange(scenario.mode, toDateSelectorPayload(scenario.mode, selectedDates))
          }}
          lang="fr-FR"
          dir="ltr"
          translate="no"
          data-no-translate="true"
        />
      )}
    />
  )
}

function ReactDatepickerActionExampleCard({ scenario, variant, value, summary, onChange, t }) {
  const parsedValue = toDateSelectorFlatpickrValue(scenario.mode, value)
  const selectedDate = parsedValue instanceof Date ? parsedValue : null
  const rangeValue = Array.isArray(parsedValue) ? parsedValue : []
  const startDate = rangeValue[0] ?? null
  const endDate = rangeValue[1] ?? null
  const usesDockTimeInput = variant.key === 'dock' && scenario.mode === 'datetime'

  return (
    <ActionCardChrome
      scenario={scenario}
      variant={variant}
      summary={summary}
      onChange={onChange}
      t={t}
      control={(
        <DatePicker
          locale="irtiwaa-fr"
          selected={scenario.mode === 'range' ? undefined : selectedDate}
          startDate={scenario.mode === 'range' ? startDate : undefined}
          endDate={scenario.mode === 'range' ? endDate : undefined}
          selectsRange={scenario.mode === 'range'}
          showTimeSelect={scenario.mode === 'datetime' && !usesDockTimeInput}
          showTimeInput={usesDockTimeInput}
          dateFormat={scenario.mode === 'datetime' ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy'}
          rangeSeparator=" au "
          timeFormat="HH:mm"
          timeIntervals={5}
          shouldCloseOnSelect={scenario.mode !== 'datetime'}
          showPopperArrow={false}
          popperPlacement="bottom-start"
          fixedHeight={scenario.mode === 'range'}
          portalId={REACT_DATEPICKER_PORTAL_ID}
          popperProps={REACT_DATEPICKER_POPPER_PROPS}
          timeInputLabel={usesDockTimeInput ? t('developerElementsPage.scenarios.schedule.timeField') : undefined}
          customTimeInput={usesDockTimeInput ? <DockTimeField /> : undefined}
          autoComplete="off"
          placeholderText={t(`developerElementsPage.scenarios.${scenario.key}.placeholder`)}
          className={`picker-lab__react-input picker-lab__react-input--${variant.key}`}
          wrapperClassName={`picker-lab__react-wrapper picker-lab__react-wrapper--${variant.key}`}
          popperClassName={`picker-lab__react-popper picker-lab__react-popper--${variant.key}`}
          calendarClassName={`picker-lab__react-calendar picker-lab__react-calendar--${variant.key}`}
          customInput={<DateSelectorTextInput />}
          onChange={(nextValue) => {
            onChange(scenario.mode, toDateSelectorPayload(scenario.mode, nextValue))
          }}
        />
      )}
    />
  )
}

function ActionExampleCard({ scenario, variant, value, summary, onChange, t }) {
  if (variant.library === 'react-datepicker') {
    return (
      <ReactDatepickerActionExampleCard
        scenario={scenario}
        variant={variant}
        value={value}
        summary={summary}
        onChange={onChange}
        t={t}
      />
    )
  }

  return (
    <FlatpickrActionExampleCard
      scenario={scenario}
      variant={variant}
      value={value}
      summary={summary}
      onChange={onChange}
      t={t}
    />
  )
}

function VariantSection({ variant, index, values, summaries, onChange, t }) {
  const candidateNumber = String(index + 1).padStart(2, '0')
  const libraryLabel = variant.library === 'react-datepicker' ? 'React Datepicker' : 'Flatpickr'

  return (
    <section
      id={variant.id}
      className={`picker-lab-shell picker-lab-shell--${variant.key} scroll-mt-24`}
      style={{
        '--picker-accent': variant.accent,
        '--picker-accent-rgb': variant.accentRgb,
      }}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <a
            href={`#${variant.id}`}
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-color"
          >
            {candidateNumber} · #{variant.id}
          </a>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-[18px]"
              style={{
                background: `rgba(${variant.accentRgb}, 0.14)`,
                color: variant.accent,
                boxShadow: `inset 0 0 0 1px rgba(${variant.accentRgb}, 0.18)`,
              }}
            >
              <i className={variant.icon} />
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-bold text-base-color">
                {t(`developerElementsPage.designs.${variant.key}.title`)}
              </h2>
              <div className="mt-1 text-sm leading-6 text-secondary-color">
                {t(`developerElementsPage.designs.${variant.key}.blurb`)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
          {variant.favorite && (
            <AccentBadge accent={variant.accent} strong>
              {t('developerElementsPage.badges.favorite')}
            </AccentBadge>
          )}
          {variant.accepted && (
            <AccentBadge accent={variant.accent} strong>
              {t('developerElementsPage.badges.accepted')}
            </AccentBadge>
          )}
          <AccentBadge accent={variant.accent}>{libraryLabel}</AccentBadge>
          <AccentBadge accent={variant.accent}>{t('developerElementsPage.badges.clickOpen')}</AccentBadge>
          <AccentBadge accent={variant.accent}>{t('developerElementsPage.badges.range')}</AccentBadge>
        </div>
      </div>

      <div className="mt-4 text-sm leading-6 text-secondary-color">
        {t(`developerElementsPage.designs.${variant.key}.helper`)}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {PICKER_SCENARIOS.map((scenario) => (
          <ActionExampleCard
            key={`${variant.id}-${scenario.key}`}
            scenario={scenario}
            variant={variant}
            value={values[scenario.mode]}
            summary={summaries[scenario.mode]}
            onChange={onChange}
            t={t}
          />
        ))}
      </div>
    </section>
  )
}

export default function DeveloperElementsIndex() {
  const { t } = useI18n()
  const [values, setValues] = useState(DATE_SELECTOR_DEFAULTS)
  const totalCandidates = DATE_SELECTOR_VARIANTS.length

  const summaries = useMemo(
    () => ({
      date: formatDateSelectorValue('date', values.date),
      datetime: formatDateSelectorValue('datetime', values.datetime),
      range: formatDateSelectorValue('range', values.range),
    }),
    [values.date, values.datetime, values.range],
  )

  const handleFieldChange = (fieldType, nextValue) => {
    setValues((current) => ({
      ...current,
      [fieldType]: nextValue,
    }))
  }

  return (
    <div className="space-y-6">
      <section className="picker-lab-hero">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div>
            <div className="picker-lab-hero__eyebrow">
              {t('developerElementsPage.hero.eyebrow')}
            </div>

            <h2 className="mt-4 text-2xl font-bold text-base-color">
              {t('developerElementsPage.page.title')}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary-color">
              {t('developerElementsPage.hero.description')}
            </p>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-secondary-color">
              {t('developerElementsPage.hero.note')}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <AccentBadge accent="#0d9488">Flatpickr</AccentBadge>
              <AccentBadge accent="#1d4ed8">React Datepicker</AccentBadge>
              <AccentBadge accent="#ea580c">{t('developerElementsPage.badges.shared')}</AccentBadge>
              <AccentBadge accent="#7c3aed">{`${totalCandidates} candidates`}</AccentBadge>
            </div>
          </div>

          <div className="picker-lab-hero__side">
            <div className="text-sm font-semibold text-base-color">
              {t('developerElementsPage.links.title')}
            </div>
            <div className="mt-2 text-sm leading-6 text-secondary-color">
              {t('developerElementsPage.links.description')}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {DATE_SELECTOR_VARIANTS.map((variant, index) => (
                <a
                  key={variant.id}
                  href={`#${variant.id}`}
                  className="picker-lab__anchor"
                  style={{
                    background: `rgba(${variant.accentRgb}, 0.12)`,
                    color: variant.accent,
                    boxShadow: `inset 0 0 0 1px rgba(${variant.accentRgb}, 0.18)`,
                  }}
                >
                  {String(index + 1).padStart(2, '0')} · {variant.id}
                </a>
              ))}
            </div>

            <Link to="/developer" className="btn-secondary mt-4 w-full justify-center text-xs">
              <i className="fa-solid fa-arrow-left" /> {t('common.backToDashboard')}
            </Link>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {PICKER_SCENARIOS.map((scenario) => (
              <div key={`status-${scenario.key}`} className="picker-lab__status-strip">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-color">
                  {t(`developerElementsPage.scenarios.${scenario.key}.title`)}
                </div>
                <div className="mt-2 text-lg font-bold text-base-color" dir="ltr">
                  {summaries[scenario.mode].display}
                </div>
                <div className="mt-1 text-sm text-secondary-color" dir="ltr">
                  {summaries[scenario.mode].normalized || '--'}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 xl:items-end xl:justify-end">
            <button
              type="button"
              onClick={() => setValues((current) => ({ ...current, date: getTodayDateSelectorValue('date') }))}
              className="btn-secondary text-xs"
            >
              <i className="fa-solid fa-calendar-day" /> {t('developerElementsPage.actions.today')}
            </button>

            <button
              type="button"
              onClick={() => setValues((current) => ({ ...current, datetime: getTodayDateSelectorValue('datetime') }))}
              className="btn-secondary text-xs"
            >
              <i className="fa-solid fa-clock" /> {t('developerElementsPage.actions.now')}
            </button>

            <button
              type="button"
              onClick={() => setValues((current) => ({ ...current, range: getTodayDateSelectorValue('range') }))}
              className="btn-secondary text-xs"
            >
              <i className="fa-solid fa-calendar-week" /> {t('developerElementsPage.actions.week')}
            </button>

            <button
              type="button"
              onClick={() => setValues(DATE_SELECTOR_DEFAULTS)}
              className="btn-secondary text-xs"
            >
              <i className="fa-solid fa-rotate-right" /> {t('developerElementsPage.actions.sample')}
            </button>

            <button
              type="button"
              onClick={() => setValues({ date: '', datetime: '', range: '' })}
              className="btn-secondary text-xs"
            >
              <i className="fa-solid fa-eraser" /> {t('developerElementsPage.actions.clear')}
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        {DATE_SELECTOR_VARIANTS.map((variant, index) => (
          <VariantSection
            key={variant.id}
            index={index}
            variant={variant}
            values={values}
            summaries={summaries}
            onChange={handleFieldChange}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}
