import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../services/api';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const params = new URLSearchParams(location.search);
  const token = params.get('token');

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score; // 0-4
  }, [password]);

  const strengthLevels = [
    { label: 'Too Weak', color: 'bg-red-500', ring: 'ring-red-100' },
    { label: 'Getting There', color: 'bg-orange-500', ring: 'ring-orange-100' },
    { label: 'Secure', color: 'bg-amber-500', ring: 'ring-amber-100' },
    { label: 'Strong', color: 'bg-emerald-500', ring: 'ring-emerald-100' },
    { label: 'Elite', color: 'bg-blue-600', ring: 'ring-blue-100' }
  ];

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password || password.length < 8) {
      setError('Use at least 8 characters with a mix of letters, numbers, and symbols.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await auth.resetPassword({ token, password });
      if (res.success) {
        setSuccess('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(res.message || 'Failed to reset password');
      }
    } catch (err) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-slate-50 to-white px-4">
        <div className="max-w-xl w-full p-8 bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">!</div>
            <h2 className="text-xl font-bold text-slate-800">Invalid Reset Link</h2>
          </div>
          <p className="text-slate-600">
            We couldn’t find a reset token. Request a new password reset link from the login page.
          </p>
        </div>
      </main>
    );
  }

  const level = strengthLevels[strength];

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-white relative overflow-hidden px-4 py-10">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-16 h-72 w-72 bg-sky-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-10 right-0 h-64 w-64 bg-blue-100 rounded-full blur-3xl opacity-70" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 bg-emerald-100 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 relative">
        <section className="p-8 bg-white/80 backdrop-blur border border-slate-200 rounded-3xl shadow-xl shadow-sky-100/70">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-sm font-semibold mb-4">
            <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            Secure Reset
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Reset Your Password</h1>
              <p className="text-slate-600 mt-2 max-w-xl">
                Create a fresh, high-entropy password to keep your account locked down. We’ll verify and redirect you once it’s set.
              </p>
            </div>
          </div>

          <form onSubmit={handleReset} className="mt-6 space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">New Password</label>
              <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${level?.ring || 'ring-slate-100'} shadow-sm bg-white focus-within:ring-2 focus-within:ring-sky-200 transition`}> 
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 outline-none text-slate-900 placeholder:text-slate-400"
                  placeholder="At least 8 characters, mix it up"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-sm font-semibold text-sky-700 hover:text-sky-900"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Confirm Password</label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border ring-1 ring-slate-100 shadow-sm bg-white focus-within:ring-2 focus-within:ring-sky-200 transition">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="flex-1 outline-none text-slate-900 placeholder:text-slate-400"
                  placeholder="Re-enter your new password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Password Strength</span>
                <span className="text-slate-500">{level?.label || 'Start typing'}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`${level?.color || 'bg-slate-300'} h-full transition-all duration-500`}
                  style={{ width: `${(strength / 4) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <Badge active={password.length >= 8}>8+ characters</Badge>
                <Badge active={/[A-Z]/.test(password) && /[a-z]/.test(password)}>Upper & lower</Badge>
                <Badge active={/\d/.test(password)}>Number</Badge>
                <Badge active={/[^A-Za-z0-9]/.test(password)}>Symbol</Badge>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-sky-200/60 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting...' : 'Reset Password Securely'}
            </button>
          </form>

          <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm text-slate-600">
            <Tip title="Use a passphrase" description="Combine random words or a sentence you’ll remember." />
            <Tip title="Unique passwords" description="Avoid reusing passwords across different sites." />
            <Tip title="Add variety" description="Mix upper, lower, numbers, and symbols." />
            <Tip title="Keep it private" description="Never share your reset links or codes." />
          </div>
        </section>

        <aside className="hidden lg:block p-8 bg-white/70 backdrop-blur border border-slate-200 rounded-3xl shadow-lg shadow-blue-50/70">
          <div className="h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Protection
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Security, front and center.</h3>
              <p className="text-slate-600">
                Your reset link is single-use and time-bound. We validate the token server-side and notify you of any unexpected activity.
              </p>
            </div>

            <ul className="mt-6 space-y-3 text-slate-700 text-sm">
              <li className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-semibold">1</span>
                <div>
                  <p className="font-semibold text-slate-900">Validate token</p>
                  <p className="text-slate-600">We confirm the reset link belongs to your account.</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">2</span>
                <div>
                  <p className="font-semibold text-slate-900">Set new password</p>
                  <p className="text-slate-600">Use a strong mix to keep intruders out.</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">3</span>
                <div>
                  <p className="font-semibold text-slate-900">Instant redirect</p>
                  <p className="text-slate-600">We sign you in to finish the flow securely.</p>
                </div>
              </li>
            </ul>

            <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 border border-slate-200 text-sm text-slate-700">
              <p className="font-semibold text-slate-900 mb-1">Need help?</p>
              <p>Reach out to support if you didn’t request this reset or spot unusual activity.</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Badge({ active, children }) {
  return (
    <span
      className={`px-3 py-1 rounded-full border text-xs font-semibold transition ${
        active
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-slate-50 border-slate-200 text-slate-500'
      }`}
    >
      {children}
    </span>
  );
}

function Tip({ title, description }) {
  return (
    <div className="p-3 rounded-2xl border border-slate-200 bg-white/60 shadow-sm">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="text-slate-600 text-sm mt-1">{description}</p>
    </div>
  );
}
