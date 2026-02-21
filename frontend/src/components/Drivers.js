import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Shield, AlertTriangle, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

export default function Drivers() {
  const { drivers, api, user } = useStore();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const canManage = ['manager', 'safety'].includes(user?.role);

  const openAdd = () => {
    setForm({ full_name: '', license_number: '', license_expiry: '', safety_score: 100, status: 'off_duty' });
    setModal('add');
  };
  const openEdit = (d) => { setForm({ ...d }); setModal('edit'); };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (modal === 'add') {
        await api('/api/drivers', { method: 'POST', body: JSON.stringify({ ...form, safety_score: Number(form.safety_score) }) });
        toast.success('Driver added');
      } else {
        await api(`/api/drivers/${form.id}`, { method: 'PUT', body: JSON.stringify({ full_name: form.full_name, license_number: form.license_number, license_expiry: form.license_expiry, safety_score: Number(form.safety_score), status: form.status }) });
        toast.success('Driver updated');
      }
      setModal(null);
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return { bg: 'from-green-400 to-emerald-400', text: 'text-green-600', ring: 'ring-green-200' };
    if (score >= 60) return { bg: 'from-amber-400 to-orange-400', text: 'text-amber-600', ring: 'ring-amber-200' };
    return { bg: 'from-red-400 to-pink-400', text: 'text-red-600', ring: 'ring-red-200' };
  };

  const isExpiring = (d) => {
    if (!d.license_expiry) return false;
    const diff = (new Date(d.license_expiry) - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff < 30;
  };
  const isExpired = (d) => d.license_expiry && new Date(d.license_expiry) < new Date();

  return (
    <div className="space-y-4" data-testid="drivers-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-800">Driver Performance</h1><p className="text-gray-500 text-sm">Safety profiles & compliance</p></div>
        {canManage && <button data-testid="add-driver-btn" onClick={openAdd} className="btn-primary"><Plus size={18} /> Add Driver</button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(drivers || []).length === 0 ? (
          <div className="glass-card p-8 col-span-full text-center text-gray-400">No drivers found</div>
        ) : (
          (drivers || []).map((d, i) => {
            const sc = getScoreColor(d.safety_score);
            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="glass-card glass-card-hover p-5" data-testid={`driver-card-${d.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {d.full_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{d.full_name}</p>
                      <span className={`badge badge-${d.status} text-xs`}>{d.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  {canManage && (
                    <button data-testid={`edit-driver-${d.id}`} onClick={() => openEdit(d)} className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-400 transition-colors">
                      <Edit size={16} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div className={`safety-circle ring-4 ${sc.ring}`} data-testid={`driver-score-${d.id}`}
                    style={{ background: `linear-gradient(135deg, ${sc.bg.includes('green') ? '#43e97b, #38f9d7' : sc.bg.includes('amber') ? '#fa709a, #fee140' : '#f5576c, #f093fb'})` }}>
                    <span className="text-white font-bold text-sm">{d.safety_score}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Safety Score</p>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${d.safety_score}%`, background: d.safety_score >= 80 ? 'linear-gradient(90deg, #43e97b, #38f9d7)' : d.safety_score >= 60 ? 'linear-gradient(90deg, #fa709a, #fee140)' : 'linear-gradient(90deg, #f5576c, #f093fb)' }} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">License</span>
                    <span className="font-mono text-xs text-gray-700">{d.license_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Expires</span>
                    <span className={`font-medium ${isExpired(d) ? 'text-red-500' : isExpiring(d) ? 'text-amber-500' : 'text-gray-700'}`}>
                      {isExpired(d) && <AlertTriangle size={12} className="inline mr-1" />}
                      {isExpiring(d) && <AlertTriangle size={12} className="inline mr-1" />}
                      {d.license_expiry}
                    </span>
                  </div>
                  {d.safety_score < 60 && (
                    <div className="flex items-center gap-1 p-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium">
                      <Shield size={12} /> High Risk Driver
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content" onClick={e => e.stopPropagation()} data-testid="driver-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">{modal === 'add' ? 'Add Driver' : 'Edit Driver'}</h2>
                <button onClick={() => setModal(null)} className="text-gray-400"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div><label className="text-sm font-medium text-gray-600 mb-1 block">Full Name</label><input data-testid="driver-name-input" value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} className="input-modern" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-600 mb-1 block">License Number</label><input data-testid="driver-license-input" value={form.license_number || ''} onChange={e => setForm({ ...form, license_number: e.target.value })} className="input-modern" /></div>
                  <div><label className="text-sm font-medium text-gray-600 mb-1 block">License Expiry</label><input type="date" value={form.license_expiry || ''} onChange={e => setForm({ ...form, license_expiry: e.target.value })} className="input-modern" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-600 mb-1 block">Safety Score (0-100)</label><input type="number" min="0" max="100" value={form.safety_score || ''} onChange={e => setForm({ ...form, safety_score: e.target.value })} className="input-modern" /></div>
                  <div><label className="text-sm font-medium text-gray-600 mb-1 block">Status</label>
                    <select value={form.status || 'off_duty'} onChange={e => setForm({ ...form, status: e.target.value })} className="select-modern">
                      <option value="on_duty">On Duty</option><option value="off_duty">Off Duty</option><option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button data-testid="driver-save-btn" onClick={handleSave} disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Saving...' : 'Save Driver'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
