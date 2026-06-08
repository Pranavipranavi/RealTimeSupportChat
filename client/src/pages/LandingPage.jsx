import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Bot, CheckCircle2, MessageSquareText, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button.jsx";
import { ThemeToggle } from "../components/layout/AppShell.jsx";

const features = [
  ["Real-time inbox", "Socket.io conversations, typing states, read receipts, reactions, and presence.", MessageSquareText],
  ["Operational analytics", "Live ticket health, response time, satisfaction, and agent performance.", BarChart3],
  ["Secure roles", "JWT auth, Google login, protected routes, and RBAC for customers, agents, admins.", ShieldCheck],
  ["Smart support", "Automatic assignment, categorization, and local AI-style conversation summaries.", Sparkles]
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-dark-bg dark:text-white">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-white shadow-glow"><Bot className="h-5 w-5" /></span>
            <span className="font-black">SupportFlow AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300 md:flex">
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#analytics">Analytics</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login"><Button variant="secondary">Login</Button></Link>
            <Link to="/register"><Button icon={ArrowRight}>Start</Button></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-[92vh] overflow-hidden pt-28">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=2200&q=80')] bg-cover bg-center opacity-18 dark:opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50/88 to-white dark:from-dark-bg dark:via-dark-bg/90 dark:to-dark-bg" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_0.88fr] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                <Zap className="h-3.5 w-3.5" /> Real-time support operations
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-normal text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
                SupportFlow AI
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                A polished customer support workspace with live chat, ticket ownership, analytics, secure roles, uploads, and local AI-style summaries.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register"><Button className="px-5" icon={ArrowRight}>Create workspace</Button></Link>
                <a href="#showcase"><Button variant="secondary">View product</Button></a>
              </div>
            </motion.div>

            <motion.div id="showcase" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.45 }} className="glass rounded-lg p-3 shadow-2xl">
              <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">Live inbox</p>
                    <h2 className="text-xl font-black">Priority conversations</h2>
                  </div>
                  <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">12 online</span>
                </div>
                <div className="grid gap-3">
                  {["Billing renewal question", "API webhook failing", "Feature feedback"].map((item, index) => (
                    <div key={item} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold">{item}</p>
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${index === 1 ? "bg-pink-50 text-accent dark:bg-pink-500/10" : "bg-blue-50 text-primary dark:bg-blue-500/10"}`}>{index === 1 ? "technical" : "open"}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${64 - index * 13}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="bg-white py-20 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-wide text-primary">Product depth</p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">Everything a modern support team expects.</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {features.map(([title, body, Icon]) => (
                <div key={title} className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
                  <Icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-3">
            {["Customer starts a conversation", "SupportFlow assigns the best agent", "Admins monitor quality and velocity"].map((step, index) => (
              <div key={step} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-900 font-black text-white dark:bg-white dark:text-slate-950">{index + 1}</span>
                <div>
                  <h3 className="font-black">{step}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Clean workflows for support teams, customers, and operators without switching tools.</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="analytics" className="bg-white py-20 dark:bg-slate-950">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-primary">Analytics showcase</p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">Track response time, ticket health, and satisfaction.</h2>
              <p className="mt-4 leading-7 text-slate-600 dark:text-slate-400">The admin view is powered by real MongoDB aggregations, so portfolio demos can connect to actual production data.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
              {["Open tickets", "Resolved tickets", "CSAT", "Response speed"].map((label, index) => (
                <div key={label} className="mb-5 last:mb-0">
                  <div className="mb-2 flex justify-between text-sm font-bold"><span>{label}</span><span>{[34, 82, 91, 68][index]}%</span></div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${[34, 82, 91, 68][index]}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <h2 className="mt-4 text-3xl font-black sm:text-4xl">Built like a startup product.</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Production architecture, polished UX states, scalable role flows, and deployment-ready docs.</p>
            <Link className="mt-8 inline-block" to="/register"><Button icon={ArrowRight}>Launch SupportFlow AI</Button></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        SupportFlow AI. Real-time customer support, beautifully organized.
      </footer>
    </div>
  );
}
