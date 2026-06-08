export function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span> : null}
      <input
        className={`focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 shadow-sm transition placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${className}`}
        {...props}
      />
      {error ? <span className="mt-1 block text-xs font-medium text-rose-500">{error}</span> : null}
    </label>
  );
}

export function Textarea({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label ? <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span> : null}
      <textarea
        className={`focus-ring min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 shadow-sm transition placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${className}`}
        {...props}
      />
      {error ? <span className="mt-1 block text-xs font-medium text-rose-500">{error}</span> : null}
    </label>
  );
}
