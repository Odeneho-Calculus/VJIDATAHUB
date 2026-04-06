import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  ShoppingCart,
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

export default function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { settings } = useSettings();
  const vtuProvider = settings?.vtuProvider || 'xpresdata';

  const offersNavItem = vtuProvider === 'digimall'
    ? { path: '/admin/digimall-plans', label: 'DigiMall Offers', icon: Tag }
    : vtuProvider === 'topza'
      ? { path: '/admin/topza-plans', label: 'Topza Offers', icon: Tag }
      : { path: '/admin/offers', label: 'Offers', icon: Tag };

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Users', icon: Users },
    offersNavItem,
    { path: '/admin/result-checkers', label: 'Result Checkers', icon: CreditCard },
    { path: '/admin/transactions', label: 'Transactions', icon: TrendingUp },
    { path: '/admin/orders', label: 'Orders', icon: Package },
    { path: '/admin/orders?scope=agent', label: 'Agent Orders', icon: Package },
    { path: '/admin/transactions?scope=agent', label: 'Agent Histories', icon: TrendingUp },
    { path: '/admin/agent-stores', label: 'Agent Stores', icon: Store },
    { path: '/admin/commissions', label: 'Agent Withdrawals', icon: HandCoins },
    { path: '/admin/agent-settings', label: 'Agent Settings', icon: Settings2 },
    { path: '/admin/referrals', label: 'Referral Program', icon: Gift },
    { path: '/admin/purchases', label: 'Purchases', icon: ShoppingCart },
    { path: '/admin/vtu-settings', label: 'VTU Settings', icon: Wallet },
    { path: '/admin/notifications', label: 'Notifications', icon: Bell },
    { path: '/admin/platform-settings', label: 'Platform Settings', icon: Globe },
  ];

  const primaryNav = navItems.slice(0, 3);
  const operationsNav = navItems.slice(3, 10);
  const settingsNav = navItems.slice(10);

  const isActive = (path) => {
    const [targetPath, targetQuery = ''] = path.split('?');
    if (location.pathname !== targetPath) return false;

    if (!targetQuery) {
      return location.search === '';
    }

    return location.search.replace(/^\?/, '') === targetQuery;
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-16 left-0 lg:top-16 h-[calc(100vh-64px)] w-72 z-50 transition-transform duration-300 bg-white border-r border-slate-200 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="h-full flex flex-col bg-slate-50/40">
          <div className="px-4 py-4 border-b border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 truncate">Admin Workspace</h2>
                  <p className="text-[11px] text-slate-500 truncate">Platform control center</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition text-slate-600"
                aria-label="Close admin sidebar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-5 overflow-y-auto scrollbar-hide">
            <div>
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Overview</p>
              <div className="space-y-1.5">
                {primaryNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => onClose()}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 ${active
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={17} className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'} flex-shrink-0`} />
                        <span className="font-medium text-sm truncate">{item.label}</span>
                      </div>
                      {active && <ChevronRight size={14} className="text-white/70 flex-shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Operations</p>
              <div className="space-y-1.5">
                {operationsNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => onClose()}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 ${active
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={17} className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'} flex-shrink-0`} />
                        <span className="font-medium text-sm truncate">{item.label}</span>
                      </div>
                      {active && <ChevronRight size={14} className="text-white/70 flex-shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Settings</p>
              <div className="space-y-1.5">
                {settingsNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => onClose()}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 ${active
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={17} className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'} flex-shrink-0`} />
                        <span className="font-medium text-sm truncate">{item.label}</span>
                      </div>
                      {active && <ChevronRight size={14} className="text-white/70 flex-shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-200 bg-white">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-slate-700">Admin Dashboard</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Version 1.0</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="hidden lg:block lg:w-72 flex-shrink-0" />
    </>
  );
}
