import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import { AlertCircle, Eye, EyeOff, UserPlus, Store, Lock, ArrowLeft, ShieldCheck, ChevronRight, Wallet, Activity } from 'lucide-react';
import { publicAPI } from '../services/api';
import { validatePhoneNumber } from '../utils/phoneValidation';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('buyer'); // 'buyer' or 'agent'
  const [recruitNewAgents, setRecruitNewAgents] = useState(true);
  const { register } = useAuth();
  const { refreshSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
    }
    fetchSettings();
  }, [location]);

  const fetchSettings = async () => {
    try {
      const response = await publicAPI.getSystemSettings();
      if (response?.settings) {
        setRecruitNewAgents(response.settings.recruitNewAgents !== false);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPhoneError('');
    setLoading(true);

    try {
      if (!name || !email || !password || !confirmPassword || !phone) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // Validate phone number
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error);
        toast.error(phoneValidation.error, { duration: 5000 });
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      const data = await register(email, password, name, phoneValidation.formatted, referralCode, userType === 'agent' ? 'agent' : 'user');
      // Refresh global settings immediately after registration to ensure synced state
      await refreshSettings();

      toast.success('Account created successfully!', { duration: 3000 });

      if (data.user.role === 'admin') {
        navigate('/admin');
      } else if (data.user.role === 'agent') {
        navigate('/agent/store');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-900 p-10 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_30%)]" />
          <div className="relative space-y-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white transition-colors">
              <ArrowLeft size={16} />
              Back to homepage
            </Link>

            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-100 backdrop-blur-sm">
                <ShieldCheck size={14} className="text-cyan-300" />
                Create a buyer or agent workspace
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">VJI DATA HUB  Onboarding</p>
                <h1 className="mt-4 text-4xl font-black leading-tight text-white">
                  Start selling, tracking and managing data operations with one account.
                </h1>
              </div>
              <p className="max-w-xl text-base leading-7 text-slate-300">
                Register once and move directly into your dashboard, buyer workspace, or agent storefront setup depending on your account type.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                { icon: Wallet, title: 'Wallet ready', desc: 'Manage balances, top-ups and purchase activity in one view.' },
                { icon: Activity, title: 'Operational visibility', desc: 'Monitor orders, delivery flow and customer history clearly.' },
                { icon: Store, title: 'Agent-ready storefront', desc: 'Eligible agents can proceed into store setup immediately after signup.' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
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

          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Account access</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Buyer accounts go to the dashboard. Agent accounts proceed to store setup when recruitment is enabled.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-xl">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                <ArrowLeft size={16} />
                Home
              </Link>
              <div className="text-right">
                <p className="text-base font-bold text-slate-900">VJI DATA HUB </p>
                <p className="text-xs text-slate-500">Create account</p>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15 flex-shrink-0">
                  <UserPlus size={24} />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Create account</h2>
              </div>
              <div>
                <p className="text-sm leading-6 text-slate-600">Choose your role, fill in your details, and get started.</p>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setUserType('buyer')}
                className={`rounded-2xl border px-4 py-4 text-left transition-all ${userType === 'buyer'
                  ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <UserPlus size={18} />
                  <span className="text-sm font-bold">Buyer</span>
                </div>
                <p className={`mt-2 text-xs leading-5 ${userType === 'buyer' ? 'text-slate-200' : 'text-slate-500'}`}>
                  Purchase bundles and manage your account from the main dashboard.
                </p>
              </button>

              <button
                onClick={() => recruitNewAgents && setUserType('agent')}
                disabled={!recruitNewAgents}
                className={`rounded-2xl border px-4 py-4 text-left transition-all ${userType === 'agent'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                  } ${!recruitNewAgents ? 'cursor-not-allowed opacity-55' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {recruitNewAgents ? <Store size={18} /> : <Lock size={18} />}
                  <span className="text-sm font-bold">Agent</span>
                </div>
                <p className={`mt-2 text-xs leading-5 ${userType === 'agent' ? 'text-blue-50' : 'text-slate-500'}`}>
                  Create a public storefront and manage customer orders professionally.
                </p>
              </button>
            </div>

            {userType === 'agent' && recruitNewAgents && (
              <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm font-medium text-blue-700">
                  Agents can create their own data store, manage inventory, and earn commissions from sales.
                </p>
              </div>
            )}

            {!recruitNewAgents && userType === 'agent' && (
              <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-600">
                  Agent registration is currently closed by the platform administration. Please check back later or register as a buyer.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 flex gap-3">
                <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={18} />
                <p className="text-sm font-medium text-rose-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-200"
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>

                <div className="sm:col-span-2">
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

                <div className="sm:col-span-2">
                  <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-slate-700">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 10) {
                        setPhone(value);
                      }
                      setPhoneError(''); // Clear error on change
                    }}
                    onBlur={() => {
                      if (phone) {
                        const validation = validatePhoneNumber(phone);
                        if (!validation.isValid) {
                          setPhoneError(validation.error);
                        }
                      }
                    }}
                    className={`w-full rounded-2xl border-2 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:ring-4 ${
                      phoneError
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                        : 'border-slate-300 focus:border-slate-900 focus:ring-slate-200'
                    }`}
                    placeholder="e.g. 0244123456"
                    disabled={loading}
                  />
                  {phoneError && (
                    <p className="text-xs text-red-500 font-semibold mt-1.5 ml-1">{phoneError}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
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

                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 pr-12 text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-200"
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                      disabled={loading}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="referralCode" className="mb-2 block text-sm font-semibold text-slate-700">
                    Referral Code (Optional)
                  </label>
                  <div className="relative">
                    <input
                      id="referralCode"
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 pr-12 text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-200"
                      placeholder="e.g. REF12345"
                      disabled={loading}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <UserPlus size={20} />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
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
                        Creating account...
                      </>
                    ) : userType === 'agent' && !recruitNewAgents ? (
                      'Registration Closed'
                    ) : (
                      <>
                        Create Account
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                  Sign in
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