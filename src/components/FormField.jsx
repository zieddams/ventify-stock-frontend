export default function FormField({ label, error, children, required }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
