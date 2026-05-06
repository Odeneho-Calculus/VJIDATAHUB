import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import {
  AlertCircle, Eye, EyeOff, UserPlus, Store, Lock,
  ArrowLeft, ShieldCheck, ChevronRight, Wallet, Activity,
} from 'lucide-react';
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
  const [userType, setUserType] = useState('buyer');
  const [recruitNewAgents, setRecruitNewAgents] = useState(true);

  const { register } = useAuth();
  const { refreshSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
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

      const data = await register(
        email, password, name,
        phoneValidation.formatted, referralCode,
        userType === 'agent' ? 'agent' : 'user'
      );
      await refreshSettings();
      toast.success('Account created successfully!', { duration: 3000 });

      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'agent') navigate('/agent/store');
      else navigate('/dashboard');
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      toast.error(msg, {
        duration: 5000,
        className: 'rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-medium px-6 py-3 shadow-xl shadow-rose-200/50',
        iconTheme: { primary: '#be123c', secondary: '#fff' },
      });
    } finally {
      setLoading(false);
    }
  };

  const agentDisabled = !recruitNewAgents;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500&display=swap');

        .reg-wrap {
          width: 100%;
          max-width: 980px;
          display: grid;
          grid-template-columns: 1fr;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
        }
        @media (min-width: 1024px) {
          .reg-wrap { grid-template-columns: 1.05fr 0.95fr; min-height: 680px; }
        }

        /* ── LEFT PANEL ── */
        .reg-left {
          display: none;
          flex-direction: column;
          background: #111;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .reg-left { display: flex; }
        }
        .reg-left-noise {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
        }
        .reg-back-link {
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
        .reg-back-link:hover { color: #fff; }
        .reg-left-tag {
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
        .reg-left h1 {
          font-size: clamp(20px, 2.6vw, 28px);
          font-weight: 800;
          color: #fff;
          line-height: 1.25;
          margin: 0 0 12px;
          position: relative;
          z-index: 1;
        }
        .reg-left-sub {
          font-size: 13px;
          color: #999;
          line-height: 1.65;
          margin: 0 0 28px;
          position: relative;
          z-index: 1;
        }
        .reg-feature-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          z-index: 1;
          flex: 1;
        }
        .reg-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 14px;
          background: rgba(255,255,255,0.04);
        }
        .reg-feature-icon {
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
        .reg-feature-title { font-size: 13px; font-weight: 700; color: #fff; margin: 0 0 3px; }
        .reg-feature-desc  { font-size: 12px; color: #888; line-height: 1.5; margin: 0; }
        .reg-left-footer {
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.04);
          margin-top: 20px;
          position: relative;
          z-index: 1;
        }
        .reg-left-footer p:first-child {
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #f0a500; margin: 0 0 6px;
        }
        .reg-left-footer p:last-child { font-size: 12.5px; color: #888; line-height: 1.55; margin: 0; }

        /* ── RIGHT PANEL ── */
        .reg-right {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 36px 28px;
          background: #fff;
          overflow-y: auto;
        }
        @media (min-width: 640px) { .reg-right { padding: 40px; } }
        .reg-form-wrap { width: 100%; max-width: 400px; }

        /* Mobile top bar */
        .reg-mobile-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        @media (min-width: 1024px) { .reg-mobile-top { display: none; } }
        .reg-mobile-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600; color: #555; text-decoration: none; transition: color 0.15s;
        }
        .reg-mobile-back:hover { color: #111; }

        /* Heading */
        .reg-heading-row { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }
        .reg-icon-box {
          width: 46px; height: 46px; background: #111; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: #f0a500;
        }
        .reg-title  { font-size: 26px; font-weight: 800; color: #111; margin: 0; }
        .reg-subtitle { font-size: 13px; color: #777; margin: 0 0 20px; line-height: 1.5; }

        /* Role selector */
        .reg-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
        .reg-role-btn {
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          background: #fafaf7;
          padding: 12px 14px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }
        .reg-role-btn:hover:not(:disabled) { background: #fff; border-color: #bbb; }
        .reg-role-btn.active-buyer  { border-color: #111; background: #111; box-shadow: 0 2px 12px rgba(0,0,0,0.18); }
        .reg-role-btn.active-agent  { border-color: #f0a500; background: #f0a500; box-shadow: 0 2px 12px rgba(240,165,0,0.25); }
        .reg-role-btn:disabled      { opacity: 0.45; cursor: not-allowed; }
        .reg-role-icon-row { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
        .reg-role-name { font-size: 13px; font-weight: 700; }
        .reg-role-btn.active-buyer  .reg-role-name { color: #fff; }
        .reg-role-btn.active-agent  .reg-role-name { color: #111; }
        .reg-role-btn:not(.active-buyer):not(.active-agent) .reg-role-name { color: #333; }
        .reg-role-btn.active-buyer  .reg-role-icon-row { color: #f0a500; }
        .reg-role-btn.active-agent  .reg-role-icon-row { color: #111; }
        .reg-role-btn:not(.active-buyer):not(.active-agent) .reg-role-icon-row { color: #888; }
        .reg-role-desc { font-size: 11.5px; line-height: 1.5; margin: 0; }
        .reg-role-btn.active-buyer  .reg-role-desc { color: #aaa; }
        .reg-role-btn.active-agent  .reg-role-desc { color: #6b5000; }
        .reg-role-btn:not(.active-buyer):not(.active-agent) .reg-role-desc { color: #999; }

        /* Info banners */
        .reg-info-banner {
          border-radius: 7px;
          padding: 11px 14px;
          font-size: 12.5px;
          font-weight: 500;
          line-height: 1.55;
          margin-bottom: 16px;
        }
        .reg-info-banner.agent-open   { background: rgba(240,165,0,0.10); border: 1.5px solid rgba(240,165,0,0.35); color: #7a5200; }
        .reg-info-banner.agent-closed { background: #fafaf7; border: 1.5px solid #e0e0d8; color: #888; }

        /* Fields */
        .reg-label { display: block; font-size: 12.5px; font-weight: 700; color: #333; margin-bottom: 7px; letter-spacing: 0.02em; }
        .reg-input {
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
        .reg-input::placeholder { color: #bbb; }
        .reg-input:focus  { border-color: #111; background: #fff; box-shadow: 0 0 0 3px rgba(17,17,17,0.07); }
        .reg-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .reg-input.error  { border-color: #fca5a5; }
        .reg-input.error:focus { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.08); }

        .reg-field { margin-bottom: 14px; }
        .reg-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .reg-pw-wrap { position: relative; }
        .reg-pw-toggle {
          position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
          background: none; border: none; padding: 0; cursor: pointer;
          color: #aaa; display: flex; align-items: center; transition: color 0.15s;
        }
        .reg-pw-toggle:hover { color: #555; }
        .reg-pw-toggle:disabled { opacity: 0.4; cursor: not-allowed; }

        .reg-field-error { font-size: 11.5px; color: #ef4444; font-weight: 600; margin: 5px 0 0 2px; }

        /* Submit */
        .reg-submit {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: #111; color: #fff; font-family: inherit;
          font-size: 14px; font-weight: 700;
          padding: 13px 20px; border: none; border-radius: 7px;
          cursor: pointer; transition: background 0.15s; margin-top: 4px;
        }
        .reg-submit:hover:not(:disabled) { background: #222; }
        .reg-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        @keyframes reg-spin { to { transform: rotate(360deg); } }
        .reg-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: reg-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        /* Error box */
        .reg-error {
          display: flex; align-items: flex-start; gap: 8px;
          background: #fff5f5; border: 1.5px solid #fecaca;
          border-radius: 7px; padding: 11px 13px;
          font-size: 13px; color: #b91c1c; margin-bottom: 16px;
        }

        /* Footer box */
        .reg-footer-box {
          border: 1.5px solid #e4e4de; border-radius: 7px;
          background: #fafaf7; padding: 13px 16px; margin-top: 16px;
        }
        .reg-footer-box p { font-size: 13px; color: #666; margin: 0; }
        .reg-footer-box a { font-weight: 700; color: #111; text-decoration: none; }
        .reg-footer-box a:hover { color: #f0a500; }

        .reg-secure-note {
          text-align: center; font-size: 11.5px; font-weight: 600;
          color: #bbb; margin-top: 14px; letter-spacing: 0.03em;
        }
      `}</style>

      <div className="reg-wrap">

        {/* ── LEFT PANEL ── */}
        <section className="reg-left">
          <div className="reg-left-noise" />

          <Link to="/" className="reg-back-link">
            <ArrowLeft size={15} />
            Back to homepage
          </Link>

          <div className="reg-left-tag">
            <UserPlus style={{ width: 11, height: 11 }} />
            Create Your Workspace
          </div>

          <h1>Register once and move directly into your dashboard, buyer workspace, or agent storefront.</h1>
          <p className="reg-left-sub">
            Built for buyers and agents — manage orders, wallets, and storefront operations from a single account.
          </p>

          <div className="reg-feature-list">
            {[
              { icon: Wallet, title: 'Wallet Ready',         desc: 'Manage balances, top-ups and purchase activity in one view.' },
              { icon: Activity, title: 'Operational Visibility', desc: 'Monitor orders, delivery flow, and customer history clearly.' },
              { icon: Store, title: 'Agent Storefront',      desc: 'Eligible agents can proceed into store setup immediately after signup.' },
            ].map((item) => (
              <div key={item.title} className="reg-feature-item">
                <div className="reg-feature-icon">
                  <item.icon style={{ width: 17, height: 17 }} />
                </div>
                <div>
                  <p className="reg-feature-title">{item.title}</p>
                  <p className="reg-feature-desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="reg-left-footer">
            <p>Account access</p>
            <p>Buyer accounts go to the dashboard. Agent accounts proceed to store setup when recruitment is enabled.</p>
          </div>
        </section>

        {/* ── RIGHT PANEL ── */}
        <section className="reg-right">
          <div className="reg-form-wrap">

            {/* Mobile top bar */}
            <div className="reg-mobile-top">
              <Link to="/" className="reg-mobile-back">
                <ArrowLeft size={15} />
                Home
              </Link>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: 0 }}>VJI DATA HUB</p>
                <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Create account</p>
              </div>
            </div>

            {/* Heading */}
            <div className="reg-heading-row">
              <div className="reg-icon-box">
                <UserPlus style={{ width: 22, height: 22 }} />
              </div>
              <h2 className="reg-title">Create account</h2>
            </div>
            <p className="reg-subtitle">Choose your role, fill in your details, and get started.</p>

            {/* Role selector */}
            <div className="reg-role-grid">
              <button
                type="button"
                onClick={() => setUserType('buyer')}
                className={`reg-role-btn ${userType === 'buyer' ? 'active-buyer' : ''}`}
              >
                <div className="reg-role-icon-row">
                  <UserPlus size={15} />
                  <span className="reg-role-name">Buyer</span>
                </div>
                <p className="reg-role-desc">Purchase bundles and manage your account from the main dashboard.</p>
              </button>

              <button
                type="button"
                onClick={() => !agentDisabled && setUserType('agent')}
                disabled={agentDisabled}
                className={`reg-role-btn ${userType === 'agent' ? 'active-agent' : ''}`}
              >
                <div className="reg-role-icon-row">
                  {agentDisabled ? <Lock size={15} /> : <Store size={15} />}
                  <span className="reg-role-name">Agent</span>
                </div>
                <p className="reg-role-desc">Create a public storefront and manage customer orders professionally.</p>
              </button>
            </div>

            {/* Banners */}
            {userType === 'agent' && recruitNewAgents && (
              <div className="reg-info-banner agent-open">
                Agents can create their own data store, manage inventory, and earn commissions from sales.
              </div>
            )}
            {agentDisabled && (
              <div className="reg-info-banner agent-closed">
                Agent registration is currently closed by the platform. Please check back later or register as a buyer.
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="reg-error">
                <AlertCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* Full Name */}
              <div className="reg-field">
                <label htmlFor="name" className="reg-label">Full Name</label>
                <input
                  id="name" type="text" value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="reg-input" placeholder="John Doe" disabled={loading}
                />
              </div>

              {/* Email */}
              <div className="reg-field">
                <label htmlFor="email" className="reg-label">Email Address</label>
                <input
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="reg-input" placeholder="you@example.com" disabled={loading}
                />
              </div>

              {/* Phone */}
              <div className="reg-field">
                <label htmlFor="phone" className="reg-label">Phone Number</label>
                <input
                  id="phone" type="tel" value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                  onBlur={() => {
                    if (phone) {
                      const v = validatePhoneNumber(phone);
                      if (!v.isValid) setPhoneError(v.error);
                    }
                  }}
                  className={`reg-input${phoneError ? ' error' : ''}`}
                  placeholder="e.g. 0244123456" disabled={loading}
                />
                {phoneError && <p className="reg-field-error">{phoneError}</p>}
              </div>

              {/* Password row */}
              <div className="reg-two-col">
                <div className="reg-field">
                  <label htmlFor="password" className="reg-label">Password</label>
                  <div className="reg-pw-wrap">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="reg-input" style={{ paddingRight: 44 }}
                      placeholder="••••••••" disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="reg-pw-toggle" disabled={loading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="reg-field">
                  <label htmlFor="confirmPassword" className="reg-label">Confirm</label>
                  <div className="reg-pw-wrap">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="reg-input" style={{ paddingRight: 44 }}
                      placeholder="••••••••" disabled={loading}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="reg-pw-toggle" disabled={loading}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Referral */}
              <div className="reg-field">
                <label htmlFor="referralCode" className="reg-label">Referral Code <span style={{ fontWeight: 500, color: '#bbb' }}>(Optional)</span></label>
                <input
                  id="referralCode" type="text" value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="reg-input" placeholder="e.g. REF12345" disabled={loading}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || (userType === 'agent' && agentDisabled)}
                className="reg-submit"
              >
                {loading ? (
                  <>
                    <span className="reg-spinner" />
                    Creating account...
                  </>
                ) : userType === 'agent' && agentDisabled ? (
                  'Registration Closed'
                ) : (
                  <>
                    Create Account
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Sign-in link */}
            <div className="reg-footer-box">
              <p>
                Already have an account?{' '}
                <Link to="/login">Sign in</Link>
              </p>
            </div>

            <p className="reg-secure-note">Protected by enterprise-grade security.</p>
          </div>
        </section>

      </div>
    </div>
  );
}