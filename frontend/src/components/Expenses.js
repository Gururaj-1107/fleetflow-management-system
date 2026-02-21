import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Plus, Fuel, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

export default function Expenses() {
  const { expenses, vehicles, trips, api, user, fetchExpenses, fetchVehicles, fetchTrips } = useStore();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const canManage = ['manager', 'dispatcher'].includes(user?.role);

  React.useEffect(() => {
    if (!expenses || expenses.length === 0) fetchExpenses();
    if (!vehicles || vehicles.length === 0) fetchVehicles();
    if (!trips || trips.length === 0) fetchTrips();
  }, []);

  const totalFuel = (expenses || []).reduce((sum, e) => sum + (Number(e.fuel_cost) || 0), 0);
  const totalOther = (expenses || []).reduce((sum, e) => sum + (Number(e.other_cost) || 0), 0);
  const totalLiters = (expenses || []).reduce((sum, e) => sum + (Number(e.fuel_liters) || 0), 0);

  const openAdd = () => {
    setForm({ vehicle_id: '', trip_id: '', fuel_liters: '', fuel_cost: '', other_cost: '' });
    setModal(true);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api('/api/expenses', { method: 'POST', body: JSON.stringify({ ...form, fuel_liters: Number(form.fuel_liters || 0), fuel_cost: Number(form.fuel_cost || 0), other_cost: Number(form.other_cost || 0) }) });
      toast.success('Expense logged');
      setModal(false);
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4" data-testid="expenses-page">
      <motion.div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Expense & Fuel Logging</h1>
          <p className="text-gray-400 text-sm">Financial tracking per asset</p>
        </div>
        {canManage && (
          <motion.button 
            data-testid="add-expense-btn" 
            onClick={openAdd} 
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} /> Log Expense
          </motion.button>
        )}
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Fuel Cost', value: totalFuel, icon: Fuel, cls: 'icon-gradient' },
          { label: 'Other Expenses', value: totalOther, icon: DollarSign, cls: 'icon-gradient-warning' },
          { label: 'Total Fuel (L)', value: totalLiters, icon: Fuel, cls: 'icon-gradient-success', noPrefix: true },
        ].map((s, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 16 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
            className="glass-card glass-card-hover p-5" 
            data-testid={`expense-summary-${i}`}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-center gap-3">
              <motion.div 
                className={s.cls} 
                style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <s.icon size={18} className="text-white" />
              </motion.div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-xl font-bold">{s.noPrefix ? '' : '$'}{Number(s.value).toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expenses Table */}
      <motion.div className="glass-card overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="overflow-x-auto">
          <table className="glass-table" data-testid="expenses-table">
            <thead><tr><th>Vehicle</th><th>Trip</th><th>Fuel (L)</th><th>Fuel Cost</th><th>Other Cost</th><th>Total</th><th>Date</th></tr></thead>
            <tbody>
              {(expenses || []).length === 0 ? <tr><td colSpan={7} className="text-center text-gray-500 py-8">No expenses logged</td></tr> :
                (expenses || []).map((e, i) => (
                  <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} data-testid={`expense-row-${e.id}`}>
                    <td className="font-medium">{e.vehicles?.name || '-'}</td>
                    <td className="text-xs text-gray-500 font-mono">{e.trips ? `${e.trips.origin} → ${e.trips.destination}` : '-'}</td>
                    <td>{Number(e.fuel_liters || 0).toLocaleString()} L</td>
                    <td className="text-red-400 font-medium">${Number(e.fuel_cost || 0).toLocaleString()}</td>
                    <td>${Number(e.other_cost || 0).toLocaleString()}</td>
                    <td className="font-bold text-indigo-400">${(Number(e.fuel_cost || 0) + Number(e.other_cost || 0)).toLocaleString()}</td>
                    <td className="text-sm text-gray-500">{e.created_at?.slice(0, 10)}</td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content" onClick={e => e.stopPropagation()} data-testid="expense-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Log Expense</h2>
                <button onClick={() => setModal(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div><label className="text-sm font-medium text-gray-400 mb-1 block">Vehicle</label>
                  <select data-testid="expense-vehicle-select" value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} className="select-modern">
                    <option value="">Select vehicle...</option>
                    {(vehicles || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-400 mb-1 block">Trip (optional)</label>
                  <select value={form.trip_id || ''} onChange={e => setForm({ ...form, trip_id: e.target.value })} className="select-modern">
                    <option value="">No trip linked</option>
                    {(trips || []).filter(t => t.status === 'completed').map(t => <option key={t.id} value={t.id}>{t.origin} → {t.destination}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-sm font-medium text-gray-400 mb-1 block">Fuel (L)</label><input data-testid="expense-fuel-input" type="number" value={form.fuel_liters} onChange={e => setForm({ ...form, fuel_liters: e.target.value })} className="input-modern" /></div>
                  <div><label className="text-sm font-medium text-gray-400 mb-1 block">Fuel Cost ($)</label><input type="number" value={form.fuel_cost} onChange={e => setForm({ ...form, fuel_cost: e.target.value })} className="input-modern" /></div>
                  <div><label className="text-sm font-medium text-gray-400 mb-1 block">Other ($)</label><input type="number" value={form.other_cost} onChange={e => setForm({ ...form, other_cost: e.target.value })} className="input-modern" /></div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button data-testid="expense-save-btn" onClick={handleCreate} disabled={loading || !form.vehicle_id} className="btn-primary flex-1 justify-center">{loading ? 'Saving...' : 'Log Expense'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
