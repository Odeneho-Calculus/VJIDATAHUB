import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { auth } from '../services/api';
import {
  KeyRound, Lock, Loader2, ArrowLeft, ShieldCheck,
  CheckCircle, Wallet, Activity, ChevronRight, Eye, EyeOff, XCircle
} from 'lucide-react';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  const params = new URLSearchParams(location.search);
  const token = params.get('token');

  const fetchResetStatus = useCallback(async () => {
    try {
      const res = await auth.getPasswordResetStatus({ token });
      if (res.success) {
        setAttemptsRemaining(res.attemptsRemaining);
        if (res.cooldownSeconds > 0) {
          setTimer(res.cooldownSeconds);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reset status:', err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchResetStatus();
    }
  }, [token, fetchResetStatus]);

  // Handle countdown timer
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timer]);

  const formatCountdown = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score; // 0-4
  }, [password]);

  const strengthLevels = [
    { label: 'Too Weak', color: '#dc2626' },
    { label: 'Getting There', color: '#f97316' },
    { label: 'Secure', color: '#f59e0b' },
    { label: 'Strong', color: '#10b981' },
    { label: 'Elite', color: '#2563eb' }
  ];

  const handleReset = async (e) => {
    e.preventDefault();

    if (!password || password.length < 8) {
      toast.error('Use at least 8 characters with a mix of letters, numbers, and symbols.');
      return;
    }

    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    if (timer > 0 && attemptsRemaining === 0) return;

    setLoading(true);
    try {
      const res = await auth.resetPassword({ token, password });
      if (res.success) {
        toast.success('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(res.message || 'Failed to reset password');
        // Re-fetch status if failed due to lockout
        fetchResetStatus();
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to reset password');
      if (err.response?.status === 429) {
        fetchResetStatus();
      }
    } finally {
      setLoading(false);
    }
  };

  const level = strengthLevels[strength];
  const locked = attemptsRemaining === 0 && timer > 0;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", minHeight: '100vh', background: 'linear-gradient(135deg, #e0e7ff 0%, #fce7f3 40%, #fef3c7 70%, #dbeafe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
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
          background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #7c3aed 100%);
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
          color: #c4b5fd;
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
          background: #a78bfa;
          color: #2e1065;
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
          color: #ddd6fe;
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
          background: rgba(167,139,250,0.20);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #c4b5fd;
        }
        .login-feature-title {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 3px;
        }
        .login-feature-desc {
          font-size: 12px;
          color: #c4b5fd;
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
          color: #c4b5fd;
          margin: 0 0 6px;
        }
        .login-left-footer p:last-child {
          font-size: 12.5px;
          color: #ddd6fe;
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
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #fff;
        }
        .login-title {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
        }
        .login-subtitle {
          font-size: 13px;
          color: #4b5563;
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
          border-color: #7c3aed;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.12);
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

        /* Submit btn */
        .login-submit {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(90deg, #2563eb 0%, #7c3aed 100%);
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          padding: 13px 20px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
          margin-top: 4px;
        }
        .login-submit:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
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
          color: #374151;
          margin: 0;
        }
        .login-footer-box a {
          font-weight: 700;
          color: #111;
          text-decoration: none;
        }
        .login-footer-box a:hover { color: #7c3aed; }

        .login-secure-note {
          text-align: center;
          font-size: 11.5px;
          font-weight: 600;
          color: #9ca3af;
          margin-top: 14px;
          letter-spacing: 0.03em;
        }

        /* Reset-specific */
        .reset-alert {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 20px;
          font-size: 13px;
          text-align: left;
        }
        .reset-alert.locked { background: #fee2e2; border: 1.5px solid #ef4444; color: #991b1b; }
        .reset-alert.warning { background: #fef3c7; border: 1.5px solid #f59e0b; color: #92400e; }
        .reset-alert-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
        }
        .reset-alert-countdown {
          margin-top: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .reset-alert-countdown.locked { background: rgba(239, 68, 68, 0.1); }
        .reset-alert-countdown.warning { background: rgba(245, 158, 11, 0.1); }
        .reset-alert-countdown code {
          color: #fff;
          padding: 2px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
        }

        .strength-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .strength-label {
          font-size: 12px;
          font-weight: 700;
          color: #444;
        }
        .strength-value {
          font-size: 12px;
          font-weight: 800;
        }
        .strength-track {
          height: 6px;
          background: #fafaf7;
          border: 1px solid #e4e4de;
          border-radius: 10px;
          overflow: hidden;
        }
        .strength-fill {
          height: 100%;
          transition: width 0.4s ease;
        }
        .strength-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
        }
        .strength-badge {
          padding: 4px 10px;
          border-radius: 100px;
          border: 1px solid #e4e4de;
          font-size: 11px;
          font-weight: 700;
          color: #888;
          background: #fafaf7;
          transition: all 0.2s;
        }
        .strength-badge.active {
          background: #ecfdf5;
          border-color: #10b981;
          color: #059669;
        }
      `}</style>

      <div className="login-wrap">
        {/* ── LEFT PANEL ── */}
        <section className="login-left">
          <div className="login-left-noise" />

          <Link to="/login" className="login-back-link">
            <ArrowLeft size={15} />
            Back to login
          </Link>

          <div className="login-left-tag">
            <ShieldCheck style={{ width: 11, height: 11 }} />
            Security Shield
          </div>

          <h1>Create a strong password</h1>
          <p className="login-left-sub">
            A strong password keeps your account safe. Use the strength meter to guide you.
          </p>

          <div className="login-feature-list">
            {[
              { icon: Lock, title: 'Encrypted Storage', desc: 'Your password is always encrypted. No one can read it.' },
              { icon: ShieldCheck, title: 'Single-Use Links', desc: 'Reset links work once and expire in one hour.' },
              { icon: Activity, title: 'Activity Log', desc: 'We keep a record of password changes for your safety.' },
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
            <p>Need help?</p>
            <p>If you did not request a reset, ignore this link or contact support.</p>
          </div>
        </section>

        {/* ── RIGHT PANEL ── */}
        <section className="login-right">
          <div className="login-form-wrap">

            {/* Mobile top bar */}
            <div className="login-mobile-top">
              <Link to="/login" className="login-mobile-back">
                <ArrowLeft size={15} />
                Login
              </Link>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: 0 }}>VJI DATA HUB</p>
                <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Secure access</p>
              </div>
            </div>

            {!token ? (
              <>
                <div className="login-heading-row">
                  <div className="login-icon-box" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' }}>
                    <XCircle style={{ width: 22, height: 22 }} />
                  </div>
                  <h2 className="login-title">Invalid Link</h2>
                </div>
                <p className="login-subtitle">
                  We couldn't find a valid reset token. Please request a new link from the login page.
                </p>
                <Link to="/forgot-password" className="login-submit">
                  Request New Link
                  <ChevronRight size={16} />
                </Link>
              </>
            ) : (
              <>
                <div className="login-heading-row">
                  <div className="login-icon-box">
                    <KeyRound style={{ width: 22, height: 22 }} />
                  </div>
                  <h2 className="login-title">Reset Password</h2>
                </div>
                <p className="login-subtitle">Create a new, strong password for your account.</p>

                {attemptsRemaining < 3 && (
                  <div className={`reset-alert ${attemptsRemaining === 0 ? 'locked' : 'warning'}`}>
                    <div className="reset-alert-title">
                      {attemptsRemaining === 0 ? <XCircle size={18} /> : <ShieldCheck size={18} />}
                      {attemptsRemaining === 0 ? 'Account Recovery Locked' : 'Recovery Attempts'}
                    </div>
                    <div>
                      {attemptsRemaining === 0
                        ? 'You have exhausted all password reset attempts. For security reasons, your account recovery is locked for 24 hours.'
                        : `You have ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining before a 24-hour lockout.`}
                    </div>
                    {timer > 0 && (
                      <div className={`reset-alert-countdown ${attemptsRemaining === 0 ? 'locked' : 'warning'}`}>
                        <span>{attemptsRemaining === 0 ? 'Restoration starts in:' : 'Reset available in:'}</span>
                        <code style={{ background: attemptsRemaining === 0 ? '#ef4444' : '#f59e0b' }}>
                          {formatCountdown(timer)}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleReset}>
                  <div className="login-field">
                    <label htmlFor="password" className="login-label">New Password</label>
                    <div className="login-pw-wrap">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input"
                        style={{ paddingRight: 44 }}
                        placeholder="At least 8 characters"
                        disabled={loading || locked}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="login-pw-toggle"
                        disabled={loading || locked}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="login-field">
                    <label htmlFor="confirm" className="login-label">Confirm Password</label>
                    <div className="login-pw-wrap">
                      <input
                        id="confirm"
                        type={showPassword ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="login-input"
                        style={{ paddingRight: 44 }}
                        placeholder="Repeat new password"
                        disabled={loading || locked}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="login-pw-toggle"
                        disabled={loading || locked}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div className="strength-row">
                      <span className="strength-label">Password Strength</span>
                      <span className="strength-value" style={{ color: level.color }}>{level.label}</span>
                    </div>
                    <div className="strength-track">
                      <div className="strength-fill" style={{ width: `${(strength / 4) * 100}%`, background: level.color }} />
                    </div>
                    <div className="strength-badges">
                      <Badge active={password.length >= 8}>8+ chars</Badge>
                      <Badge active={/[A-Z]/.test(password) && /[a-z]/.test(password)}>Mix Case</Badge>
                      <Badge active={/\d/.test(password)}>Number</Badge>
                      <Badge active={/[^A-Za-z0-9]/.test(password)}>Symbol</Badge>
                    </div>
                  </div>

                  <button type="submit" disabled={loading || locked} className="login-submit">
                    {loading ? (
                      <>
                        <span className="login-spinner" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        {locked ? `Locked: ${formatCountdown(timer)}` : 'Reset Password Securely'}
                        {!locked && <ChevronRight size={16} />}
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            <div className="login-footer-box" style={{ textAlign: 'center' }}>
              <p>
                Remember your password? <Link to="/login">Sign in</Link>
              </p>
            </div>

            <p className="login-secure-note">Protected by enterprise-grade security.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Badge({ active, children }) {
  return (
    <span className={`strength-badge ${active ? 'active' : ''}`}>
      {children}
    </span>
  );
}
