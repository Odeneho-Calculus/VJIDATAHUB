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
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-blue-600 to-purple-600">
          {initials}
        </div>
        <span className="text-sm font-medium hidden sm:inline text-slate-900">
          {firstName}
        </span>
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed w-56 rounded-2xl shadow-xl z-[3000] bg-white border-2 border-slate-200 overflow-hidden pointer-events-auto"
          style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b-2 border-slate-200">
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-600">{user.email}</p>
            {isAdmin && (
              <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-lg bg-blue-100 text-blue-700">👑 Admin</span>
            )}
            {isAgent && (
              <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-lg bg-indigo-100 text-indigo-700">🇬🇭 Agent Seller</span>
            )}
          </div>

          <nav className="py-2">
            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setIsOpen(false)}
                >
                  <LayoutDashboard size={16} />
                  Admin Dashboard
                </Link>
              </>
            ) : isAgent ? (
              <>
                <Link
                  to="/agent/dashboard"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setIsOpen(false)}
                >
                  <LayoutDashboard size={16} />
                  My Dashboard
                </Link>
                <Link
                  to="/agent/store"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setIsOpen(false)}
                >
                  <Store size={16} />
                  My Store
                </Link>
                <Link
                  to="/agent/commissions"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setIsOpen(false)}
                >
                  <Wallet size={16} />
                  My Earnings
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setIsOpen(false)}
                >
                  <User size={16} />
                  Profile
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setIsOpen(false)}
                >
                  <User size={16} />
                  Profile
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setIsOpen(false)}
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
              </>
            )}
          </nav>

          <div className="py-2 border-t-2 border-slate-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
