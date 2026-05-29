import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User, LayoutDashboard, Store, Wallet } from 'lucide-react';

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const updateMenuPosition = () => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const menuWidth = 224;
    const viewportPadding = 8;
    const nextLeft = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding
    );

    setMenuPos({
      top: rect.bottom + 8,
      left: nextLeft,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedTriggerArea = dropdownRef.current?.contains(event.target);
      const clickedMenuArea = menuRef.current?.contains(event.target);

      if (!clickedTriggerArea && !clickedMenuArea) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  if (!user) return null;

  const initials = (user.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const firstName = (user.name || 'User').split(' ')[0];
  const isAdmin = user.role === 'admin';
  const isAgent = user.role === 'agent';

  const toggleDropdown = (event) => {
    event.stopPropagation();
    if (!isOpen) {
      updateMenuPosition();
      setIsOpen(true);
      return;
    }
    setIsOpen(false);
  };

  return (
    <div className="relative z-[1000]" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        className="flex items-center gap-3 px-3.5 py-2 rounded-2xl hover:bg-[#fafaf7] border-1.5 border-transparent hover:border-[#e4e4de] transition-all duration-300"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black bg-gradient-to-br from-[#111] to-[#444] shadow-lg shadow-black/10">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col items-start leading-none">
          <span className="text-[13px] font-black text-[#111]">
            {firstName}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Account</span>
        </div>
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed w-64 rounded-[28px] shadow-2xl z-[3000] bg-white border-1.5 border-[#e4e4de] overflow-hidden pointer-events-auto animate-in zoom-in-95 fade-in duration-200"
          style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-5 border-b border-[#f5f5f0] bg-[#fafaf7]">
            <p className="text-sm font-black text-[#111] tracking-tight">{user.name}</p>
            <p className="text-[11px] font-bold text-slate-400 truncate">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {isAdmin && (
                <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-blue-50 text-blue-600 border border-blue-100 uppercase">👑 Admin</span>
              )}
              {isAgent && (
                <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">🇬🇭 Agent</span>
              )}
            </div>
          </div>

          <nav className="p-3">
            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 hover:text-[#111] hover:bg-[#fafaf7] rounded-xl transition-all group"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-[#e4e4de] transition-all">
                    <LayoutDashboard size={14} />
                  </div>
                  Admin Dashboard
                </Link>
              </>
            ) : isAgent ? (
              <>
                <Link
                  to="/agent/dashboard"
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 hover:text-[#111] hover:bg-[#fafaf7] rounded-xl transition-all group"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-[#e4e4de] transition-all">
                    <LayoutDashboard size={14} />
                  </div>
                  Dashboard
                </Link>
                <Link
                  to="/agent/store"
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 hover:text-[#111] hover:bg-[#fafaf7] rounded-xl transition-all group"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-[#e4e4de] transition-all">
                    <Store size={14} />
                  </div>
                  My Store
                </Link>
                <Link
                  to="/agent/commissions"
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 hover:text-[#111] hover:bg-[#fafaf7] rounded-xl transition-all group"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-[#e4e4de] transition-all">
                    <Wallet size={14} />
                  </div>
                  My Earnings
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 hover:text-[#111] hover:bg-[#fafaf7] rounded-xl transition-all group"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-[#e4e4de] transition-all">
                    <User size={14} />
                  </div>
                  Profile
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 hover:text-[#111] hover:bg-[#fafaf7] rounded-xl transition-all group"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-[#e4e4de] transition-all">
                    <User size={14} />
                  </div>
                  Profile Center
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 hover:text-[#111] hover:bg-[#fafaf7] rounded-xl transition-all group"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-[#e4e4de] transition-all">
                    <LayoutDashboard size={14} />
                  </div>
                  User Console
                </Link>
              </>
            )}
          </nav>

          <div className="p-3 border-t border-[#f5f5f0]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-rose-600 hover:bg-rose-50 rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-100/50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-rose-200 transition-all">
                <LogOut size={14} />
              </div>
              Sign Out
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
