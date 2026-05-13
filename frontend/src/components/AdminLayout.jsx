import React from 'react';
import AdminSidebar from './AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';

export default function AdminLayout({ children }) {
  const { sidebarOpen, closeSidebar } = useSidebar();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}