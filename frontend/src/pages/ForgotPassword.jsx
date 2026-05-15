import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { auth } from '../services/api';
import { 
  KeyRound, Mail, Loader2, ArrowLeft, ShieldCheck, 
  CheckCircle, Wallet, Activity, ChevronRight, XCircle
} from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

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

  const fetchResetStatus = async (emailToFetch) => {
    try {
      const res = await auth.getPasswordResetStatus(emailToFetch);
      if (res.success) {
        setAttemptsRemaining(res.attemptsRemaining);
        if (res.cooldownSeconds > 0) {
          setTimer(res.cooldownSeconds);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reset status:', err);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    if (timer > 0 && attemptsRemaining === 0) return;

    setLoading(true);
    try {
      const res = await auth.forgotPassword(email);
      if (res.success) {
        setSubmitted(true);
        toast.success('Reset link sent! Please check your email.');
        if (res.attemptsRemaining !== undefined) setAttemptsRemaining(res.attemptsRemaining);
        if (res.cooldownSeconds) setTimer(res.cooldownSeconds);
      } else {
        toast.error(res.message || 'Failed to send reset link');
        if (res.attemptsRemaining !== undefined) setAttemptsRemaining(res.attemptsRemaining);
        if (res.cooldownSeconds) setTimer(res.cooldownSeconds);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send reset link');
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.attemptsRemaining !== undefined) setAttemptsRemaining(errorData.attemptsRemaining);
        if (errorData.cooldownSeconds) setTimer(errorData.cooldownSeconds);
      }
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

        .login-title {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
        }
        .login-subtitle {
          font-size: 13px;
          color: #777;
          margin: 12px 0 24px;
          line-height: 1.5;
        }

        .login-icon-box {
          width: 64px;
          height: 64px;
          background: #fafaf7;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: #111;
        }

        .login-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #333;
          margin-bottom: 7px;
          letter-spacing: 0.02em;
          text-align: left;
        }
        .login-input {
          width: 100%;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          background: #fafaf7;
          padding: 11px 14px;
          padding-left: 40px;
          font-size: 14px;
          font-family: inherit;
          color: #111;
          outline: none;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: #111;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
        }

        .login-field { margin-bottom: 16px; position: relative; }
        .login-field-icon {
          position: absolute;
          left: 14px;
          top: 36px;
          color: #aaa;
          pointer-events: none;
        }

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

        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
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
            Account Recovery
          </div>
          <h1>Regain access to your workspace securely.</h1>
          <p className="login-left-sub">
            Lost your password? No worries. We'll send a secure link to your email to help you reset it and get back to work.
          </p>
          <div className="login-feature-list">
            {[
              { icon: KeyRound, title: 'Secure Reset', desc: 'Password reset links are unique and time-bound for your safety.' },
              { icon: ShieldCheck, title: 'Verified Identity', desc: 'We only send reset links to registered and confirmed emails.' },
              { icon: Activity, title: 'Quick Recovery', desc: 'Get back into your account in just a few clicks.' },
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
        </section>

        {/* ── RIGHT PANEL ── */}
        <section className="login-right">
          <div className="login-form-wrap">
            {!submitted ? (
              <>
                <div className="login-icon-box">
                  <KeyRound size={32} />
                </div>
                <h2 className="login-title">Forgot Password?</h2>
                <p className="login-subtitle">Enter your email and we'll send you a recovery link.</p>

                {attemptsRemaining < 3 && (
                  <div style={{
                    background: attemptsRemaining === 0 ? '#fee2e2' : '#fef3c7',
                    border: `1.5px solid ${attemptsRemaining === 0 ? '#ef4444' : '#f59e0b'}`,
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    color: attemptsRemaining === 0 ? '#991b1b' : '#92400e',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '4px' }}>
                      {attemptsRemaining === 0 ? <XCircle size={18} /> : <ShieldCheck size={18} />}
                      {attemptsRemaining === 0 ? 'Reset Requests Locked' : 'Reset Attempts'}
                    </div>
                    <div>
                      {attemptsRemaining === 0 
                        ? 'You have exhausted all password reset attempts. For security reasons, this feature is locked for 24 hours.'
                        : `You have ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining before a 24-hour lockout.`}
                    </div>
                    {timer > 0 && (
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '8px 12px', 
                        background: attemptsRemaining === 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                        borderRadius: '6px',
                        fontWeight: '600',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>{attemptsRemaining === 0 ? 'Restoration starts in:' : 'Reset available in:'}</span>
                        <code style={{ 
                          background: attemptsRemaining === 0 ? '#ef4444' : '#f59e0b', 
                          color: '#fff', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          {formatCountdown(timer)}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="login-field">
                    <label htmlFor="email" className="login-label">Email Address</label>
                    <Mail size={18} className="login-field-icon" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => email && fetchResetStatus(email)}
                      className="login-input"
                      placeholder="name@example.com"
                      disabled={loading || (attemptsRemaining === 0 && timer > 0)}
                      required
                    />
                  </div>

                  <button type="submit" disabled={loading || (attemptsRemaining === 0 && timer > 0)} className="login-submit">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                    {loading 
                      ? 'Sending link...' 
                      : (attemptsRemaining === 0 && timer > 0)
                        ? `Locked: ${formatCountdown(timer)}`
                        : 'Send Reset Link'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="login-icon-box" style={{ borderColor: '#059669', color: '#059669', background: '#ecfdf5' }}>
                  <CheckCircle size={32} />
                </div>
                <h2 className="login-title" style={{ color: '#059669' }}>Check Your Email</h2>
                <p className="login-subtitle">
                  We've sent a recovery link to <strong style={{ color: '#111' }}>{email}</strong>.
                  Please check your inbox and spam folder.
                </p>

                {attemptsRemaining < 3 && (
                  <div style={{
                    background: attemptsRemaining === 0 ? '#fee2e2' : '#fef3c7',
                    border: `1.5px solid ${attemptsRemaining === 0 ? '#ef4444' : '#f59e0b'}`,
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    color: attemptsRemaining === 0 ? '#991b1b' : '#92400e',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '4px' }}>
                      {attemptsRemaining === 0 ? <XCircle size={18} /> : <ShieldCheck size={18} />}
                      {attemptsRemaining === 0 ? 'Reset Requests Locked' : 'Reset Attempts'}
                    </div>
                    <div>
                      {attemptsRemaining === 0 
                        ? 'You have exhausted all password reset attempts. For security reasons, this feature is locked for 24 hours.'
                        : `You have ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining before a 24-hour lockout.`}
                    </div>
                    {timer > 0 && (
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '8px 12px', 
                        background: attemptsRemaining === 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                        borderRadius: '6px',
                        fontWeight: '600',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>{attemptsRemaining === 0 ? 'Restoration starts in:' : 'Reset available in:'}</span>
                        <code style={{ 
                          background: attemptsRemaining === 0 ? '#ef4444' : '#f59e0b', 
                          color: '#fff', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          {formatCountdown(timer)}
                        </code>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={() => handleSubmit()}
                  disabled={loading || (attemptsRemaining === 0 && timer > 0)}
                  className="login-submit"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Resend Email'}
                </button>
              </>
            )}

            <div className="login-footer-box">
              <p>
                Remembered? <Link to="/login">Sign In</Link>
              </p>
            </div>
            
            <Link to="/login" className="login-back-link" style={{ marginTop: 24, justifyContent: 'center', color: '#666' }}>
              <ArrowLeft size={15} />
              Back to Login
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
