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
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .asb-wrapper {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .asb-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
    margin-bottom: 2px;
  }
  .asb-link-active {
    background: #111;
    color: #fff;
  }
  .asb-link-inactive {
    color: #777;
  }
  .asb-link-inactive:hover {
    background: #f5f5f0;
    color: #111;
  }

  .asb-section-title {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #bbb;
    padding: 18px 12px 7px;
  }

  /* Scrollbar hide */
  .asb-nav::-webkit-scrollbar { display: none; }
  .asb-nav { -ms-overflow-style: none; scrollbar-width: none; }
`;

export default function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { settings } = useSettings();
  const vtuProvider = settings?.vtuProvider || 'topza';

  const offersNavItem = vtuProvider === 'digimall'
    ? { path: '/admin/digimall-plans', label: 'DigiMall Offers', icon: Tag }
    : vtuProvider === 'topza'
      ? { path: '/admin/topza-plans', label: 'Topza Offers', icon: Tag }
      : { path: '/admin/offers', label: 'Offers', icon: Tag };

  const navItems = [
    { path: '/admin',                          label: 'Dashboard',        icon: LayoutDashboard },
    { path: '/admin/users',                    label: 'Users',            icon: Users },
    offersNavItem,
    { path: '/admin/result-checkers',          label: 'Result Checkers',  icon: CreditCard },
    { path: '/admin/afa-settings',             label: 'AFA Settings',     icon: Settings2 },
    { path: '/admin/transactions',             label: 'Transactions',     icon: TrendingUp },
    { path: '/admin/orders',                   label: 'Orders',           icon: Package },
    { path: '/admin/orders?scope=agent',       label: 'Agent Orders',     icon: Package },
    { path: '/admin/transactions?scope=agent', label: 'Agent Histories',  icon: TrendingUp },
    { path: '/admin/agent-stores',             label: 'Agent Stores',     icon: Store },
    { path: '/admin/commissions',              label: 'Agent Withdrawals',icon: HandCoins },
    { path: '/admin/agent-settings',           label: 'Agent Settings',   icon: Settings2 },
    { path: '/admin/referrals',                label: 'Referral Program', icon: Gift },
    { path: '/admin/vtu-settings',             label: 'VTU Settings',     icon: Wallet },
    { path: '/admin/notifications',            label: 'Notifications',    icon: Bell },
    { path: '/admin/platform-settings',        label: 'Platform Settings',icon: Globe },
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

  const NavLink = ({ item }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={onClose}
        className={`asb-link ${active ? 'asb-link-active' : 'asb-link-inactive'}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon
            size={16}
            strokeWidth={active ? 2.5 : 2}
            style={{ color: active ? '#f0a500' : 'inherit', flexShrink: 0 }}
          />
          <span>{item.label}</span>
        </div>
        {active && <ChevronRight size={13} style={{ color: '#f0a500', flexShrink: 0 }} />}
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
          zIndex: 40,
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
          zIndex: 50,
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
                background: '#111',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#f0a500',
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
          {primaryNav.map((item) => <NavLink key={item.path} item={item} />)}

          <p className="asb-section-title">Operations</p>
          {operationsNav.map((item) => <NavLink key={item.path} item={item} />)}

          <p className="asb-section-title">System</p>
          {systemNav.map((item) => <NavLink key={item.path} item={item} />)}

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
              background: '#111',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#f0a500', flexShrink: 0,
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