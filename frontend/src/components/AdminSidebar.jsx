import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  X,
  Gift,
  Package,
  Wallet,
  Bell,
  Tag,
  CreditCard,
  Store,
  HandCoins,
  Settings2,
  ShieldCheck,
  ChevronRight,
  Globe,
  User,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { isSkdataplug } from '../utils/providerMap';

/* ── Homepage multi-colour palette ── */
const palette = [
  { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF' },   // purple
  { main: '#0F6E56', bg: '#D1FAE5', soft: '#ECFDF5' },   // teal
  { main: '#1D4ED8', bg: '#DBEAFE', soft: '#EFF6FF' },   // blue
  { main: '#B45309', bg: '#FEF3C7', soft: '#FFFBEB' },   // amber
  { main: '#BE185D', bg: '#FCE7F3', soft: '#FDF2F8' },   // pink
  { main: '#DC2626', bg: '#FEE2E2', soft: '#FFF5F5' },   // coral/red
  { main: '#0369A1', bg: '#E0F2FE', soft: '#F0F9FF' },   // sky
  { main: '#4D7C0F', bg: '#ECFCCB', soft: '#F7FEE7' },   // lime/green
];

const getColor = (index) => palette[index % palette.length];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .asb-wrapper {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .asb-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 7px;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    margin-bottom: 2px;
    border: 1.5px solid transparent;
  }
  .asb-link-active {
    background: var(--active-bg, #111);
    color: #fff;
  }
  .asb-link-inactive {
    color: #374151;
  }
  .asb-link-inactive:hover {
    background: #f5f5f0;
    color: #111;
  }

  .asb-section-title {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #6b7280;
    padding: 18px 12px 7px;
  }

  /* Scrollbar hide */
  .asb-nav::-webkit-scrollbar { display: none; }
  .asb-nav { -ms-overflow-style: none; scrollbar-width: none; }
`;

export default function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { settings } = useSettings();
  const activeProvider = settings?.vtuProvider || 'tp';
  const offersNavItem = isSkdataplug(activeProvider)
    ? { path: '/admin/skdataplug-plans', label: 'SKDataPlug Offers', icon: Tag }
    : { path: '/admin/topza-plans', label: 'Topza Offers', icon: Tag };

  const navItems = [
    { path: '/admin',                          label: 'Dashboard',         icon: LayoutDashboard },
    { path: '/admin/users',                    label: 'Users',             icon: Users },
    offersNavItem,
    { path: '/admin/result-checkers',          label: 'Result Checkers',   icon: CreditCard },
    { path: '/admin/afa-settings',             label: 'AFA Settings',      icon: Settings2 },
    { path: '/admin/transactions',             label: 'Transactions',      icon: TrendingUp },
    { path: '/admin/orders',                   label: 'Orders',            icon: Package },
    { path: '/admin/orders?scope=agent',       label: 'Agent Orders',      icon: Package },
    { path: '/admin/transactions?scope=agent', label: 'Agent Histories',   icon: TrendingUp },
    { path: '/admin/agent-stores',             label: 'Agent Stores',      icon: Store },
    { path: '/admin/commissions',              label: 'Agent Withdrawals', icon: HandCoins },
    { path: '/admin/agent-settings',           label: 'Agent Settings',    icon: Settings2 },
    { path: '/admin/referrals',                label: 'Referral Program',  icon: Gift },
    { path: '/admin/vtu-settings',             label: 'VTU Settings',      icon: Wallet },
    { path: '/admin/notifications',            label: 'Notifications',     icon: Bell },
    { path: '/admin/profile',                  label: 'Profile',           icon: User },
    { path: '/admin/platform-settings',        label: 'Platform Settings', icon: Globe },
  ];

  const primaryNav    = navItems.slice(0, 3);
  const operationsNav = navItems.slice(3, 10);
  const systemNav     = navItems.slice(10);

  const isActive = (path) => {
    const [targetPath, targetQuery = ''] = path.split('?');
    if (location.pathname !== targetPath) return false;
    if (!targetQuery) return location.search === '';
    return location.search.replace(/^\?/, '') === targetQuery;
  };

  const NavLink = ({ item, colorIdx }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    const c = getColor(colorIdx);
    return (
      <Link
        to={item.path}
        onClick={onClose}
        className={`asb-link ${active ? 'asb-link-active' : 'asb-link-inactive'}`}
        style={active ? { '--active-bg': c.main } : {}}
        onMouseEnter={e => {
          if (!active) e.currentTarget.style.borderColor = c.main + '44';
        }}
        onMouseLeave={e => {
          if (!active) e.currentTarget.style.borderColor = 'transparent';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: active ? c.main : c.soft,
            color: active ? '#fff' : c.main,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s, color 0.15s',
          }}>
            <Icon size={14} strokeWidth={active ? 2.5 : 2} />
          </div>
          <span>{item.label}</span>
        </div>
        {active && <ChevronRight size={13} style={{ color: c.main, flexShrink: 0 }} />}
      </Link>
    );
  };

  return (
    <>
      <style>{styles}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 30,
          transition: 'opacity 0.25s',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        className="lg:hidden"
      />

      {/* Sidebar */}
      <aside
        className={`asb-wrapper lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          height: '100vh',
          width: 264,
          zIndex: 40,
          background: '#fff',
          borderRight: '1.5px solid #e4e4de',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.28s ease',
          boxShadow: '4px 0 24px rgba(0,0,0,0.07)',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1.5px solid #e4e4de' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Icon box */}
              <div style={{
                width: 40, height: 40,
                background: '#1D4ED8',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
              }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: 0 }}>Admin Console</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Management</p>
              </div>
            </div>

            {/* Close button (mobile) */}
            <button
              onClick={onClose}
              className="lg:hidden"
              style={{
                background: '#f5f5f0', border: '1.5px solid #e4e4de',
                borderRadius: 7, padding: '6px 8px',
                cursor: 'pointer', color: '#888',
                display: 'flex', alignItems: 'center',
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="asb-nav" style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px' }}>

          <p className="asb-section-title">Overview</p>
          {primaryNav.map((item, idx) => <NavLink key={item.path} item={item} colorIdx={idx} />)}

          <p className="asb-section-title">Operations</p>
          {operationsNav.map((item, idx) => <NavLink key={item.path} item={item} colorIdx={idx + primaryNav.length} />)}

          <p className="asb-section-title">System</p>
          {systemNav.map((item, idx) => <NavLink key={item.path} item={item} colorIdx={idx + primaryNav.length + operationsNav.length} />)}

        </nav>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 16px 16px', borderTop: '1.5px solid #e4e4de' }}>
          <div style={{
            background: '#fafaf7',
            border: '1.5px solid #e4e4de',
            borderRadius: 8,
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32,
              background: '#1D4ED8',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
            }}>
              <Globe size={15} />
            </div>
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 800, color: '#111', margin: 0 }}>VJI DATA HUB</p>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>v1.0 Standard</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop spacer */}
      <div className="hidden lg:block" style={{ width: 264, flexShrink: 0 }} />
    </>
  );
}
