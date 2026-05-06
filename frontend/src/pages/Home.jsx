import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { publicAPI } from '../services/api';
import { useMetaTags } from '../hooks/useMetaTags';
import {
  Shield,
  LayoutDashboard,
  Wallet,
  Store,
  Users,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Briefcase,
  Gauge,
  Settings,
  BadgeCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [referralSettings, setReferralSettings] = useState(null);
  const [previewPlans, setPreviewPlans] = useState([]);
  const [previewPlansLoading, setPreviewPlansLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    transactions: 0,
    totalOrdersCompleted: 0,
    successRate: 0,
    uptime: 99.9,
    support: '24/7',
  });

  useMetaTags({
    title: 'VJI Data Hub - Buy Mobile Data Bundles - Easy and Fast',
    description: 'Buy data bundles with VJI Data Hub. Get cheap prices. Quick delivery. Sell data too. Start your own store and earn money.',
    url: `${import.meta.env.VITE_APP_URL || 'https://www.vjidatahub.com'}/`,
    type: 'website',
  });

  useEffect(() => {
    fetchReferralSettings();
    fetchPublicStats();
    fetchPreviewPlans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flattenNetworkBundles = (networkEntry) => {
    if (!networkEntry) return [];
    if (Array.isArray(networkEntry)) return networkEntry;
    if (typeof networkEntry === 'object') {
      return Object.values(networkEntry).flatMap((value) => (Array.isArray(value) ? value : []));
    }
    return [];
  };

  const fetchPreviewPlans = async () => {
    try {
      setPreviewPlansLoading(true);
      const response = await publicAPI.getActivePlans(120, 0);

      if (response?.success) {
        const grouped = response.grouped || {};
        const plans = Object.values(grouped).flatMap((networkEntry) => flattenNetworkBundles(networkEntry));

        const uniqueById = [];
        const seen = new Set();
        plans.forEach((plan) => {
          const key = plan?._id || `${plan?.network || ''}-${plan?.name || ''}-${plan?.dataAmount || ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueById.push(plan);
          }
        });

        uniqueById.sort((a, b) => {
          const aPrice = Number(a?.sellingPrice ?? a?.price ?? 0);
          const bPrice = Number(b?.sellingPrice ?? b?.price ?? 0);
          return aPrice - bPrice;
        });

        setPreviewPlans(uniqueById.slice(0, 8));
      }
    } catch (err) {
      console.error('Failed to fetch preview plans:', err);
      setPreviewPlans([]);
    } finally {
      setPreviewPlansLoading(false);
    }
  };

  const fetchReferralSettings = async () => {
    try {
      const response = await publicAPI.getReferralSettings();
      if (response.success) {
        setReferralSettings(response.settings);
      }
    } catch (err) {
      console.error('Failed to fetch referral settings:', err);
    }
  };

  const fetchPublicStats = async () => {
    try {
      const response = await publicAPI.getPublicStats();
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (err) {
      console.error('Failed to fetch public stats:', err);
    }
  };

  const features = useMemo(() => [
    {
      icon: Store,
      title: 'Storefront Control',
      desc: 'Give every agent a branded store URL with configurable catalogs and pricing windows.',
    },
    {
      icon: Wallet,
      title: 'Wallet & Payout Engine',
      desc: 'Track balances, commissions, fees, and payout history from one financial workspace.',
    },
    {
      icon: Activity,
      title: 'Order Lifecycle Visibility',
      desc: 'See statuses in real time from purchase request through delivery and resolution.',
    },
    {
      icon: LayoutDashboard,
      title: 'Unified Dashboard',
      desc: 'Agents work from focused views with role-based actions, reports, and controls.',
    },
    {
      icon: Settings,
      title: 'Policy Governance',
      desc: 'Manage referral rules, provider settings, and operational safeguards centrally.',
    },
    {
      icon: Shield,
      title: 'Secure by Design',
      desc: 'Permissioned routes, protected actions, and auditable activity for every account.',
    },
  ], []);

  const workflow = [
    {
      icon: Briefcase,
      title: '1. Onboard Roles',
      desc: 'Register users, promote agents, and assign clear operational responsibilities.',
    },
    {
      icon: Gauge,
      title: '2. Operate at Speed',
      desc: 'Monitor orders, transaction flow, and payout queues from streamlined dashboards.',
    },
    {
      icon: BadgeCheck,
      title: '3. Scale with Confidence',
      desc: 'Use analytics and controls to improve margin, reliability, and support outcomes.',
    },
  ];

  const heroCount = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M+`;
    if (value >= 1000) return `${Math.round(value / 1000)}K+`;
    return value.toLocaleString();
  };

  const dashboardRoute = useMemo(() => {
    if (!user) return '/login';
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'agent') return '/agent/dashboard';
    return '/dashboard';
  }, [user]);

  const myStoreRoute = useMemo(() => {
    if (!user) return '/register';
    if (user?.role === 'admin') return '/admin/agent-stores';
    if (user?.role === 'agent') return '/agent/store';
    return '/become-agent';
  }, [user]);

  return (
    <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", background: '#f5f5f0', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500&display=swap');

        .vji-hero {
          position: relative;
          overflow: hidden;
          background: #111;
          min-height: 400px;
        }
        .vji-hero-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 70% center;
          opacity: 0.38;
        }
        .vji-hero-content {
          position: relative;
          z-index: 2;
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 20px 56px;
        }
        .vji-tag {
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
        }
        .vji-hero h1 {
          font-size: clamp(28px, 5vw, 52px);
          font-weight: 800;
          color: #fff;
          line-height: 1.15;
          margin: 0 0 16px;
          max-width: 640px;
        }
        .vji-hero p {
          font-size: clamp(14px, 2vw, 16px);
          color: #ccc;
          max-width: 520px;
          line-height: 1.6;
          margin: 0 0 28px;
        }
        .vji-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f0a500;
          color: #111;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 22px;
          border-radius: 6px;
          text-decoration: none;
          transition: background 0.15s;
        }
        .vji-btn-primary:hover { background: #d49200; }
        .vji-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 22px;
          border-radius: 6px;
          border: 1.5px solid rgba(255,255,255,0.3);
          text-decoration: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .vji-btn-outline:hover { border-color: #fff; background: rgba(255,255,255,0.07); }
        .vji-btn-dark {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #111;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 22px;
          border-radius: 6px;
          text-decoration: none;
          transition: background 0.15s;
        }
        .vji-btn-dark:hover { background: #222; }

        .vji-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 28px 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Section wrapper */
        .vji-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 10px;
          padding: 20px;
        }
        .vji-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .vji-section-title {
          font-size: 18px;
          font-weight: 800;
          color: #111;
          margin: 0;
        }
        .vji-badge {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 4px;
          background: #111;
          color: #f0a500;
        }
        .vji-badge-muted {
          background: #f0f0ea;
          color: #555;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 4px;
        }

        /* Plan grid */
        .vji-plans-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 1024px) {
          .vji-plans-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .vji-plan-card {
          border: 1.5px solid #e4e4de;
          border-radius: 8px;
          padding: 14px;
          background: #fafaf7;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .vji-plan-card:hover {
          border-color: #f0a500;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        .vji-plan-card-lg-only {
          display: none;
        }
        @media (min-width: 1024px) {
          .vji-plan-card-lg-only { display: block; }
        }
        .vji-network-pill {
          display: inline-block;
          background: #111;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 3px;
        }
        .vji-data-pill {
          display: inline-block;
          background: #f0f0ea;
          color: #333;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 3px;
          border: 1px solid #e0e0d8;
        }
        .vji-plan-price-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #888;
          margin-top: 10px;
          margin-bottom: 2px;
        }
        .vji-plan-price {
          font-family: 'DM Mono', monospace;
          font-size: 17px;
          font-weight: 600;
          color: #111;
        }

        /* Skeleton */
        .vji-skeleton {
          background: #ececea;
          border-radius: 4px;
          animation: vji-pulse 1.5s ease-in-out infinite;
        }
        @keyframes vji-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }

        /* Features grid */
        .vji-features-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 10px;
        }
        @media (min-width: 640px) {
          .vji-features-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .vji-features-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .vji-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          border: 1.5px solid #e4e4de;
          border-radius: 8px;
          background: #fafaf7;
          transition: border-color 0.15s;
        }
        .vji-feature-item:hover { border-color: #ccc; }
        .vji-feature-icon {
          width: 36px;
          height: 36px;
          background: #111;
          color: #f0a500;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .vji-feature-title {
          font-size: 14px;
          font-weight: 700;
          color: #111;
          margin: 0 0 4px;
        }
        .vji-feature-desc {
          font-size: 12.5px;
          color: #666;
          line-height: 1.5;
          margin: 0;
        }

        /* Stats + performance section */
        .vji-perf-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 1024px) {
          .vji-perf-grid { grid-template-columns: 2fr 3fr; align-items: start; }
        }
        .vji-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .vji-stat-box {
          border: 1.5px solid #e4e4de;
          border-radius: 8px;
          padding: 14px 16px;
          background: #fafaf7;
        }
        .vji-stat-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 6px;
        }
        .vji-stat-value {
          font-family: 'DM Mono', monospace;
          font-size: 22px;
          font-weight: 600;
          color: #111;
        }
        .vji-stat-box-accent {
          border-color: #111;
          background: #111;
        }
        .vji-stat-box-accent .vji-stat-label { color: #f0a500; }
        .vji-stat-box-accent .vji-stat-value { color: #fff; }
        .vji-stat-box-accent p {
          font-size: 11px;
          color: #aaa;
          margin: 4px 0 0;
        }

        /* Columns layout */
        .vji-two-col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 1024px) {
          .vji-two-col { grid-template-columns: 3fr 2fr; }
        }

        /* Workflow items */
        .vji-workflow-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          border: 1.5px solid #e4e4de;
          border-radius: 8px;
          background: #fafaf7;
        }
        .vji-workflow-icon {
          width: 36px;
          height: 36px;
          background: #f0a500;
          color: #111;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .vji-workflow-title {
          font-size: 14px;
          font-weight: 700;
          color: #111;
          margin: 0 0 3px;
        }
        .vji-workflow-desc {
          font-size: 12.5px;
          color: #666;
          line-height: 1.5;
          margin: 0;
        }

        /* Role outcomes */
        .vji-role-box {
          border: 1.5px solid #e4e4de;
          border-radius: 8px;
          padding: 14px;
          background: #fafaf7;
          margin-bottom: 10px;
        }
        .vji-role-box:last-child { margin-bottom: 0; }
        .vji-role-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .vji-role-title {
          font-size: 14px;
          font-weight: 700;
          color: #111;
          margin: 0;
        }
        .vji-role-desc {
          font-size: 12.5px;
          color: #666;
          line-height: 1.5;
          margin: 0;
        }
        .vji-referral-box {
          border: 1.5px solid #f0a500;
          border-radius: 8px;
          padding: 14px;
          background: #fffbf0;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .vji-referral-box p {
          font-size: 12.5px;
          color: #333;
          margin: 0;
          line-height: 1.5;
        }

        /* CTA section */
        .vji-cta {
          background: #111;
          border-radius: 10px;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        @media (min-width: 768px) {
          .vji-cta {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .vji-cta h2 {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 6px;
        }
        .vji-cta p {
          font-size: 13px;
          color: #aaa;
          margin: 0;
        }
        .vji-cta-btns {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        /* Divider line */
        .vji-divider-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #999;
          margin-bottom: 4px;
        }
        .vji-divider-label::before,
        .vji-divider-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e0e0d8;
        }

        /* perf checklist */
        .vji-check-list {
          list-style: none;
          margin: 12px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .vji-check-list li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          color: #444;
        }
        .vji-check-list li svg {
          flex-shrink: 0;
          margin-top: 1px;
          color: #f0a500;
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="vji-hero">
        <img
          src="/banner/homebanner.png"
          alt=""
          aria-hidden="true"
          className="vji-hero-img"
        />
        <div className="vji-hero-content">
          <div className="vji-tag">
            <Sparkles style={{ width: 11, height: 11 }} />
            Data Reselling Control Center
          </div>
          <h1>Built for Agents Who Run Data Operations at Scale</h1>
          <p>
            One compact platform for storefront management, order processing, commissions, and oversight. Browse plans here, then continue to purchase in the right flow.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to={user ? dashboardRoute : '/register'} className="vji-btn-primary">
              {user ? 'Dashboard' : 'Join Now'}
              <ArrowUpRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link to={user ? myStoreRoute : '/login'} className="vji-btn-outline">
              {user ? 'My Store' : 'Sign In'}
              <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        </div>
      </section>

      <main className="vji-main">

        {/* ── DATA PLANS PREVIEW ── */}
        <div className="vji-card">
          <div className="vji-section-header">
            <div>
              <h2 className="vji-section-title">Data Plans Preview</h2>
              <p style={{ fontSize: 12.5, color: '#888', margin: '3px 0 0' }}>View-only. Purchase starts on the next page.</p>
            </div>
            <Link
              to={user ? '/buy-data' : '/guest/purchase'}
              className="vji-btn-dark"
              style={{ fontSize: 13, padding: '9px 16px', whiteSpace: 'nowrap' }}
            >
              View All Plans
              <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>

          {previewPlansLoading ? (
            <div className="vji-plans-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`vji-plan-card${i >= 4 ? ' vji-plan-card-lg-only' : ''}`}
                >
                  <div className="vji-skeleton" style={{ height: 16, width: 60, marginBottom: 10 }} />
                  <div className="vji-skeleton" style={{ height: 12, width: '70%', marginBottom: 8 }} />
                  <div className="vji-skeleton" style={{ height: 20, width: 80 }} />
                </div>
              ))}
            </div>
          ) : previewPlans.length > 0 ? (
            <div className="vji-plans-grid">
              {previewPlans.map((plan, index) => {
                const displayPrice = Number(plan?.sellingPrice ?? plan?.price ?? 0);
                const displayDataSize = plan?.dataSize
                  || plan?.dataAmount
                  || (plan?.dataSizeMB ? `${plan.dataSizeMB}GB` : '')
                  || (plan?.planName?.match(/\d+(?:\.\d+)?\s*GB/i)?.[0] ?? '')
                  || 'Data';
                return (
                  <div
                    key={plan._id || `${plan.network}-${plan.name}-${plan.dataAmount}`}
                    className={`vji-plan-card${index >= 4 ? ' vji-plan-card-lg-only' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span className="vji-network-pill">{plan.network || 'Network'}</span>
                      <span className="vji-data-pill">{displayDataSize}</span>
                    </div>
                    <p className="vji-plan-price-label">Price</p>
                    <p className="vji-plan-price">GHS {displayPrice.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ border: '1.5px dashed #ddd', borderRadius: 8, padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#888', margin: 0 }}>No plans available for preview right now.</p>
            </div>
          )}
        </div>

        {/* ── PLATFORM CAPABILITIES ── */}
        <div className="vji-card">
          <div className="vji-section-header">
            <h2 className="vji-section-title">Platform Capabilities</h2>
            <span className="vji-badge-muted">Agent Focus</span>
          </div>
          <div className="vji-features-grid">
            {features.map((feature) => (
              <div key={feature.title} className="vji-feature-item">
                <div className="vji-feature-icon">
                  <feature.icon style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <p className="vji-feature-title">{feature.title}</p>
                  <p className="vji-feature-desc">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PERFORMANCE / STATS ── */}
        <div className="vji-card">
          <div className="vji-perf-grid">
            <div>
              <span className="vji-badge" style={{ marginBottom: 12, display: 'inline-block' }}>Platform Performance</span>
              <h2 className="vji-section-title" style={{ marginBottom: 8 }}>Operational Confidence, Backed by Numbers</h2>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>
                Dependable processing, clear transaction trails, and predictable availability for daily sales operations.
              </p>
              <ul className="vji-check-list">
                <li>
                  <CheckCircle2 style={{ width: 14, height: 14 }} />
                  Real-time order visibility.
                </li>
                <li>
                  <CheckCircle2 style={{ width: 14, height: 14 }} />
                  Clean wallet and payout reconciliation.
                </li>
                <li>
                  <CheckCircle2 style={{ width: 14, height: 14 }} />
                  Reliable uptime with responsive support.
                </li>
              </ul>
            </div>
            <div className="vji-stats-grid">
              <div className="vji-stat-box">
                <p className="vji-stat-label">Agents</p>
                <p className="vji-stat-value">{heroCount(stats.totalUsers)}</p>
              </div>
              <div className="vji-stat-box">
                <p className="vji-stat-label">Transactions</p>
                <p className="vji-stat-value">{heroCount(stats.transactions)}</p>
              </div>
              <div className="vji-stat-box">
                <p className="vji-stat-label">Completed Orders</p>
                <p className="vji-stat-value">{heroCount(stats.totalOrdersCompleted)}</p>
              </div>
              <div className="vji-stat-box vji-stat-box-accent">
                <p className="vji-stat-label">Uptime</p>
                <p className="vji-stat-value">{stats.uptime}%</p>
                <p>Reliable for day-to-day operations.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── HOW IT WORKS + ROLES ── */}
        <div className="vji-two-col">
          <div className="vji-card">
            <h2 className="vji-section-title" style={{ marginBottom: 14 }}>How Operations Flow</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {workflow.map((item) => (
                <div key={item.title} className="vji-workflow-item">
                  <div className="vji-workflow-icon">
                    <item.icon style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <p className="vji-workflow-title">{item.title}</p>
                    <p className="vji-workflow-desc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="vji-card">
            <h2 className="vji-section-title" style={{ marginBottom: 14 }}>Role Outcomes</h2>
            <div className="vji-role-box">
              <div className="vji-role-header">
                <Users style={{ width: 15, height: 15, color: '#f0a500' }} />
                <p className="vji-role-title">For Agents</p>
              </div>
              <p className="vji-role-desc">Run storefront orders, track commissions, and manage wallet activity in one focused workspace.</p>
            </div>
            <div className="vji-role-box">
              <div className="vji-role-header">
                <Shield style={{ width: 15, height: 15, color: '#f0a500' }} />
                <p className="vji-role-title">For Agent Operations</p>
              </div>
              <p className="vji-role-desc">Oversee teams, providers, orders, referrals, and financial controls with complete visibility.</p>
            </div>
            <div className="vji-referral-box">
              <CheckCircle2 style={{ width: 16, height: 16, color: '#f0a500', flexShrink: 0, marginTop: 1 }} />
              <p>
                {referralSettings
                  ? `Referral bonus configured at GHS ${referralSettings.amountPerReferral} per successful signup.`
                  : 'Referral incentives can be configured and tracked from operations settings.'}
              </p>
            </div>
          </div>
        </div>

        {/* ── CTA (only for guests) ── */}
        {!user && (
          <div className="vji-cta">
            <div>
              <h2>Start Building Your Reselling Operation</h2>
              <p>Join as an agent to manage performance, orders, commissions, and earnings from one workspace.</p>
            </div>
            <div className="vji-cta-btns">
              <Link to="/register" className="vji-btn-primary">Create Account</Link>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '12px 22px',
                  borderRadius: 6,
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  textDecoration: 'none',
                }}
              >
                Sign In
              </Link>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}