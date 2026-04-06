import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  X,
  LayoutDashboard,
  Store,
  ShoppingBag,
  CreditCard,
  Wallet,
  LogOut,
  ChevronRight,
  ShieldCheck,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import upgradeService from '../services/upgradeService';
import { toast } from 'react-hot-toast';

export default function AgentSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, setUser, refreshUser } = useAuth();

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/agent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/agent/store', label: 'My Store', icon: Store },
    { path: '/agent/results-checker', label: 'Result Checker', icon: CreditCard },
    { path: '/agent/orders', label: 'Customer Orders', icon: ShoppingBag },
    { path: '/agent/wallet', label: 'My Wallet', icon: Wallet },
    { path: '/agent/commissions', label: 'My Earnings', icon: Wallet },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchToUser = async () => {
    try {
      const res = await upgradeService.switchRole('user');
      if (res.success) {
        toast.success('Switched to User Dashboard');
        // Update user state immediately with the full normalized user object from response
        if (res.user) {
          setUser(res.user);
        } else {
          setUser(prev => ({ ...prev, role: 'user' }));
        }
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Failed to switch role');
    }
  };

  return (
    <>
      {/* Overlay - Modern Blur */}
      <div
        className={`fixed top-16 inset-x-0 bottom-0 bg-slate-900/40 backdrop-blur-sm transition-opacity z-30 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      {/* Sidebar - Glassmorphism Aesthetic */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-64px)] w-72 bg-white border-r border-slate-200 z-50 transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="flex flex-col h-full bg-gradient-to-b from-white via-white to-slate-50/50">
          {/* Header/Branding - Optimized for fixed layout */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <ShieldCheck size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-none">Agent Account</h2>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Data Bundle Seller</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-hide">
            <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-3 mt-2">Main Menu</p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`group flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-300 ${active
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={`${active ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-700'} transition-colors`} />
                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                  </div>
                  {active && <ChevronRight size={14} className="text-white/40" />}
                </Link>
              );
            })}

            {/* Switch Role Button */}
            <button
              onClick={handleSwitchToUser}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-300 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 mt-4 border border-dashed border-slate-200 group"
            >
              <ArrowRightLeft size={18} className="text-slate-400 group-hover:text-indigo-600" />
              <span className="font-bold text-sm tracking-tight">User Dashboard</span>
            </button>
          </nav>

          {/* User Profile / Footer Section */}
          <div className="p-4 border-t border-slate-100 bg-white/50 backdrop-blur-md text-center">
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-100/50 mb-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                {user?.name?.slice(0, 2).toUpperCase() || 'AG'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Agent User'}</p>
                <p className="text-[9px] font-medium text-slate-600 truncate uppercase tracking-tighter">Verified Merchant</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-all duration-300"
            >
              <LogOut size={16} />
              Logout
            </button>
            <div className="mt-2 text-center">
              <span className="text-[9px] font-black italic text-slate-500 uppercase tracking-widest">
                VJI DATA HUB  Agent App
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Placeholder for desktop layout consistency */}
      <div className="hidden lg:block lg:w-72 flex-shrink-0" />
    </>
  );
}
