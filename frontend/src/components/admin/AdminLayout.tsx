import React from 'react';
import {
  LayoutDashboard,
  Clock,
  Layers,
  Package,
  Cpu,
  Settings,
  BarChart2,
  LogOut,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useAdmin, type AdminTab } from '../../context/AdminContext';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminSessionsView } from './AdminSessionsView';
import { AdminTemplatesView } from './AdminTemplatesView';
import { AdminPackagesView } from './AdminPackagesView';
import { AdminDevicesView } from './AdminDevicesView';
import { AdminSettingsView } from './AdminSettingsView';
import { AdminReportsView } from './AdminReportsView';

export const AdminLayout: React.FC = () => {
  const {
    isAdminOpen,
    setIsAdminOpen,
    isAuthenticated,
    activeTab,
    setActiveTab,
    logout,
    adminUser
  } = useAdmin();

  if (!isAdminOpen || !isAuthenticated) return null;

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'sessions', label: 'Sessions', icon: <Clock className="w-5 h-5" /> },
    { id: 'templates', label: 'Templates', icon: <Layers className="w-5 h-5" /> },
    { id: 'packages', label: 'Packages', icon: <Package className="w-5 h-5" /> },
    { id: 'devices', label: 'Hardware', icon: <Cpu className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart2 className="w-5 h-5" /> }
  ];

  return (
    <div className="fixed inset-0 z-50 flex bg-cream-50 select-none animate-pop overflow-hidden">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-white border-r border-cream-200 p-5 flex flex-col justify-between shadow-soft">
        <div>
          {/* Logo & App */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-korean-charcoal text-white flex items-center justify-center shadow-touch">
              <Sparkles className="w-5 h-5 text-korean-butter" />
            </div>
            <div>
              <h2 className="text-base font-black text-korean-charcoal leading-none">
                HARU ADMIN
              </h2>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1 block">
                Kiosk Controller
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-korean-charcoal text-white shadow-touch'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-cream-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-2 pt-4 border-t border-cream-200">
          <button
            onClick={() => setIsAdminOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-cream-100 text-neutral-700 hover:bg-cream-200 text-xs font-bold cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Kiosk</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Tab View */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {activeTab === 'dashboard' && <AdminDashboardView />}
        {activeTab === 'sessions' && <AdminSessionsView />}
        {activeTab === 'templates' && <AdminTemplatesView />}
        {activeTab === 'packages' && <AdminPackagesView />}
        {activeTab === 'devices' && <AdminDevicesView />}
        {activeTab === 'settings' && <AdminSettingsView />}
        {activeTab === 'reports' && <AdminReportsView />}
      </main>
    </div>
  );
};
