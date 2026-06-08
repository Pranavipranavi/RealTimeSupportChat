import { GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import { Bot, LockKeyhole, Mail, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { useAuthStore } from "../store/authStore.js";
import { useUiStore } from "../store/uiStore.js";

export function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const pushToast = useUiStore((state) => state.pushToast);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function nextPath(user) {
    if (user.role === "admin") return "/admin";
    if (user.role === "agent") return "/agent";
    return "/customer";
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = isLogin
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, role: form.role };
      const session = await api.post(`/api/auth/${isLogin ? "login" : "register"}`, payload);
      setSession(session);
      pushToast({ title: "Welcome to SupportFlow AI", body: "Your workspace is ready." });
      navigate(nextPath(session.user));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(credentialResponse) {
    try {
      const session = await api.post("/api/auth/google", { credential: credentialResponse.credential, role: form.role });
      setSession(session);
      navigate(nextPath(session.user));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="grid min-h-screen bg-slate-50 text-slate-950 dark:bg-dark-bg dark:text-white lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-slate-950/56" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="flex items-center gap-3 font-black">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary"><Bot className="h-5 w-5" /></span>
            SupportFlow AI
          </Link>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-200">Real-time support SaaS</p>
            <h1 className="mt-3 max-w-xl text-5xl font-black leading-tight">A serious portfolio app for serious product teams.</h1>
          </div>
        </div>
      </section>
      <main className="grid place-items-center p-4">
        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-dark-card"
        >
          <Link to="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-white"><Bot className="h-5 w-5" /></span>
            <span className="font-black">SupportFlow AI</span>
          </Link>
          <h2 className="text-2xl font-black">{isLogin ? "Welcome back" : "Create your workspace"}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{isLogin ? "Login to continue supporting customers." : "Register as a customer or support agent."}</p>

          <div className="mt-6 space-y-4">
            {!isLogin ? <Input label="Name" icon={User} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /> : null}
            <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            <Input label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} required />
            {!isLogin ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Role</span>
                <select className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                  <option value="customer">Customer</option>
                  <option value="agent">Support Agent</option>
                </select>
              </label>
            ) : null}
          </div>
          {error ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p> : null}
          <Button className="mt-6 w-full" isLoading={loading} icon={isLogin ? LockKeyhole : Mail}>{isLogin ? "Login" : "Register"}</Button>
          {isLogin ? <Link className="mt-3 block text-right text-sm font-bold text-primary" to="/forgot-password">Forgot password?</Link> : null}
          <div className="mt-4 overflow-hidden rounded-lg">
            <GoogleLogin onSuccess={handleGoogle} onError={() => setError("Google login failed")} useOneTap={false} />
          </div>
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {isLogin ? "New here?" : "Already have an account?"}{" "}
            <Link className="font-bold text-primary" to={isLogin ? "/register" : "/login"}>{isLogin ? "Create account" : "Login"}</Link>
          </p>
        </motion.form>
      </main>
    </div>
  );
}
