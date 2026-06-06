import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-parchment-texture">
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 0% 0%, rgba(212, 175, 55, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, rgba(74, 124, 89, 0.06) 0%, transparent 50%),
            linear-gradient(180deg, #2C1810 0%, #1a0f08 50%, #0d0704 100%)
          `
        }}
      />
      <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <Sidebar />
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden absolute top-4 left-4 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 rounded-lg bg-parchment-900/80 border border-bronze-700/40 flex items-center justify-center text-parchment-200 hover:text-bronze-300 hover:border-bronze-500/60 transition-all duration-200 backdrop-blur-sm"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <TopBar />

        <main className="flex-1 overflow-y-auto relative">
          <div className="min-h-full p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
