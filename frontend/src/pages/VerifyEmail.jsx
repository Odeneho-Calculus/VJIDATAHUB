import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { auth } from '../services/api';
import { 
  Mail, CheckCircle, XCircle, Loader2, ArrowLeft, RefreshCw, 
  ShieldCheck, Wallet, Activity, ChevronRight 
} from 'lucide-react';

export default function VerifyEmail() {
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState('pending'); // pending, success, error
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60); // 60 seconds cooldown
  const [canResend, setCanResend] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [cooldownHours, setCooldownHours] = useState(0);
  const hasAutoSent = useRef(false);
  const timerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const email = params.get('email');

  useEffect(() => {
    if (token) {
      handleVerify();
    } else if (email) {
      fetchVerificationStatus();
    }
  }, [token, email]);

  const fetchVerificationStatus = async () => {
    try {
      const res = await auth.getVerificationStatus(email);
      if (res.success) {
        setAttemptsRemaining(res.attemptsRemaining);
        if (res.cooldownSeconds > 0) {
          setTimer(res.cooldownSeconds);
          setCooldownHours(Math.ceil(res.cooldownSeconds / 3600));
        }
        if (res.isEmailVerified) {
          setStatus('success');
          setMessage('Email is already verified.');
        }
      }
    } catch (err) {
      console.error('Failed to fetch verification status:', err);
    }
  };

  // Handle countdown timer
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (timer > 0) {
      setCanResend(false);
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCanResend(true);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timer]);

  const formatCountdown = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const handleVerify = async () => {
    setVerifying(true);
    setStatus('pending');
    try {
      const res = await auth.verifyEmail(token);
      if (res.success) {
        setStatus('success');
        setMessage(res.message);
        toast.success(res.message);
      } else {
        setStatus('error');
        setMessage(res.message || 'Verification failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong during verification');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async (isAuto = false) => {
    if (!email) {
      if (!isAuto) toast.error('No email found to resend verification.');
      return;
    }

    if (!isAuto && !canResend) return;

    setResending(true);
    try {
      const res = await auth.resendVerification(email);
      if (res.success) {
        if (!isAuto) {
          toast.success('Verification email resent! Please check your inbox.');
        } else {
          console.log('Auto-verification email sent');
        }
        
        if (res.cooldownSeconds) {
          setTimer(res.cooldownSeconds);
          setCooldownHours(Math.ceil(res.cooldownSeconds / 3600));
        } else {
          setTimer(60); // Default 1 min cooldown between successful resends if not locked
        }
        
        if (res.attemptsRemaining !== undefined) {
          setAttemptsRemaining(res.attemptsRemaining);
        }
      } else {
        if (!isAuto) toast.error(res.message || 'Failed to resend verification email');
        if (res.attemptsRemaining !== undefined) {
          setAttemptsRemaining(res.attemptsRemaining);
        }
        if (res.cooldownSeconds) {
          setTimer(res.cooldownSeconds);
          setCooldownHours(Math.ceil(res.cooldownSeconds / 3600));
          setCanResend(false);
        }
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to resend verification email';
      if (!isAuto) toast.error(errorMessage);

      // Handle rate limiting from error response
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.attemptsRemaining !== undefined) {
          setAttemptsRemaining(errorData.attemptsRemaining);
        }
        if (errorData.cooldownSeconds) {
          setTimer(errorData.cooldownSeconds);
          setCooldownHours(Math.ceil(errorData.cooldownSeconds / 3600));
          setCanResend(false);
        }
      }
    } finally {
      setResending(false);
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
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-family: inherit;
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
          text-align: center;
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
          margin-top: 24px;
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
        
        .status-success { color: #059669; }
        .status-error { color: #dc2626; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      <div className="login-wrap">
        {/* ── LEFT PANEL ── */}
        <section className="login-left">
          <div className="login-left-noise" />
          <button onClick={() => navigate(-1)} className="login-back-link">
            <ArrowLeft size={15} />
            Go back
          </button>
          <div className="login-left-tag">
            <ShieldCheck style={{ width: 11, height: 11 }} />
            Verification Center
          </div>
          <h1>Confirm your identity to unlock your dashboard.</h1>
          <p className="login-left-sub">
            Protecting your account is our priority. Verify your email to ensure only you have access to your data hub.
          </p>
          <div className="login-feature-list">
            {[
              { icon: Mail, title: 'Email Confirmation', desc: 'Securely verify ownership of your registered email address.' },
              { icon: ShieldCheck, title: 'Identity Protection', desc: 'Prevents unauthorized account creation and access.' },
              { icon: Activity, title: 'Full Activation', desc: 'Unlock all features once your email is confirmed.' },
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
            {!token ? (
              // Case 1: Initial check-email state
              <>
                <div className="login-icon-box">
                  <Mail size={32} />
                </div>
                <h2 className="login-title">Verify Your Email</h2>
                <p className="login-subtitle">
                  We've sent a verification link to {email ? <strong style={{ color: '#111' }}>{email}</strong> : 'your email address'}.
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
                      {attemptsRemaining === 0 ? 'Account Verification Locked' : 'Verification Attempts'}
                    </div>
                    <div>
                      {attemptsRemaining === 0 
                        ? 'You have exhausted all verification attempts. For security reasons, your account verification is locked for 24 hours.'
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
                        <span>{attemptsRemaining === 0 ? 'Restoration starts in:' : 'Resend available in:'}</span>
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
                  onClick={() => handleResend()}
                  disabled={resending || !email || !canResend || attemptsRemaining === 0}
                  className="login-submit"
                >
                  {resending ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <RefreshCw size={18} />
                  )}
                  {resending
                    ? 'Resending...'
                    : !canResend
                      ? timer > 60
                        ? `Locked: ${formatCountdown(timer)}`
                        : `Wait ${timer}s`
                      : attemptsRemaining === 0
                        ? 'Max attempts reached'
                        : 'Resend Verification Email'}
                </button>
              </>
            ) : verifying ? (
              // Case 2: Verification in progress
              <>
                <div className="login-icon-box">
                  <Loader2 className="animate-spin" size={32} />
                </div>
                <h2 className="login-title">Verifying...</h2>
                <p className="login-subtitle">Please wait while we confirm your credentials.</p>
              </>
            ) : status === 'success' ? (
              // Case 3: Success
              <>
                <div className="login-icon-box" style={{ borderColor: '#059669', color: '#059669', background: '#ecfdf5' }}>
                  <CheckCircle size={32} />
                </div>
                <h2 className="login-title status-success">Verified!</h2>
                <p className="login-subtitle">{message}</p>
                <button
                  onClick={() => navigate('/login')}
                  className="login-submit"
                  style={{ background: '#059669' }}
                >
                  Go to Login
                  <ChevronRight size={18} />
                </button>
              </>
            ) : (
              // Case 4: Error
              <>
                <div className="login-icon-box" style={{ borderColor: '#dc2626', color: '#dc2626', background: '#fef2f2' }}>
                  <XCircle size={32} />
                </div>
                <h2 className="login-title status-error">Failed</h2>
                <p className="login-subtitle">{message}</p>
                <button
                  onClick={() => navigate('/verify-email?email=' + (email || ''))}
                  className="login-submit"
                >
                  Try Again
                </button>
              </>
            )}

            <div className="login-footer-box">
              <p>
                Need help? <Link to="/">Contact Support</Link>
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
