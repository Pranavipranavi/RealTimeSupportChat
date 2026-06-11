import { motion } from "framer-motion";

export function Card({ children, className = "" }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-dark-card ${className}`}
    >
      {children}
    </motion.section>
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
