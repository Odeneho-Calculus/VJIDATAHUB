import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSidebar } from '../hooks/useSidebar';
import { Menu, X } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';

export default function Navbar() {
  const { user } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const showSidebarToggle = user && !['/'].includes(location.pathname) && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/register');
  const isAgentPage = location.pathname.startsWith('/agent');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="sticky top-0 z-[1000] app-pro-header app-pro-header-strong w-full max-w-full overflow-x-hidden">
      <div className="px-4 sm:px-6 lg:px-8 w-full max-w-full">
        <div className="flex justify-between items-center h-16 min-w-0">
          <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
            {showSidebarToggle && (
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2.5 hover:bg-slate-100/90 rounded-xl border border-slate-200/70 shadow-sm transition"
                aria-label="Toggle sidebar"
              >
                <Menu size={24} className="text-slate-900" />
              </button>
            )}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition flex-shrink-0 min-w-0">
              <div className="font-bold text-lg" style={{
                color: '#2563eb',
                textShadow: '0 2px 8px rgba(37, 99, 235, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)',
                letterSpacing: '0.025em'
              }}>
                VJI DATA HUB 
              </div>
              <span className="hidden md:inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                Trusted VTU
              </span>
            </Link>
          </div>

          <div className="flex-1 min-w-0" />

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <ProfileDropdown />
              </>
            ) : (
              <>
                <div className="hidden sm:flex gap-2">
                  <Link to="/login" className="px-4 py-2 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition border border-slate-200/80 shadow-sm">
                    Login
                  </Link>
                  <Link to="/register" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-100 transition">
                    Sign up
                  </Link>
                </div>

                <button
                  onClick={toggleMenu}
                  className="sm:hidden p-2.5 hover:bg-slate-100 rounded-xl border border-slate-200/70 shadow-sm transition"
                  aria-label="Toggle menu"
                >
                  {isMenuOpen ? <X size={20} className="text-slate-900" /> : <Menu size={20} className="text-slate-900" />}
                </button>
              </>
            )}
          </div>
        </div>

        {isMenuOpen && !user && (
          <div className="sm:hidden border-t border-slate-200/70 bg-white/95 backdrop-blur">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/login"
                className="block px-3 py-2 rounded-md text-sm text-slate-900 hover:bg-slate-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="block px-3 py-2 rounded-md text-sm text-slate-900 hover:bg-slate-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
