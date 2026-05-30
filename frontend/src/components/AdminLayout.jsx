import React from 'react';
import AdminSidebar from './AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';

export default function AdminLayout({ children }) {
  const { sidebarOpen, closeSidebar } = useSidebar();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f5f5f0' }}>
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
