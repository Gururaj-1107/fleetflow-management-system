import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const API = process.env.REACT_APP_BACKEND_URL;

const useStore = create((set, get) => ({
  token: localStorage.getItem('ff_token'),
  user: JSON.parse(localStorage.getItem('ff_user') || 'null'),
  vehicles: [],
  drivers: [],
  trips: [],
  maintenance: [],
  expenses: [],
  kpis: null,
  loading: false,
  dbReady: null,

  api: async (path, options = {}) => {
    const token = get().token;
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...options.headers } });
    if (res.status === 401) { get().logout(); throw new Error('Unauthorized'); }
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Request failed'); }
    return res.json();
  },

  setAuth: (token, user) => {
    localStorage.setItem('ff_token', token);
    localStorage.setItem('ff_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('ff_token');
    localStorage.removeItem('ff_user');
    set({ token: null, user: null, vehicles: [], drivers: [], trips: [], maintenance: [], expenses: [], kpis: null });
  },

  checkHealth: async () => {
    try {
      const res = await fetch(`${API}/api/health`);
      const data = await res.json();
      set({ dbReady: data.db_connected });
      return data;
    } catch { set({ dbReady: false }); return { db_connected: false }; }
  },

  fetchVehicles: async () => {
    try { const res = await get().api('/api/vehicles'); set({ vehicles: res.data }); } catch {}
  },
  fetchDrivers: async () => {
    try { const res = await get().api('/api/drivers'); set({ drivers: res.data }); } catch {}
  },
  fetchTrips: async () => {
    try { const res = await get().api('/api/trips'); set({ trips: res.data }); } catch {}
  },
  fetchMaintenance: async () => {
    try { const res = await get().api('/api/maintenance'); set({ maintenance: res.data }); } catch {}
  },
  fetchExpenses: async () => {
    try { const res = await get().api('/api/expenses'); set({ expenses: res.data }); } catch {}
  },
  fetchKPIs: async () => {
    try { const res = await get().api('/api/analytics/summary'); set({ kpis: res }); } catch {}
  },

  fetchAll: async () => {
    set({ loading: true });
    await Promise.all([get().fetchVehicles(), get().fetchDrivers(), get().fetchTrips(), get().fetchMaintenance(), get().fetchExpenses(), get().fetchKPIs()]);
    set({ loading: false });
  },

  initRealtime: () => {
    const channel = supabase.channel('fleetflow-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => { get().fetchVehicles(); get().fetchKPIs(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => { get().fetchDrivers(); get().fetchKPIs(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => { get().fetchTrips(); get().fetchKPIs(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_logs' }, () => { get().fetchMaintenance(); get().fetchKPIs(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => { get().fetchExpenses(); get().fetchKPIs(); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  hasPermission: (action) => {
    const role = get().user?.role;
    const perms = {
      manager: ['vehicles_crud', 'trips_view', 'trips_manage', 'maintenance_crud', 'drivers_crud', 'analytics_full', 'expenses_crud'],
      dispatcher: ['vehicles_view', 'trips_crud', 'trips_manage', 'maintenance_view', 'drivers_assign', 'analytics_view', 'expenses_crud'],
      safety: ['vehicles_view', 'trips_view', 'maintenance_view', 'drivers_manage', 'analytics_limited'],
      analyst: ['vehicles_view', 'trips_view', 'maintenance_view', 'drivers_view', 'analytics_full'],
    };
    return (perms[role] || []).includes(action);
  },
}));

export default useStore;
