import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Plus, CheckCircle, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

export default function Maintenance() {
  const { maintenance, vehicles, api, user, fetchMaintenance, fetchVehicles } = useStore();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const canManage = user?.role === 'manager';

  React.useEffect(() => {
    if (!maintenance || maintenance.length === 0) fetchMaintenance();
    if (!vehicles || vehicles.length === 0) fetchVehicles();
  }, []);

  const openAdd = () => {
    setForm({ vehicle_id: '', description: '', cost: '', service_date: new Date().toISOString().split('T')[0] });
    setModal(true);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api('/api/maintenance', { method: 'POST', body: JSON.stringify({ ...form, cost: Number(form.cost) }) });
      toast.success('Maintenance log created. Vehicle moved to shop.');
      setModal(false);
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const handleComplete = async (id) => {
    try {
      await api(`/api/maintenance/${id}/complete`, { method: 'PUT' });
      toast.success('Maintenance completed. Vehicle available.');
    } catch (err) { toast.error(err.message); }
  };

  const inProgress = (maintenance || []).filter(m => m.status === 'in_progress');
  const completed = (maintenance || []).filter(m => m.status === 'completed');

  return (
    <div className="space-y-4" data-testid="maintenance-page">
      <motion.div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Maintenance & Service</h1>
          <p className="text-gray-400 text-sm">Timeline view of fleet health</p>
        </div>
        {canManage && (
          <motion.button 
            data-testid="add-maintenance-btn" 
            onClick={openAdd} 
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} /> Log Service
          </motion.button>
        )}
      </motion.div>

      {/* In Progress */}
      {inProgress.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2"><Clock size={16} /> In Progress ({inProgress.length})</h3>
          <div className="space-y-3">
            {inProgress.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-5 border-l-4 border-amber-400" data-testid={`maint-card-${m.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="icon-gradient-warning" style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wrench size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{m.description}</p>
                      <p className="text-sm text-gray-500 mt-1">Vehicle: <strong>{m.vehicles?.name || 'Unknown'}</strong></p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-gray-500">Cost: <strong className="text-red-500">${Number(m.cost).toLocaleString()}</strong></span>
                        <span className="text-gray-500">Date: <strong>{m.service_date}</strong></span>
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <button data-testid={`complete-maint-${m.id}`} onClick={() => handleComplete(m.id)}
                      className="btn-primary py-2 px-4 text-sm" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
                      <CheckCircle size={14} /> Complete
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Timeline */}
      <div>
        <h3 className="text-sm font-semibold text-green-600 mb-3 flex items-center gap-2"><CheckCircle size={16} /> Completed ({completed.length})</h3>
        <div className="relative pl-6 space-y-3">
          <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-300 to-green-100" />
          {completed.length === 0 ? <p className="text-gray-400 text-sm py-4">No completed maintenance</p> :
            completed.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-4 relative" data-testid={`maint-completed-${m.id}`}>
                <div className="absolute -left-[17px] top-5 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                <p className="font-medium text-gray-800">{m.description}</p>
                <div className="flex gap-4 mt-1 text-sm text-gray-500">
                  <span>{m.vehicles?.name || 'Unknown'}</span>
                  <span>${Number(m.cost).toLocaleString()}</span>
                  <span>{m.service_date}</span>
                </div>
              </motion.div>
            ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content" onClick={e => e.stopPropagation()} data-testid="maintenance-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Log Maintenance</h2>
                <button onClick={() => setModal(false)} className="text-gray-400"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div><label className="text-sm font-medium text-gray-600 mb-1 block">Vehicle</label>
                  <select data-testid="maint-vehicle-select" value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} className="select-modern">
                    <option value="">Select vehicle...</option>
                    {(vehicles || []).filter(v => v.status !== 'retired').map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-600 mb-1 block">Description</label><input data-testid="maint-desc-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-modern" placeholder="e.g. Brake Replacement" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-600 mb-1 block">Cost ($)</label><input data-testid="maint-cost-input" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className="input-modern" /></div>
                  <div><label className="text-sm font-medium text-gray-600 mb-1 block">Service Date</label><input type="date" value={form.service_date} onChange={e => setForm({ ...form, service_date: e.target.value })} className="input-modern" /></div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button data-testid="maint-save-btn" onClick={handleCreate} disabled={loading || !form.vehicle_id || !form.description} className="btn-primary flex-1 justify-center">{loading ? 'Saving...' : 'Log Service'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
