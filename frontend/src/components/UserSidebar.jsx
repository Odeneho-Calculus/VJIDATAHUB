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

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  .usb-wrapper {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .usb-link {
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
  .usb-link-active   { background: #111; color: #fff; }
  .usb-link-inactive { color: #777; }
  .usb-link-inactive:hover { background: #f5f5f0; color: #111; }

  .usb-switch-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 7px;
    border: 1.5px dashed #e0e0d8;
    background: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #777;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    margin-top: 4px;
  }
  .usb-switch-btn:hover { background: #f5f5f0; color: #111; border-color: #bbb; }

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
    font-size: 13px;
    font-weight: 700;
    color: #b91c1c;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .usb-logout-btn:hover { background: #fee2e2; border-color: #fca5a5; }

  .usb-section-title {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #bbb;
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
    { path: '/dashboard',      label: 'Dashboard',           icon: LayoutDashboard },
    { path: '/buy-data',       label: 'Buy Data',            icon: ShoppingCart },
    { path: '/results-checker',label: 'Result Checker',      icon: CreditCard },
    { path: '/orders',         label: 'My Orders',           icon: Package },
    { path: '/transactions',   label: 'Transaction History', icon: TrendingUp },
    { path: '/topup',          label: 'Wallet',              icon: Wallet },
    { path: '/profile',        label: 'Profile',             icon: User },
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
              width: 40, height: 40, background: '#111', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#f0a500', flexShrink: 0,
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

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`usb-link ${active ? 'usb-link-active' : 'usb-link-inactive'}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} style={{ color: active ? '#f0a500' : 'inherit', flexShrink: 0 }} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight size={13} style={{ color: '#f0a500', flexShrink: 0 }} />}
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
                <ShieldCheck size={16} style={{ color: isActive('/become-agent') ? '#f0a500' : '#aaa', flexShrink: 0 }} />
                <span>Become an Agent</span>
              </div>
              <ChevronRight size={13} style={{ color: isActive('/become-agent') ? '#f0a500' : '#ccc', flexShrink: 0 }} />
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
              background: '#111', color: '#f0a500',
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