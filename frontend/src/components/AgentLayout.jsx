import React from 'react';
import AgentSidebar from './AgentSidebar';
import { useSidebar } from '../hooks/useSidebar';
import Navbar from './Navbar';
import ContactFAB from './ContactFAB';

export default function AgentLayout({ children }) {
  const { sidebarOpen, closeSidebar } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <div className="flex min-w-0 max-w-full overflow-x-hidden">
        <AgentSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 min-w-0 max-w-full lg:ml-0 overflow-x-hidden">
          {children}
        </main>
      </div>
      <ContactFAB />
    </div>
  );
}
