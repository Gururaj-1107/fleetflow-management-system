import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Truck, MapPin, Wrench, DollarSign, Users, BarChart3, LogOut, Menu, X, Bell, Clock } from 'lucide-react';
import useStore from '../store/useStore';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/vehicles', icon: Truck, label: 'Vehicles' },
  { path: '/trips', icon: MapPin, label: 'Trips' },
  { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
  { path: '/expenses', icon: DollarSign, label: 'Expenses' },
  { path: '/drivers', icon: Users, label: 'Drivers' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return <span className="text-sm text-gray-500 font-medium tabular-nums">{time.toLocaleTimeString()}</span>;
}

export default function Layout() {
  const { user, logout, fetchAll, initRealtime, dbReady, checkHealth } = useStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    checkHealth().then(h => {
      if (h.db_connected) { fetchAll(); }
    });
    const cleanup = initRealtime();
    return cleanup;
  }, [checkHealth, fetchAll, initRealtime]);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="mesh-bg flex h-screen overflow-hidden" data-testid="main-layout">
      {/* Sidebar */}
      <motion.aside data-testid="sidebar" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className={`glass-card hidden md:flex flex-col m-3 mr-0 ${collapsed ? 'w-[76px]' : 'w-[240px]'}`}
        style={{ transition: 'width 0.3s ease', zIndex: 10, borderRadius: 24 }}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-5 border-b border-black/5`}>
          <div className="icon-gradient" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }}>
            <Truck size={18} />
          </div>
          {!collapsed && <span className="font-bold text-lg text-gray-800 tracking-tight">FleetFlow</span>}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.end} data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-black/3'
              } ${collapsed ? 'justify-center px-3' : ''}`}>
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={isActive ? 'text-indigo-500' : ''} />
                  {!collapsed && <span>{item.label}</span>}
                  {isActive && !collapsed && <div className="ml-auto w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-black/5">
          {!collapsed && user && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-semibold text-gray-800">{user.full_name}</p>
              <span className={`badge badge-${user.role === 'manager' ? 'on_duty' : 'draft'} text-xs mt-1`}>{user.role}</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-black/3 w-full transition-all text-sm">
            <Menu size={18} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay md:hidden" style={{ zIndex: 40 }} onClick={() => setMobileOpen(false)}>
            <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} onClick={e => e.stopPropagation()}
              className="glass-card absolute left-0 top-0 bottom-0 w-[260px] m-2 flex flex-col" style={{ borderRadius: 24 }}>
              <div className="flex items-center gap-3 p-5 border-b border-black/5">
                <div className="icon-gradient" style={{ width: 36, height: 36, borderRadius: 10 }}><Truck size={18} /></div>
                <span className="font-bold text-lg text-gray-800">FleetFlow</span>
                <button onClick={() => setMobileOpen(false)} className="ml-auto text-gray-400"><X size={20} /></button>
              </div>
              <nav className="flex-1 p-3 space-y-1">
                {navItems.map(item => (
                  <NavLink key={item.path} to={item.path} end={item.end} onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600' : 'text-gray-500 hover:text-gray-800'
                    }`}>
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ zIndex: 1 }}>
        {/* Topbar */}
        <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="glass-card mx-3 mt-3 px-6 py-3 flex items-center justify-between" style={{ borderRadius: 20, minHeight: 56 }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden text-gray-500" data-testid="mobile-menu-btn" onClick={() => setMobileOpen(true)}><Menu size={22} /></button>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-gray-500 font-medium hidden sm:inline">System Online</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LiveClock />
            <button className="relative text-gray-400 hover:text-gray-600 transition-colors" data-testid="notification-bell">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                {user?.full_name?.[0] || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user?.full_name}</span>
            </div>
            <button data-testid="logout-btn" onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
          </div>
        </motion.header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-3" style={{ scrollBehavior: 'smooth' }}>
          {dbReady === false ? (
            <SetupBanner />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={window.location.pathname}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}

function SetupBanner() {
  const [schema, setSchema] = useState('');
  const [loading, setLoading] = useState(false);
  const API = process.env.REACT_APP_BACKEND_URL;

  const loadSchema = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/setup/schema`);
      const data = await res.json();
      setSchema(data.sql || 'Error loading schema');
    } catch { setSchema('Failed to load schema'); }
    setLoading(false);
  };

  return (
    <div className="glass-card p-8 max-w-2xl mx-auto mt-8" data-testid="setup-banner">
      <h2 className="text-2xl font-bold text-gray-800 mb-3">Database Setup Required</h2>
      <p className="text-gray-500 mb-4">Your Supabase database needs tables created. Click below to get the SQL schema, then paste it into your Supabase SQL Editor.</p>
      <div className="flex gap-3 mb-4">
        <button onClick={loadSchema} className="btn-primary" disabled={loading}>{loading ? 'Loading...' : 'Get SQL Schema'}</button>
        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="btn-secondary">Open Supabase Dashboard</a>
      </div>
      {schema && (
        <div className="mt-4">
          <textarea value={schema} readOnly className="w-full h-64 p-4 text-sm font-mono bg-gray-900 text-green-300 rounded-xl" />
          <button onClick={() => { navigator.clipboard.writeText(schema); }} className="btn-secondary mt-2">Copy to Clipboard</button>
        </div>
      )}
    </div>
  );
}
