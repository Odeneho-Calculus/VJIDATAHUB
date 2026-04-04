import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import { AlertCircle, Eye, EyeOff, ArrowLeft, ShieldCheck, Wallet, Activity, ChevronRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { refreshSettings } = useSettings();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please fill in all fields');
        return;
      }

      const data = await login(email, password);
      // Refresh settings immediately after login to ensure real-time values
      await refreshSettings();

      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden lg:flex min-h-full flex-col gap-8 overflow-hidden bg-slate-900 p-10 text-white xl:gap-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.22),transparent_32%)]" />
          <div className="relative flex flex-1 flex-col gap-8 min-h-0">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white transition-colors">
              <ArrowLeft size={16} />
              Back to homepage
            </Link>

            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-100 backdrop-blur-sm">
                <ShieldCheck size={14} className="text-cyan-300" />
                Secure access for agents and platform users
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">VJI DATA HUB  Workspace</p>
                <h1 className="mt-4 text-4xl font-black leading-tight text-white">
                  Sign in to manage orders, wallets and storefront activity.
                </h1>
              </div>
              <p className="max-w-xl text-base leading-7 text-slate-300">
                Access your dashboard with a cleaner workflow built for data operations, commissions, and performance visibility.
              </p>
            </div>

            <div className="grid gap-2.5">
              {[
                { icon: Wallet, title: 'Wallet visibility', desc: 'Track balances and funding activity from one place.' },
                { icon: Activity, title: 'Order monitoring', desc: 'Review status changes and delivery outcomes in real time.' },
                { icon: ShieldCheck, title: 'Protected access', desc: 'Secure authentication with role-based redirection after login.' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-300">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-auto rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Why sign in</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Move directly into your dashboard and continue working without extra steps.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                <ArrowLeft size={16} />
                Home
              </Link>
              <div className="text-right">
                <p className="text-base font-bold text-slate-900">VJI DATA HUB </p>
                <p className="text-xs text-slate-500">Secure access</p>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15 flex-shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Welcome back</h2>
              </div>
              <div>
                <p className="text-sm leading-6 text-slate-600">Sign in to continue into your workspace.</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 flex gap-3">
                <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={18} />
                <p className="text-sm font-medium text-rose-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-200"
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <Link to="/reset-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Reset password
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 pr-12 text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-200"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                  Create one
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs font-medium text-slate-500">
              Protected by enterprise-grade security.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}