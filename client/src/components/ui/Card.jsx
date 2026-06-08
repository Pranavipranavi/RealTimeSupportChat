export function Card({ children, className = "" }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-dark-card ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({ title, eyebrow, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p> : null}
        <h2 className="text-base font-bold text-slate-950 dark:text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}
