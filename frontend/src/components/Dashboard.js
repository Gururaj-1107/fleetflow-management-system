import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, DollarSign, Activity, Users, Wrench, AlertTriangle, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';

function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const dur = 1200;
    const step = target / (dur / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(current);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{decimals > 0 ? display.toFixed(decimals) : Math.floor(display).toLocaleString()}{suffix}</span>;
}

const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
const cardAnim = { initial: { opacity: 0, y: 24, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } } };

export default function Dashboard() {
  const { kpis, trips, drivers, user } = useStore();
  const navigate = useNavigate();
  const k = kpis?.kpis || {};

  const revenueData = Object.entries(kpis?.revenue_by_day || {}).map(([date, rev]) => ({ date: date.slice(5), revenue: rev })).slice(-7);
  const activeTrips = (trips || []).filter(t => t.status === 'dispatched');
  const expiringSoon = (drivers || []).filter(d => {
    if (!d.license_expiry) return false;
    const exp = new Date(d.license_expiry);
    const diff = (exp - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff < 30;
  });

  return (
    <div className="space-y-4" data-testid="dashboard-page">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Command Center</h1>
          <p className="text-gray-500 text-sm">Real-time fleet overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={stagger} initial="initial" animate="animate">
        {[
          { label: 'Active Trips', value: k.active_trips, icon: MapPin, gradient: 'icon-gradient', color: 'text-indigo-600' },
          { label: 'Available Vehicles', value: k.available_vehicles, icon: Truck, gradient: 'icon-gradient-success', color: 'text-cyan-600', sub: `${k.total_vehicles || 0} total` },
          { label: 'Fleet Revenue', value: k.total_revenue, icon: DollarSign, gradient: 'icon-gradient', color: 'text-indigo-600', prefix: '$' },
          { label: 'Utilization', value: k.utilization, icon: Activity, gradient: 'icon-gradient-warning', color: 'text-amber-600', suffix: '%', decimals: 1 },
        ].map((kpi, i) => (
          <motion.div key={i} variants={cardAnim} className="glass-card glass-card-hover p-6" data-testid={`kpi-card-${i}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={kpi.gradient}><kpi.icon size={22} /></div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</span>
            </div>
            <div className={`text-3xl font-bold ${kpi.color} mb-1`}>
              <AnimatedCounter value={kpi.value} prefix={kpi.prefix || ''} suffix={kpi.suffix || ''} decimals={kpi.decimals || 0} />
            </div>
            {kpi.sub && <span className="text-xs text-gray-400">{kpi.sub}</span>}
            <div className="progress-bar-container mt-3">
              <div className="progress-bar-fill" style={{ width: `${Math.min((Number(kpi.value) / (kpi.suffix === '%' ? 100 : Math.max(Number(kpi.value), 1) * 1.5)) * 100, 100)}%` }} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card p-6 lg:col-span-2" data-testid="revenue-chart">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800">Fleet Revenue</h3>
            <span className="text-xs text-gray-400">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData.length ? revenueData : [{ date: 'No data', revenue: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
              <Bar dataKey="revenue" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Driver Alerts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card p-6" data-testid="driver-alerts">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} className="text-indigo-500" /> Driver Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50">
              <span className="text-sm text-gray-600">On Duty</span>
              <span className="font-bold text-indigo-600">{k.on_duty_drivers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span className="text-sm text-gray-600">Total Drivers</span>
              <span className="font-bold text-gray-800">{k.total_drivers || 0}</span>
            </div>
            {expiringSoon.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700">License Expiring</span>
                </div>
                {expiringSoon.slice(0, 2).map(d => (
                  <p key={d.id} className="text-xs text-amber-600 ml-5">{d.full_name} - {d.license_expiry}</p>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
              <span className="text-sm text-gray-600">In Shop</span>
              <span className="font-bold text-amber-600">{k.in_shop_vehicles || 0}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Live Trips */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="glass-card p-6" data-testid="live-trips-panel">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <MapPin size={18} className="text-indigo-500" /> Live Trips
          </h3>
          <button onClick={() => navigate('/trips')} className="text-sm text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1">
            View All <ArrowRight size={14} />
          </button>
        </div>
        {activeTrips.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">No active trips</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead>
                <tr><th>Vehicle</th><th>Driver</th><th>Route</th><th>Cargo</th><th>Revenue</th><th>Status</th></tr>
              </thead>
              <tbody>
                {activeTrips.slice(0, 5).map(t => (
                  <tr key={t.id} data-testid={`live-trip-${t.id}`}>
                    <td className="font-medium">{t.vehicles?.name || '-'}</td>
                    <td>{t.drivers?.full_name || '-'}</td>
                    <td className="text-sm">{t.origin} <ArrowRight size={12} className="inline mx-1 text-gray-300" /> {t.destination}</td>
                    <td>{t.cargo_weight?.toLocaleString()} kg</td>
                    <td className="font-semibold text-indigo-600">${t.revenue?.toLocaleString()}</td>
                    <td><span className="badge badge-dispatched">In Transit</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
