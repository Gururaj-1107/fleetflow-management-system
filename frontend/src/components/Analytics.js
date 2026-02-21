import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, TrendingUp, Fuel, Wrench, DollarSign, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, Area, AreaChart } from 'recharts';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

// Enhanced color palette for dark mode
const COLORS = ['#667eea', '#4facfe', '#43e97b', '#fa709a', '#f093fb', '#fee140'];
const GRADIENT_COLORS = [
  { start: '#667eea', end: '#764ba2' },
  { start: '#f5576c', end: '#f093fb' },
  { start: '#4facfe', end: '#00f2fe' },
  { start: '#43e97b', end: '#38f9d7' },
];

// Custom tooltip for dark theme
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-indigo-500/20" style={{ minWidth: 140 }}>
        <p className="text-xs text-gray-400 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-xs text-gray-400">{entry.name}:</span>
            <span className="text-sm font-semibold" style={{ color: entry.color }}>
              ${entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom legend for pie chart
const CustomLegend = ({ payload }) => (
  <div className="flex flex-wrap justify-center gap-4 mt-4">
    {payload.map((entry, index) => (
      <div key={index} className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: entry.color }} />
        <span className="text-xs text-gray-400">{entry.value}</span>
      </div>
    ))}
  </div>
);

export default function Analytics() {
  const { kpis, api } = useStore();
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState(null);
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

  const handleExport = async (type) => {
    setExporting(true);
    setExportType(type);
    try {
      if (type === 'csv') {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/export/csv`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('ff_token')}` }
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; 
        a.download = 'fleetflow_report.csv'; 
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV report exported!');
      } else if (type === 'pdf') {
        // PDF export - generate client-side report
        const reportContent = generatePDFContent();
        const blob = new Blob([reportContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fleetflow_report.html';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report exported! Open in browser and print to PDF.');
      }
    } catch (err) { 
      toast.error('Export failed'); 
    }
    setExporting(false);
    setExportType(null);
  };

  const generatePDFContent = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>FleetFlow Analytics Report</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f5f7ff; }
    h1 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
    h2 { color: #764ba2; margin-top: 30px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
    .kpi-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .kpi-value { font-size: 28px; font-weight: bold; color: #667eea; }
    .kpi-label { color: #6b7280; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #667eea; color: white; }
    tr:nth-child(even) { background: #f9fafb; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <h1>FleetFlow Analytics Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  <h2>Key Performance Indicators</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-value">$${Number(k.total_revenue || 0).toLocaleString()}</div>
      <div class="kpi-label">Total Revenue</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">$${Number(k.total_expenses || 0).toLocaleString()}</div>
      <div class="kpi-label">Total Expenses</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${k.fuel_efficiency || 0} km/L</div>
      <div class="kpi-label">Fuel Efficiency</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${k.utilization || 0}%</div>
      <div class="kpi-label">Fleet Utilization</div>
    </div>
  </div>
  
  <h2>Vehicle ROI Performance</h2>
  <table>
    <thead>
      <tr><th>Vehicle</th><th>Revenue</th><th>Costs</th><th>ROI</th></tr>
    </thead>
    <tbody>
      ${vehicleROI.map(v => `
        <tr>
          <td>${v.name}</td>
          <td class="positive">$${Number(v.revenue).toLocaleString()}</td>
          <td class="negative">$${Number(v.cost).toLocaleString()}</td>
          <td class="${v.roi >= 0 ? 'positive' : 'negative'}">${v.roi}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <h2>Cost Breakdown</h2>
  <table>
    <thead><tr><th>Category</th><th>Amount</th></tr></thead>
    <tbody>
      <tr><td>Fuel</td><td>$${Number(kpis?.cost_breakdown?.fuel || 0).toLocaleString()}</td></tr>
      <tr><td>Maintenance</td><td>$${Number(kpis?.cost_breakdown?.maintenance || 0).toLocaleString()}</td></tr>
      <tr><td>Other</td><td>$${Number(kpis?.cost_breakdown?.other || 0).toLocaleString()}</td></tr>
    </tbody>
  </table>
  
  <div class="footer">
    <p>This report was generated by FleetFlow - Enterprise Fleet Management</p>
  </div>
</body>
</html>
    `;
  };

  return (
    <div className="space-y-4" data-testid="analytics-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Operational Analytics
          </h1>
          <p className="text-gray-400 text-sm">Financial reports & fleet insights</p>
        </motion.div>
        <div className="flex gap-2">
          <motion.button 
            data-testid="export-csv-btn" 
            onClick={() => handleExport('csv')} 
            disabled={exporting} 
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download size={18} /> 
            {exporting && exportType === 'csv' ? 'Exporting...' : 'Export CSV'}
          </motion.button>
          <motion.button 
            data-testid="export-pdf-btn" 
            onClick={() => handleExport('pdf')} 
            disabled={exporting} 
            className="btn-secondary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileText size={18} /> 
            {exporting && exportType === 'pdf' ? 'Exporting...' : 'Export PDF'}
          </motion.button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${Number(k.total_revenue || 0).toLocaleString()}`, icon: DollarSign, cls: 'icon-gradient' },
          { label: 'Total Expenses', value: `$${Number(k.total_expenses || 0).toLocaleString()}`, icon: TrendingUp, cls: 'icon-gradient-danger' },
          { label: 'Fuel Efficiency', value: `${k.fuel_efficiency || 0} km/L`, icon: Fuel, cls: 'icon-gradient-success' },
          { label: 'Utilization', value: `${k.utilization || 0}%`, icon: BarChart3, cls: 'icon-gradient-warning' },
        ].map((kpi, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 16 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.08 }}
            className="glass-card glass-card-hover p-5" 
            data-testid={`analytics-kpi-${i}`}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-center gap-3">
              <motion.div 
                className={kpi.cls} 
                style={{ width: 42, height: 42, borderRadius: 12 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <kpi.icon size={18} className="text-white" />
              </motion.div>
              <div>
                <p className="text-xs text-gray-400">{kpi.label}</p>
                <p className="text-lg font-bold">{kpi.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue vs Expenses */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="glass-card p-6" 
          data-testid="revenue-expense-chart"
        >
          <h3 className="font-semibold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Revenue vs Expenses
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData.length ? revenueData : [{ date: '-', revenue: 0, expense: 0 }]}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#667eea" stopOpacity={1} />
                  <stop offset="100%" stopColor="#764ba2" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5576c" stopOpacity={1} />
                  <stop offset="100%" stopColor="#f093fb" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,126,234,0.1)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => <span className="text-gray-400 text-xs">{value}</span>}
              />
              <Bar dataKey="revenue" fill="url(#revGrad)" radius={[6, 6, 0, 0]} name="Revenue" />
              <Bar dataKey="expense" fill="url(#expGrad)" radius={[6, 6, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Cost Breakdown Donut */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          className="glass-card p-6" 
          data-testid="cost-breakdown-chart"
        >
          <h3 className="font-semibold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Cost Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <defs>
                {COLORS.map((color, i) => (
                  <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                  </linearGradient>
                ))}
              </defs>
              <Pie 
                data={costBreakdown.length ? costBreakdown : [{ name: 'No data', value: 1 }]}
                cx="50%" 
                cy="50%" 
                innerRadius={60} 
                outerRadius={90} 
                paddingAngle={5} 
                dataKey="value"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth={2}
              >
                {costBreakdown.map((_, i) => (
                  <Cell key={i} fill={`url(#pieGrad${i})`} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(18, 18, 35, 0.95)', 
                  border: '1px solid rgba(102, 126, 234, 0.2)', 
                  borderRadius: 16 
                }}
                formatter={(value) => [`$${value.toLocaleString()}`, '']}
              />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Vehicle ROI */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.5 }}
        className="glass-card p-6" 
        data-testid="vehicle-roi-section"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-400" /> 
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Vehicle ROI
          </span>
        </h3>
        <div className="overflow-x-auto">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Revenue</th>
                <th>Costs</th>
                <th>ROI</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {vehicleROI.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-8">
                    <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                    No ROI data available
                  </td>
                </tr>
              ) : (
                vehicleROI.map((v, i) => (
                  <motion.tr 
                    key={v.id} 
                    data-testid={`roi-row-${v.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <td className="font-medium">{v.name}</td>
                    <td className="text-green-400 font-medium">${Number(v.revenue).toLocaleString()}</td>
                    <td className="text-red-400">${Number(v.cost).toLocaleString()}</td>
                    <td className={`font-bold ${v.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{v.roi}%</td>
                    <td>
                      <div className="progress-bar-container" style={{ width: 100 }}>
                        <motion.div 
                          className="progress-bar-fill" 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(Math.max(v.roi + 50, 0), 100)}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          style={{ 
                            background: v.roi >= 0 
                              ? 'linear-gradient(90deg, #43e97b, #38f9d7)' 
                              : 'linear-gradient(90deg, #f5576c, #f093fb)' 
                          }} 
                        />
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
