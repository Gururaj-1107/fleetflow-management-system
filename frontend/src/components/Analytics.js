import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, TrendingUp, Fuel, Wrench, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

const COLORS = ['#667eea', '#f5576c', '#fa709a', '#4facfe', '#43e97b', '#764ba2'];

export default function Analytics() {
  const { kpis, api } = useStore();
  const [exporting, setExporting] = useState(false);
  const k = kpis?.kpis || {};

  const costBreakdown = [
    { name: 'Fuel', value: kpis?.cost_breakdown?.fuel || 0 },
    { name: 'Maintenance', value: kpis?.cost_breakdown?.maintenance || 0 },
    { name: 'Other', value: kpis?.cost_breakdown?.other || 0 },
  ].filter(c => c.value > 0);

  const revenueData = Object.entries(kpis?.revenue_by_day || {}).map(([date, rev]) => ({
    date: date.slice(5),
    revenue: rev,
    expense: kpis?.expense_by_day?.[date] || 0,
  })).slice(-7);

  const vehicleROI = (kpis?.vehicle_roi || []).sort((a, b) => b.roi - a.roi);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/export/csv`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ff_token')}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'fleetflow_report.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported!');
    } catch (err) { toast.error('Export failed'); }
    setExporting(false);
  };

  return (
    <div className="space-y-4" data-testid="analytics-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-800">Operational Analytics</h1><p className="text-gray-500 text-sm">Financial reports & fleet insights</p></div>
        <button data-testid="export-csv-btn" onClick={handleExport} disabled={exporting} className="btn-primary">
          <Download size={18} /> {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${Number(k.total_revenue || 0).toLocaleString()}`, icon: DollarSign, cls: 'icon-gradient' },
          { label: 'Total Expenses', value: `$${Number(k.total_expenses || 0).toLocaleString()}`, icon: TrendingUp, cls: 'icon-gradient-danger' },
          { label: 'Fuel Efficiency', value: `${k.fuel_efficiency || 0} km/L`, icon: Fuel, cls: 'icon-gradient-success' },
          { label: 'Utilization', value: `${k.utilization || 0}%`, icon: BarChart3, cls: 'icon-gradient-warning' },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="glass-card p-5" data-testid={`analytics-kpi-${i}`}>
            <div className="flex items-center gap-3">
              <div className={kpi.cls} style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><kpi.icon size={18} className="text-white" /></div>
              <div><p className="text-xs text-gray-400">{kpi.label}</p><p className="text-lg font-bold text-gray-800">{kpi.value}</p></div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue vs Expenses */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card p-6" data-testid="revenue-expense-chart">
          <h3 className="font-semibold text-gray-800 mb-4">Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData.length ? revenueData : [{ date: '-', revenue: 0, expense: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)' }} />
              <Legend />
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#667eea" /><stop offset="100%" stopColor="#764ba2" /></linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5576c" /><stop offset="100%" stopColor="#f093fb" /></linearGradient>
              </defs>
              <Bar dataKey="revenue" fill="url(#revGrad)" radius={[6, 6, 0, 0]} name="Revenue" />
              <Bar dataKey="expense" fill="url(#expGrad)" radius={[6, 6, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Cost Breakdown Donut */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card p-6" data-testid="cost-breakdown-chart">
          <h3 className="font-semibold text-gray-800 mb-4">Cost Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={costBreakdown.length ? costBreakdown : [{ name: 'No data', value: 1 }]}
                cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                {costBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Vehicle ROI */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="glass-card p-6" data-testid="vehicle-roi-section">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-500" /> Vehicle ROI</h3>
        <div className="overflow-x-auto">
          <table className="glass-table">
            <thead><tr><th>Vehicle</th><th>Revenue</th><th>Costs</th><th>ROI</th><th>Performance</th></tr></thead>
            <tbody>
              {vehicleROI.length === 0 ? <tr><td colSpan={5} className="text-center text-gray-400 py-6">No data</td></tr> :
                vehicleROI.map((v, i) => (
                  <tr key={v.id} data-testid={`roi-row-${v.id}`}>
                    <td className="font-medium">{v.name}</td>
                    <td className="text-green-600 font-medium">${Number(v.revenue).toLocaleString()}</td>
                    <td className="text-red-500">${Number(v.cost).toLocaleString()}</td>
                    <td className={`font-bold ${v.roi >= 0 ? 'text-green-600' : 'text-red-500'}`}>{v.roi}%</td>
                    <td>
                      <div className="progress-bar-container" style={{ width: 100 }}>
                        <div className="progress-bar-fill" style={{ width: `${Math.min(Math.max(v.roi + 50, 0), 100)}%`, background: v.roi >= 0 ? 'linear-gradient(90deg, #43e97b, #38f9d7)' : 'linear-gradient(90deg, #f5576c, #f093fb)' }} />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
