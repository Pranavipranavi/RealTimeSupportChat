import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useUiStore } from "../../store/uiStore.js";

function Toast({ toast }) {
  const removeToast = useUiStore((state) => state.removeToast);
  useEffect(() => {
    const id = setTimeout(() => removeToast(toast.id), 4200);
    return () => clearTimeout(id);
  }, [removeToast, toast.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      className="glass pointer-events-auto flex w-80 items-start gap-3 rounded-lg p-4 shadow-xl"
    >
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-950 dark:text-white">{toast.title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{toast.body}</p>
      </div>
      <button className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => removeToast(toast.id)} aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export function ToastHost() {
  const toasts = useUiStore((state) => state.toasts);
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-3">
      <AnimatePresence>{toasts.map((toast) => <Toast key={toast.id} toast={toast} />)}</AnimatePresence>
    </div>
  );
}
