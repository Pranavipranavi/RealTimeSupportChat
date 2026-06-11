const presence = {
  online: { label: "Online", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
  away: { label: "Away", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" },
  offline: { label: "Offline", dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400" }
};

export function PresenceBadge({ status = "offline", compact = false }) {
  const item = presence[status] || presence.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${item.text}`}>
      <span className={`h-2 w-2 rounded-full ${item.dot}`} />
      {compact ? null : item.label}
    </span>
  );
}
