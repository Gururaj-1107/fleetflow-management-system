import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, DollarSign, Activity, Users, Wrench, AlertTriangle, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';

function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const target = Number(value) || 0;
  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    let start = 0;
    const dur = 1000;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * target);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);
  return <span data-testid="counter-value">{prefix}{decimals > 0 ? display.toFixed(decimals) : Math.floor(display).toLocaleString()}{suffix}</span>;
}

const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
const cardAnim = { 
  initial: { opacity: 0, y: 24, scale: 0.96 }, 
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } } 
};

// Custom tooltip for dark theme
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-indigo-500/20" style={{ minWidth: 120 }}>
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
            ${entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { kpis, trips, drivers, user } = useStore();
  const navigate = useNavigate();
  const k = kpis?.kpis || {};

  const revenueData = Object.entries(kpis?.revenue_by_day || {}).map(([date, rev]) => ({ 
    date: date.slice(5), 
    revenue: rev 
  })).slice(-7);
  
  const activeTrips = (trips || []).filter(t => t.status === 'dispatched');
  const expiringSoon = (drivers || []).filter(d => {
    if (!d.license_expiry) return false;
    const exp = new Date(d.license_expiry);
    const diff = (exp - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff < 30;
  });

  return (
    <div className="space-y-4" data-testid="dashboard-page">
      <motion.div 
        className="flex items-center justify-between mb-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Command Center
          </h1>
          <p className="text-gray-400 text-sm">Real-time fleet overview</p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" 
        variants={stagger} 
        initial="initial" 
        animate="animate"
      >
        {[
          { label: 'Active Trips', value: k.active_trips, icon: MapPin, gradient: 'icon-gradient', color: 'text-indigo-400' },
          { label: 'Available Vehicles', value: k.available_vehicles, icon: Truck, gradient: 'icon-gradient-success', color: 'text-cyan-400', sub: `${k.total_vehicles || 0} total` },
          { label: 'Fleet Revenue', value: k.total_revenue, icon: DollarSign, gradient: 'icon-gradient', color: 'text-indigo-400', prefix: '$' },
          { label: 'Utilization', value: k.utilization, icon: Activity, gradient: 'icon-gradient-warning', color: 'text-amber-400', suffix: '%', decimals: 1 },
        ].map((kpi, i) => (
          <motion.div 
            key={i} 
            variants={cardAnim} 
            className="glass-card glass-card-hover p-6" 
            data-testid={`kpi-card-${i}`}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-start justify-between mb-4">
              <motion.div 
                className={kpi.gradient}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <kpi.icon size={22} />
              </motion.div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</span>
            </div>
            <div className={`text-3xl font-bold ${kpi.color} mb-1`}>
              <AnimatedCounter value={kpi.value} prefix={kpi.prefix || ''} suffix={kpi.suffix || ''} decimals={kpi.decimals || 0} />
            </div>
            {kpi.sub && <span className="text-xs text-gray-500">{kpi.sub}</span>}
            <div className="progress-bar-container mt-3">
              <motion.div 
                className="progress-bar-fill" 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((Number(kpi.value) / (kpi.suffix === '%' ? 100 : Math.max(Number(kpi.value), 1) * 1.5)) * 100, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="glass-card p-6 lg:col-span-2" 
          data-testid="revenue-chart"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Fleet Revenue
            </h3>
            <span className="text-xs text-gray-500">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData.length ? revenueData : [{ date: 'No data', revenue: 0 }]}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#667eea" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#667eea" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,126,234,0.1)" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#6b6b80' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b6b80' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="url(#lineGradient)" 
                strokeWidth={3}
                fill="url(#revenueGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Driver Alerts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          className="glass-card p-6" 
          data-testid="driver-alerts"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users size={18} className="text-indigo-400" /> 
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Driver Status
            </span>
          </h3>
          <div className="space-y-3">
            <motion.div 
              className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(102, 126, 234, 0.15)' }}
            >
              <span className="text-sm text-gray-400">On Duty</span>
              <span className="font-bold text-indigo-400">{k.on_duty_drivers || 0}</span>
            </motion.div>
            <motion.div 
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <span className="text-sm text-gray-400">Total Drivers</span>
              <span className="font-bold">{k.total_drivers || 0}</span>
            </motion.div>
            {expiringSoon.length > 0 && (
              <motion.div 
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">License Expiring</span>
                </div>
                {expiringSoon.slice(0, 2).map(d => (
                  <p key={d.id} className="text-xs text-amber-300/80 ml-5">{d.full_name} - {d.license_expiry}</p>
                ))}
              </motion.div>
            )}
            <motion.div 
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <span className="text-sm text-gray-400">In Shop</span>
              <span className="font-bold text-amber-400">{k.in_shop_vehicles || 0}</span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Live Trips */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.5 }}
        className="glass-card p-6" 
        data-testid="live-trips-panel"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <MapPin size={18} className="text-indigo-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Live Trips
            </span>
            {activeTrips.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                {activeTrips.length} active
              </span>
            )}
          </h3>
          <motion.button 
            onClick={() => navigate('/trips')} 
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 group"
            whileHover={{ x: 3 }}
          >
            View All 
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
        {activeTrips.length === 0 ? (
          <div className="text-center py-10">
            <MapPin size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500 text-sm">No active trips</p>
            <p className="text-gray-600 text-xs mt-1">Dispatch a trip to see it here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Cargo</th>
                  <th>Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeTrips.slice(0, 5).map((t, i) => (
                  <motion.tr 
                    key={t.id} 
                    data-testid={`live-trip-${t.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <td className="font-medium">{t.vehicles?.name || '-'}</td>
                    <td>{t.drivers?.full_name || '-'}</td>
                    <td className="text-sm">
                      {t.origin} 
                      <ArrowRight size={12} className="inline mx-1 text-indigo-400" /> 
                      {t.destination}
                    </td>
                    <td>{t.cargo_weight?.toLocaleString()} kg</td>
                    <td className="font-semibold text-indigo-400">${t.revenue?.toLocaleString()}</td>
                    <td>
                      <span className="badge badge-dispatched">In Transit</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
