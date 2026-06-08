import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import { useAuthStore } from "../../store/authStore.js";
import { formatDate } from "../../utils/format.js";
import { Button } from "../ui/Button.jsx";
import { EmptyState, SkeletonList } from "../ui/State.jsx";

function notificationTarget(notification, role) {
  if (!notification.conversationId) return "#";
  if (role === "admin") return `/admin/conversations/${notification.conversationId}`;
  if (role === "agent") return `/agent/chats/${notification.conversationId}`;
  return `/customer/chat/${notification.conversationId}`;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/api/notifications?limit=10"),
    enabled: true,
    refetchInterval: open ? 30000 : false
  });
  const markRead = useMutation({
    mutationFn: () => api.post("/api/notifications/read", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });
  const unread = query.data?.unread || 0;

  async function requestBrowserNotifications() {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  return (
    <div className="relative">
      <Button
        variant="secondary"
        className="relative h-10 w-10 px-0"
        aria-label="Notifications"
        onClick={() => {
          setOpen((value) => !value);
          requestBrowserNotifications();
        }}
      >
        <Bell className="h-4 w-4" />
        {unread ? <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-accent" /> : null}
      </Button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-slate-800">
            <p className="text-sm font-black">Notifications</p>
            <Button variant="ghost" className="h-8 px-2" icon={CheckCheck} onClick={() => markRead.mutate()}>Read</Button>
          </div>
          {query.isLoading ? <SkeletonList rows={3} /> : null}
          {!query.isLoading && !query.data?.notifications?.length ? <EmptyState title="No notifications" body="Realtime support activity appears here." /> : null}
          <div className="max-h-96 overflow-y-auto">
            {query.data?.notifications?.map((notification) => (
              <Link
                key={notification._id}
                to={notificationTarget(notification, user?.role)}
                className="block border-b border-slate-100 p-3 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                onClick={() => setOpen(false)}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1 h-2 w-2 rounded-full ${notification.readAt ? "bg-slate-300" : "bg-primary"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{notification.title}</p>
                    <p className="line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{notification.body}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">{formatDate(notification.createdAt)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
