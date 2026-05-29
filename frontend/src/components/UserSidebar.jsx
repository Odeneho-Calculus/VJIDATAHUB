import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  X,
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Package,
  TrendingUp,
  Wallet,
  User,
  LogOut,
  ChevronRight,
  ShieldCheck,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import upgradeService from '../services/upgradeService';
import { toast } from 'react-hot-toast';

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

  .usb-wrapper {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .usb-link {
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
  .usb-link-active {
    background: var(--active-bg, #111);
    color: #fff;
  }
  .usb-link-inactive {
    color: #374151;
  }
  .usb-link-inactive:hover {
    background: #f5f5f0;
    color: #111;
  }

  .usb-switch-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 7px;
    border: 1.5px dashed #e0e0d8;
    background: none;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    margin-top: 4px;
  }
  .usb-switch-btn:hover { background: #f5f5f0; color: #111; border-color: #6b7280; }

  .usb-logout-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    border-radius: 7px;
    border: 1.5px solid #fecaca;
    background: #fff5f5;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    color: #b91c1c;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .usb-logout-btn:hover { background: #fee2e2; border-color: #fca5a5; }

  .usb-section-title {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #6b7280;
    padding: 18px 12px 7px;
  }

  .usb-nav::-webkit-scrollbar { display: none; }
  .usb-nav { -ms-overflow-style: none; scrollbar-width: none; }
`;

export default function UserSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, setUser } = useAuth();
  const { settings } = useSettings();
  const recruitNewAgents = settings?.recruitNewAgents !== false;

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/dashboard',       label: 'Dashboard',           icon: LayoutDashboard },
    { path: '/buy-data',        label: 'Buy Data',            icon: ShoppingCart },
    { path: '/results-checker', label: 'Result Checker',      icon: CreditCard },
    { path: '/afa-registration',label: 'AFA Registration',    icon: ShieldCheck },
    { path: '/orders',          label: 'My Orders',           icon: Package },
    { path: '/transactions',    label: 'Transaction History', icon: TrendingUp },
    { path: '/topup',           label: 'Wallet',              icon: Wallet },
    { path: '/profile',         label: 'Profile',             icon: User },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchToAgent = async () => {
    try {
      const res = await upgradeService.switchRole('agent');
      if (res.success) {
        toast.success('Switched to Agent Dashboard');
        if (res.user) setUser(res.user);
        else setUser(prev => ({ ...prev, role: 'agent' }));
        navigate('/agent/dashboard');
      }
    } catch {
      toast.error('Failed to switch role');
    }
  };

  const canSwitchToAgent =
    user?.agentFeeStatus === 'paid' ||
    user?.agentFeeStatus === 'protocol' ||
    user?.role === 'agent';

  return (
    <>
      <style>{styles}</style>

      {/* Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`usb-wrapper fixed top-0 left-0 h-screen z-50 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          width: 264,
          background: '#fff',
          borderRight: '1.5px solid #e4e4de',
          boxShadow: '4px 0 24px rgba(0,0,0,0.07)',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '20px', borderBottom: '1.5px solid #e4e4de', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, background: '#7C3AED', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: 0 }}>User Account</p>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Personal Hub</p>
            </div>
          </div>
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

        {/* ── Navigation ── */}
        <nav className="usb-nav" style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px' }}>
          <p className="usb-section-title">Main Menu</p>

          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const c = getColor(idx);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`usb-link ${active ? 'usb-link-active' : 'usb-link-inactive'}`}
                style={active ? { '--active-bg': c.main } : { borderColor: 'transparent' }}
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
          })}

          <p className="usb-section-title">Account Upgrades</p>

          {canSwitchToAgent ? (
            <button onClick={handleSwitchToAgent} className="usb-switch-btn">
              <ArrowRightLeft size={15} style={{ flexShrink: 0 }} />
              Switch to Agent
            </button>
          ) : recruitNewAgents ? (
            <Link
              to="/become-agent"
              onClick={onClose}
              className={`usb-link ${isActive('/become-agent') ? 'usb-link-active' : 'usb-link-inactive'}`}
              style={{ border: '1.5px dashed #e0e0d8', marginTop: 4 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: isActive('/become-agent') ? '#7C3AED' : '#F5F3FF',
                  color: isActive('/become-agent') ? '#fff' : '#7C3AED',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ShieldCheck size={14} />
                </div>
                <span>Become an Agent</span>
              </div>
              <ChevronRight size={13} style={{ color: isActive('/become-agent') ? '#7C3AED' : '#ccc', flexShrink: 0 }} />
            </Link>
          ) : null}
        </nav>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 16px 16px', borderTop: '1.5px solid #e4e4de' }}>
          {/* User card */}
          <div style={{
            background: '#fafaf7', border: '1.5px solid #e4e4de',
            borderRadius: 8, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 6,
              background: '#7C3AED', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 12, flexShrink: 0,
            }}>
              {user?.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'User'}
              </p>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Verified Member
              </p>
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} className="usb-logout-btn">
            <LogOut size={15} />
            Sign Out
          </button>

          <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 10 }}>
            VJI DATA HUB · User App
          </p>
        </div>
      </aside>

      {/* Desktop spacer */}
      <div className="hidden lg:block flex-shrink-0" style={{ width: 264 }} />
    </>
  );
}
