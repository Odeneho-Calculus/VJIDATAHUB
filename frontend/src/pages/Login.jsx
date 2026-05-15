import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
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
      await refreshSettings();

      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.isEmailVerified === false) {
        toast.error('Email verification required. We are redirecting you to the verification page to activate your account.', {
          duration: 6000,
          className: 'rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium px-6 py-3 shadow-xl shadow-amber-200/50',
          iconTheme: {
            primary: '#d97706',
            secondary: '#fff',
          },
        });
        navigate(`/verify-email?email=${err.email || email}`);
        return;
      }
      const msg = err.message || 'Login failed';
      setError(msg);
      toast.error(msg, {
        duration: 5000,
        className: 'rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-medium px-6 py-3 shadow-xl shadow-rose-200/50',
        iconTheme: {
          primary: '#be123c',
          secondary: '#fff',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500&display=swap');

        .login-wrap {
          width: 100%;
          max-width: 960px;
          display: grid;
          grid-template-columns: 1fr;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
        }
        @media (min-width: 1024px) {
          .login-wrap { grid-template-columns: 1.05fr 0.95fr; min-height: 620px; }
        }

        /* LEFT PANEL */
        .login-left {
          display: none;
          flex-direction: column;
          background: #111;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .login-left { display: flex; }
        }
        .login-left-noise {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
        }
        .login-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #888;
          text-decoration: none;
          transition: color 0.15s;
          position: relative;
          z-index: 1;
          margin-bottom: 32px;
        }
        .login-back-link:hover { color: #fff; }

        .login-left-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f0a500;
          color: #111;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          width: fit-content;
          position: relative;
          z-index: 1;
        }
        .login-left h1 {
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 800;
          color: #fff;
          line-height: 1.25;
          margin: 0 0 12px;
          position: relative;
          z-index: 1;
        }
        .login-left-sub {
          font-size: 13px;
          color: #999;
          line-height: 1.65;
          margin: 0 0 28px;
          position: relative;
          z-index: 1;
        }

        .login-feature-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          z-index: 1;
          flex: 1;
        }
        .login-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 14px;
          background: rgba(255,255,255,0.04);
        }
        .login-feature-icon {
          width: 36px;
          height: 36px;
          background: rgba(240,165,0,0.15);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #f0a500;
        }
        .login-feature-title {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 3px;
        }
        .login-feature-desc {
          font-size: 12px;
          color: #888;
          line-height: 1.5;
          margin: 0;
        }

        .login-left-footer {
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.04);
          margin-top: 20px;
          position: relative;
          z-index: 1;
        }
        .login-left-footer p:first-child {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #f0a500;
          margin: 0 0 6px;
        }
        .login-left-footer p:last-child {
          font-size: 12.5px;
          color: #888;
          line-height: 1.55;
          margin: 0;
        }

        /* RIGHT PANEL */
        .login-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 36px 28px;
          background: #fff;
        }
        @media (min-width: 640px) {
          .login-right { padding: 40px 40px; }
        }
        .login-form-wrap {
          width: 100%;
          max-width: 380px;
        }

        /* Mobile top bar */
        .login-mobile-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        @media (min-width: 1024px) {
          .login-mobile-top { display: none; }
        }
        .login-mobile-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #555;
          text-decoration: none;
          transition: color 0.15s;
        }
        .login-mobile-back:hover { color: #111; }

        /* Form heading */
        .login-heading-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 6px;
        }
        .login-icon-box {
          width: 46px;
          height: 46px;
          background: #111;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #f0a500;
        }
        .login-title {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
        }
        .login-subtitle {
          font-size: 13px;
          color: #777;
          margin: 0 0 24px;
          line-height: 1.5;
        }

        /* Inputs */
        .login-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #333;
          margin-bottom: 7px;
          letter-spacing: 0.02em;
        }
        .login-input {
          width: 100%;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          background: #fafaf7;
          padding: 11px 14px;
          font-size: 14px;
          font-family: inherit;
          color: #111;
          outline: none;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .login-input::placeholder { color: #bbb; }
        .login-input:focus {
          border-color: #111;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
        }
        .login-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .login-pw-wrap { position: relative; }
        .login-pw-toggle {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: #aaa;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }
        .login-pw-toggle:hover { color: #555; }
        .login-pw-toggle:disabled { opacity: 0.4; cursor: not-allowed; }

        .login-field { margin-bottom: 16px; }
        .login-field-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 7px;
        }
        .login-forgot {
          font-size: 12px;
          font-weight: 600;
          color: #f0a500;
          text-decoration: none;
          transition: color 0.15s;
        }
        .login-forgot:hover { color: #d49200; }

        /* Submit btn */
        .login-submit {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #111;
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          padding: 13px 20px;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          transition: background 0.15s;
          margin-top: 4px;
        }
        .login-submit:hover:not(:disabled) { background: #222; }
        .login-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        /* Spinner */
        @keyframes login-spin { to { transform: rotate(360deg); } }
        .login-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: login-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        /* Error */
        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #fff5f5;
          border: 1.5px solid #fecaca;
          border-radius: 7px;
          padding: 11px 13px;
          font-size: 13px;
          color: #b91c1c;
          margin-bottom: 16px;
        }

        /* Footer box */
        .login-footer-box {
          border: 1.5px solid #e4e4de;
          border-radius: 7px;
          background: #fafaf7;
          padding: 13px 16px;
          margin-top: 16px;
        }
        .login-footer-box p {
          font-size: 13px;
          color: #666;
          margin: 0;
        }
        .login-footer-box a {
          font-weight: 700;
          color: #111;
          text-decoration: none;
        }
        .login-footer-box a:hover { color: #f0a500; }

        .login-secure-note {
          text-align: center;
          font-size: 11.5px;
          font-weight: 600;
          color: #bbb;
          margin-top: 14px;
          letter-spacing: 0.03em;
        }
      `}</style>

      <div className="login-wrap">

        {/* ── LEFT PANEL ── */}
        <section className="login-left">
          <div className="login-left-noise" />

          <Link to="/" className="login-back-link">
            <ArrowLeft size={15} />
            Back to homepage
          </Link>

          <div className="login-left-tag">
            <ShieldCheck style={{ width: 11, height: 11 }} />
            Secure Agent Access
          </div>

          <h1>Sign in to manage orders, wallets and storefront activity.</h1>
          <p className="login-left-sub">
            Access your dashboard with a workflow built for data operations, commissions, and performance visibility.
          </p>

          <div className="login-feature-list">
            {[
              { icon: Wallet, title: 'Wallet Visibility', desc: 'Track balances and funding activity from one place.' },
              { icon: Activity, title: 'Order Monitoring', desc: 'Review status changes and delivery outcomes in real time.' },
              { icon: ShieldCheck, title: 'Protected Access', desc: 'Secure authentication with role-based redirection after login.' },
            ].map((item) => (
              <div key={item.title} className="login-feature-item">
                <div className="login-feature-icon">
                  <item.icon style={{ width: 17, height: 17 }} />
                </div>
                <div>
                  <p className="login-feature-title">{item.title}</p>
                  <p className="login-feature-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="login-left-footer">
            <p>Why sign in</p>
            <p>Move directly into your dashboard and continue working without extra steps.</p>
          </div>
        </section>

        {/* ── RIGHT PANEL ── */}
        <section className="login-right">
          <div className="login-form-wrap">

            {/* Mobile top bar */}
            <div className="login-mobile-top">
              <Link to="/" className="login-mobile-back">
                <ArrowLeft size={15} />
                Home
              </Link>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: 0 }}>VJI DATA HUB</p>
                <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Secure access</p>
              </div>
            </div>

            {/* Heading */}
            <div className="login-heading-row">
              <div className="login-icon-box">
                <ShieldCheck style={{ width: 22, height: 22 }} />
              </div>
              <h2 className="login-title">Welcome back</h2>
            </div>
            <p className="login-subtitle">Sign in to continue into your workspace.</p>

            {/* Error */}
            {error && (
              <div className="login-error">
                <AlertCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="login-field">
                <label htmlFor="email" className="login-label">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div className="login-field">
                <div className="login-field-row">
                  <label htmlFor="password" className="login-label" style={{ margin: 0 }}>Password</label>
                  <Link to="/forgot-password" className="login-forgot">Reset password</Link>
                </div>
                <div className="login-pw-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                    style={{ paddingRight: 44 }}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-pw-toggle"
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} className="login-submit">
                {loading ? (
                  <>
                    <span className="login-spinner" />
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

            {/* Register link */}
            <div className="login-footer-box">
              <p>
                Don't have an account?{' '}
                <Link to="/register">Create one</Link>
              </p>
            </div>

            <p className="login-secure-note">Protected by enterprise-grade security.</p>
          </div>
        </section>

      </div>
    </div>
  );
}