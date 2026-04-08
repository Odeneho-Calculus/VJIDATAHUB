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
    title: 'Data Reseller Platform for Agents',
    description: 'Professional platform for agent storefronts, centralized order operations, payouts, and growth oversight.',
    url: `${import.meta.env.VITE_APP_URL || 'https://www.vjidatahub.com'}/`,
    type: 'website',
  });

  useEffect(() => {
    fetchReferralSettings();
    fetchPublicStats();
    fetchPreviewPlans();
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
      title: 'Wallet and Payout Engine',
      desc: 'Track balances, commissions, fees, and payout history from one financial workspace.',
    },
    {
      icon: Activity,
      title: 'Order Lifecycle Visibility',
      desc: 'See statuses in real time from purchase request through delivery and resolution.',
    },
    {
      icon: LayoutDashboard,
      title: 'Unified Operational Dashboard',
      desc: 'Agents work from focused views with role-based actions, reports, and controls.',
    },
    {
      icon: Settings,
      title: 'Policy and Settings Governance',
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
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M+`;
    }
    if (value >= 1000) {
      return `${Math.round(value / 1000)}K+`;
    }
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
    <div className="min-h-screen bg-slate-100">
      <style>{`
        @keyframes homeShorelineWave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .home-shoreline-wave {
          position: absolute;
          left: 0;
          width: 200%;
          height: 100%;
          will-change: transform;
        }
        .home-shoreline-wave--back {
          animation: homeShorelineWave 14s linear infinite;
          opacity: 0.55;
        }
        .home-shoreline-wave--front {
          animation: homeShorelineWave 8s linear infinite reverse;
          opacity: 0.9;
        }
      `}</style>

      <section className="relative w-full overflow-hidden border-y border-slate-900/10 shadow-2xl min-h-[420px] sm:min-h-[480px] lg:min-h-0">
        {/* Background image — absolutely fills the section and never crops subject */}
        <img
          src="/banner/homebanner.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-[70%_center] sm:object-center"
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(112deg, rgba(2, 6, 23, 0.97) 0%, rgba(15, 23, 42, 0.82) 45%, rgba(2, 132, 199, 0.18) 100%)' }}
        />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-200/40 bg-cyan-100/10 backdrop-blur-sm text-cyan-100 whitespace-nowrap w-fit">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[11px] font-semibold tracking-wide uppercase">Data Reselling Control Center</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-white">
              Built for Agents Who Run Data Operations at Scale
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-slate-100 max-w-2xl">
              One compact platform for storefront management, order processing, commissions, and oversight. Browse plans in view-only mode here, then continue to purchase in the right flow.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1 max-w-md">
              <Link
                to={user ? dashboardRoute : '/register'}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition"
              >
                {user ? 'Dashboard' : 'Join Now'}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                to={user ? myStoreRoute : '/login'}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200/40 bg-slate-900/35 text-white font-semibold hover:bg-slate-900/50 backdrop-blur-sm transition"
              >
                {user ? 'My Store' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-12 sm:h-16 overflow-hidden z-20">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="home-shoreline-wave home-shoreline-wave--back bottom-0"
          >
            <path
              d="M0,72 C100,94 220,24 340,46 C470,72 560,118 690,98 C810,80 920,26 1040,44 C1120,56 1160,70 1200,78 L1200,120 L0,120 Z"
              fill="rgba(241, 245, 249, 0.55)"
            />
          </svg>
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="home-shoreline-wave home-shoreline-wave--front bottom-[-6px]"
          >
            <path
              d="M0,84 C120,118 230,34 350,58 C480,84 570,112 700,94 C820,78 920,30 1040,52 C1120,66 1160,84 1200,92 L1200,120 L0,120 Z"
              fill="rgba(248, 250, 252, 0.96)"
            />
          </svg>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Data Plans Preview</h2>
              <p className="text-sm text-slate-600 mt-1">View-only plans. Purchase starts on the next page.</p>
            </div>
            <Link
              to={user ? '/buy-data' : '/guest/purchase'}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-700 text-white font-semibold hover:bg-cyan-800 transition w-full sm:w-auto"
            >
              View All Plans
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {previewPlansLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className={`rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 animate-pulse ${index >= 4 ? 'hidden lg:block' : ''}`}>
                  <div className="h-5 w-16 bg-slate-200 rounded mb-3" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-slate-200 rounded mb-4" />
                  <div className="h-6 w-20 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : previewPlans.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {previewPlans.map((plan, index) => {
                const displayPrice = Number(plan?.sellingPrice ?? plan?.price ?? 0);
                const displayDataSize = plan?.dataSize
                  || plan?.dataAmount
                  || (plan?.dataSizeMB ? `${plan.dataSizeMB}GB` : '')
                  || (plan?.planName?.match(/\d+(?:\.\d+)?\s*GB/i)?.[0] ?? '')
                  || 'Data';
                return (
                  <div key={plan._id || `${plan.network}-${plan.name}-${plan.dataAmount}`} className={`relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 ring-1 ring-slate-200/60 shadow-[0_8px_22px_rgba(2,6,23,0.12),0_2px_6px_rgba(2,6,23,0.06)] hover:shadow-[0_18px_36px_rgba(2,6,23,0.18),0_6px_14px_rgba(6,95,130,0.14)] hover:-translate-y-0.5 hover:border-cyan-300 transition-all duration-300 ${index >= 4 ? 'hidden lg:block' : ''}`}>
                    <div className="pointer-events-none absolute -right-7 -top-7 h-16 w-16 rounded-full bg-cyan-100/65 blur-xl" />

                    <div className="relative flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest bg-slate-900 text-white">
                        {plan.network || 'Network'}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-cyan-800">
                        {displayDataSize}
                      </span>
                    </div>

                    <div className="relative mt-3 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Price</p>
                      <p className="text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5">GHS {displayPrice.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
              <p className="text-sm text-slate-600">No plans available for preview right now.</p>
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Platform Capabilities</h2>
            <span className="text-xs sm:text-sm font-semibold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-full px-3 py-1">Agent Focus</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {features.map((feature) => (
              <div key={feature.title} className="group rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-cyan-300 hover:bg-cyan-50/40 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-700 transition-colors">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{feature.title}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50/70 via-white to-slate-50 p-4 sm:p-5">
          <div className="absolute -top-20 right-0 h-52 w-52 rounded-full bg-cyan-200/35 blur-3xl" />

          <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
            <div className="lg:col-span-2 space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
                <CheckCircle2 className="h-4 w-4" />
                Platform Performance
              </span>
              <h2 className="text-xl sm:text-2xl font-black leading-tight text-slate-900">Operational Confidence, Backed by Live Numbers</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Dependable processing, clear transaction trails, and predictable availability for daily sales operations.
              </p>
              <div className="space-y-1.5 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-cyan-600 flex-shrink-0" />
                  <p>Real-time order visibility.</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-cyan-600 flex-shrink-0" />
                  <p>Clean wallet and payout reconciliation.</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-cyan-600 flex-shrink-0" />
                  <p>Reliable uptime with responsive support.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Agents</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">{heroCount(stats.totalUsers)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Transactions</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">{heroCount(stats.transactions)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Completed Orders</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">{heroCount(stats.totalOrdersCompleted)}</p>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 sm:p-4">
                <p className="text-[11px] uppercase tracking-wider text-cyan-700">Uptime</p>
                <p className="text-xl sm:text-2xl font-black text-cyan-900 mt-1.5">{stats.uptime}%</p>
                <p className="mt-1 text-xs text-cyan-800">Reliable processing for day-to-day operations.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-4">How Operations Flow</h2>
            <div className="space-y-3">
              {workflow.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200">
            <h2 className="text-xl font-extrabold text-slate-900 mb-4">Role Outcomes</h2>
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-cyan-700" />
                  <h3 className="font-bold text-slate-900">For Agents</h3>
                </div>
                <p className="text-sm text-slate-600">Run storefront orders, track commissions, and manage wallet activity in one focused workspace.</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-cyan-700" />
                  <h3 className="font-bold text-slate-900">For Agent Operations</h3>
                </div>
                <p className="text-sm text-slate-600">Oversee teams, providers, orders, referrals, and financial controls with complete visibility.</p>
              </div>
              <div className="rounded-xl bg-cyan-50 border border-cyan-200 p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-700 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-cyan-900">
                    {referralSettings
                      ? `Referral bonus is configured at GHS ${referralSettings.amountPerReferral} per successful signup.`
                      : 'Referral incentives can be configured and tracked from operations settings.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!user && (
          <section className="bg-gradient-to-r from-cyan-50 to-slate-100 rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Start Building Your Reselling Operation</h2>
                <p className="text-slate-600 text-sm sm:text-base mt-1">Join as an agent to manage performance, orders, commissions, and earnings from one workspace.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-cyan-700 text-white font-semibold hover:bg-cyan-800 transition"
                >
                  Create Account
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}