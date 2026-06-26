import { forwardRef } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { fr } from 'date-fns/locale/fr'
import 'react-datepicker/dist/react-datepicker.css'
import { FIXED_DATE_INPUT_LANG } from '../i18n/locales'
import {
  DOCK_RAIL_DATE_PICKER_ACCENT,
  DOCK_RAIL_DATE_PICKER_ACCENT_RGB,
  DOCK_RAIL_DATE_PICKER_LOCALE,
  FRENCH_DATE_RANGE_SEPARATOR,
  formatFrenchDateRangePayload,
  getFrenchDateRangePlaceholder,
  parseFrenchDateRangeValue,
  parseFrenchDateInputValue,
} from '../utils/frenchDateInput'

registerLocale(DOCK_RAIL_DATE_PICKER_LOCALE, fr)

const REACT_DATEPICKER_PORTAL_ID = 'irtiwaa-global-datepicker-portal'
const REACT_DATEPICKER_POPPER_PROPS = {
  strategy: 'fixed',
}

const DateRangeTextInput = forwardRef(function DateRangeTextInput(props, ref) {
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

export default function FrenchDateRangeInput({
  valueFrom = '',
  valueTo = '',
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
  const [startDate, endDate] = parseFrenchDateRangeValue(valueFrom, valueTo)
  const minValue = parseFrenchDateInputValue('date', min)
  const maxValue = parseFrenchDateInputValue('date', max)
  const shellClassName = [
    'irtiwaa-date-input-shell',
    'irtiwaa-date-input-shell--range',
    !required && !disabled ? 'irtiwaa-date-input-shell--clearable' : '',
    disabled ? 'irtiwaa-date-input-shell--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const shellStyle = {
    '--picker-accent': DOCK_RAIL_DATE_PICKER_ACCENT,
    '--picker-accent-rgb': DOCK_RAIL_DATE_PICKER_ACCENT_RGB,
    ...style,
  }

  return (
    <div className={shellClassName} style={shellStyle}>
      <DatePicker
        {...props}
        locale={DOCK_RAIL_DATE_PICKER_LOCALE}
        selectsRange
        startDate={startDate}
        endDate={endDate}
        selected={startDate}
        minDate={minValue ?? undefined}
        maxDate={maxValue ?? undefined}
        onChange={(nextValue) => {
          onChange?.(formatFrenchDateRangePayload(nextValue))
        }}
        fixedHeight
        dateFormat="dd/MM/yyyy"
        rangeSeparator={FRENCH_DATE_RANGE_SEPARATOR}
        placeholderText={placeholder || getFrenchDateRangePlaceholder()}
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
        popperClassName="irtiwaa-date-input__popper irtiwaa-date-input__popper--range"
        calendarClassName="irtiwaa-date-input__calendar irtiwaa-date-input__calendar--range"
        customInput={<DateRangeTextInput />}
      />
    </div>
  )
}
