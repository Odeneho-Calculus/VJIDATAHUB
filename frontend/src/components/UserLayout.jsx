import React from 'react';
import UserSidebar from './UserSidebar';
import { useSidebar } from '../hooks/useSidebar';

export default function UserLayout({ children }) {
  const { sidebarOpen, closeSidebar } = useSidebar();

  return (
    <div className="flex">
      <UserSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 flex flex-col min-h-screen w-0 overflow-x-hidden">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
