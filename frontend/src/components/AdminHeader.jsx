import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSidebar } from '../hooks/useSidebar';
import { Menu } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';

export default function AdminHeader() {
  const { user } = useAuth();
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition"
              aria-label="Toggle sidebar"
            >
              <Menu size={24} className="text-slate-900" />
            </button>
            <Link to="/admin" className="flex items-center gap-2 hover:opacity-80 transition flex-shrink-0">
              <div>
                <div className="font-black text-xl" style={{
                  color: '#2563eb',
                  textShadow: '0 2px 8px rgba(37, 99, 235, 0.25), 0 4px 12px rgba(37, 99, 235, 0.15)',
                  letterSpacing: '0.025em'
                }}>VJI DATA HUB </div>
                <div className="text-xs text-slate-600 font-semibold">ADMIN</div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user && <ProfileDropdown />}
          </div>
        </div>
      </div>
    </nav>
  );
}
