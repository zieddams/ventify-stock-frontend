export default function FormField({ label, error, children, required }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-base-color mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
