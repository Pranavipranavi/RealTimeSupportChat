import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "./Button.jsx";

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", body = "New activity will appear here when it arrives.", action }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
      <Inbox className="mb-3 h-10 w-10 text-slate-400" />
      <h3 className="text-base font-bold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong", onRetry }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="mb-3 h-10 w-10 text-rose-500" />
      <h3 className="text-base font-bold text-slate-950 dark:text-white">Unable to load</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {onRetry ? <Button className="mt-4" variant="secondary" onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-dark-bg">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}
