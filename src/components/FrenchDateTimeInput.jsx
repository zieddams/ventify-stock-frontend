import { forwardRef } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { fr } from 'date-fns/locale/fr'
import 'react-datepicker/dist/react-datepicker.css'
import { FIXED_DATE_INPUT_LANG } from '../i18n/locales'
import {
  DOCK_RAIL_DATE_PICKER_ACCENT,
  DOCK_RAIL_DATE_PICKER_ACCENT_RGB,
  DOCK_RAIL_DATE_PICKER_LOCALE,
  formatFrenchDateInputPayload,
  getFrenchDateInputDisplayFormat,
  getFrenchDateInputPlaceholder,
  normalizeFrenchDateInputType,
  parseFrenchDateInputValue,
  usesMonthPicker,
  usesTimeInput,
} from '../utils/frenchDateInput'

registerLocale(DOCK_RAIL_DATE_PICKER_LOCALE, fr)

const REACT_DATEPICKER_PORTAL_ID = 'irtiwaa-global-datepicker-portal'
const REACT_DATEPICKER_POPPER_PROPS = {
  strategy: 'fixed',
}

const DateTextInput = forwardRef(function DateTextInput(props, ref) {
  const {
    className,
    value,
    onClick,
    onFocus,
    ...rest
  } = props

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      autoComplete="off"
      className={className}
      value={value || ''}
      onClick={onClick}
      onFocus={onFocus}
      readOnly
      lang={FIXED_DATE_INPUT_LANG}
      dir="ltr"
      translate="no"
      data-no-translate="true"
    />
  )
})

function DockTimeField({ value = '', onChange }) {
  return (
    <input
      type="time"
      step="300"
      autoComplete="off"
      className="irtiwaa-date-input__time-field"
      value={value || ''}
      onChange={(event) => onChange?.(event.target.value)}
      lang={FIXED_DATE_INPUT_LANG}
      dir="ltr"
      translate="no"
      data-no-translate="true"
    />
  )
}

function buildSyntheticChangeEvent({ id, name, type, value }) {
  const target = {
    id,
    name,
    type,
    value,
  }

  return {
    target,
    currentTarget: target,
  }
}

export default function FrenchDateTimeInput({
  type = 'date',
  value = '',
  onChange,
  style,
  className,
  required = false,
  disabled = false,
  id,
  name,
  min,
  max,
  placeholder,
  ...props
}) {
  const normalizedType = normalizeFrenchDateInputType(type)
  const selectedValue = parseFrenchDateInputValue(normalizedType, value)
  const minValue = parseFrenchDateInputValue(normalizedType, min)
  const maxValue = parseFrenchDateInputValue(normalizedType, max)
  const monthPicker = usesMonthPicker(normalizedType)
  const timeInput = usesTimeInput(normalizedType)
  const isCompactMonthField = monthPicker && style?.width === 'auto'
  const shellClassName = [
    'irtiwaa-date-input-shell',
    `irtiwaa-date-input-shell--${normalizedType.replace('-local', '')}`,
    !required && !disabled ? 'irtiwaa-date-input-shell--clearable' : '',
    isCompactMonthField ? 'irtiwaa-date-input-shell--compact' : '',
    disabled ? 'irtiwaa-date-input-shell--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const shellStyle = {
    '--picker-accent': DOCK_RAIL_DATE_PICKER_ACCENT,
    '--picker-accent-rgb': DOCK_RAIL_DATE_PICKER_ACCENT_RGB,
    ...style,
    ...(isCompactMonthField ? { width: '12.25rem' } : null),
  }

  return (
    <div className={shellClassName} style={shellStyle}>
      <DatePicker
        {...props}
        locale={DOCK_RAIL_DATE_PICKER_LOCALE}
        selected={selectedValue}
        minDate={minValue ?? undefined}
        maxDate={maxValue ?? undefined}
        onChange={(nextValue) => {
          const nextSelected = Array.isArray(nextValue)
            ? nextValue.find((item) => item instanceof Date)
            : nextValue

          onChange?.(buildSyntheticChangeEvent({
            id,
            name,
            type: normalizedType,
            value: formatFrenchDateInputPayload(normalizedType, nextSelected),
          }))
        }}
        showMonthYearPicker={monthPicker}
        showTimeInput={timeInput}
        customTimeInput={timeInput ? <DockTimeField /> : undefined}
        timeInputLabel={timeInput ? 'Heure' : undefined}
        timeIntervals={timeInput ? 5 : undefined}
        shouldCloseOnSelect={!timeInput}
        fixedHeight={!monthPicker}
        dateFormat={getFrenchDateInputDisplayFormat(normalizedType)}
        placeholderText={placeholder || getFrenchDateInputPlaceholder(normalizedType)}
        isClearable={!required && !disabled}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        popperProps={REACT_DATEPICKER_POPPER_PROPS}
        portalId={REACT_DATEPICKER_PORTAL_ID}
        autoComplete="off"
        disabled={disabled}
        required={required}
        id={id}
        name={name}
        className="irtiwaa-date-input__field"
        wrapperClassName="irtiwaa-date-input__wrapper"
        popperClassName="irtiwaa-date-input__popper"
        calendarClassName="irtiwaa-date-input__calendar"
        customInput={<DateTextInput />}
      />
    </div>
  )
}
