import { FIXED_DATE_INPUT_LANG } from '../i18n/locales'

export default function FrenchDateTimeInput({ type = 'date', ...props }) {
  return (
    <input
      {...props}
      type={type}
      lang={FIXED_DATE_INPUT_LANG}
      dir="ltr"
      translate="no"
      data-no-translate="true"
    />
  )
}
