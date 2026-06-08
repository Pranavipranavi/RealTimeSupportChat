import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Bot, LayoutDashboard, LogOut, Menu, MessageSquare, Moon, Settings, Shield, Sun, Ticket, UserCog, Users, X } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { useAuthStore } from "../../store/authStore.js";
import { useUiStore } from "../../store/uiStore.js";
import { useSocket } from "../../hooks/useSocket.js";
import { Button } from "../ui/Button.jsx";
import { NotificationCenter } from "./NotificationCenter.jsx";

const navByRole = {
  customer: [
    { to: "/customer", label: "Dashboard", icon: LayoutDashboard },
    { to: "/customer/chat", label: "Chat", icon: MessageSquare },
    { to: "/profile", label: "Profile", icon: Settings }
  ],
  agent: [
    { to: "/agent", label: "Queue", icon: Ticket },
    { to: "/agent/chats", label: "Assigned Chats", icon: MessageSquare },
    { to: "/profile", label: "Profile", icon: Settings }
  ],
  admin: [
    { to: "/admin", label: "Overview", icon: Shield },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/agents", label: "Agents", icon: UserCog },
    { to: "/admin/conversations", label: "Conversations", icon: MessageSquare },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 }
  ]
};

function Sidebar({ onNavigate }) {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();
  const items = navByRole[user?.role] || navByRole.customer;

  async function logout() {
    try {
      await api.post("/api/auth/logout", {});
    } catch {
      // Local session still clears even if the network is unavailable.
    }
    clearSession();
    navigate("/login");
  }

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white/92 p-4 dark:border-slate-800 dark:bg-slate-950/92">
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-white shadow-glow">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">SupportFlow AI</p>
          <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{user?.role || "workspace"}</p>
        </div>
      </div>
      <nav className="mt-6 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-primary text-white shadow-lg shadow-blue-500/20" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <img className="h-9 w-9 rounded-full bg-slate-200 object-cover" src={user?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user?.name || "SF")}`} alt="" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
        </div>
        <Button className="mt-3 w-full" variant="ghost" icon={LogOut} onClick={logout}>Logout</Button>
      </div>
    </aside>
  );
}

export function ThemeToggle() {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  return (
    <Button variant="secondary" className="h-10 w-10 px-0" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function GlobalRealtime() {
  const queryClient = useQueryClient();
  useSocket({
    onNotification: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onConversationUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    }
  });
  return null;
}

export function AppShell() {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-dark-bg dark:text-white">
      <GlobalRealtime />
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">
        <Sidebar />
      </div>
      <AnimatePresence>
        {sidebarOpen ? (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-slate-950/40" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />
            <motion.div initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }} transition={{ type: "spring", damping: 24 }}>
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 sm:px-6">
          <div className="flex items-center gap-3">
            <Button className="h-10 w-10 px-0 lg:hidden" variant="secondary" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Workspace</p>
              <h1 className="text-base font-black text-slate-950 dark:text-white sm:text-lg">{user?.name ? `${user.name}'s SupportFlow` : "SupportFlow AI"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
