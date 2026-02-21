import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Plus, Search, Edit, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

const statuses = ['available', 'on_trip', 'in_shop', 'retired'];

export default function Vehicles() {
  const { vehicles, api, user, fetchVehicles } = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const canEdit = user?.role === 'manager';

  React.useEffect(() => {
    if (!vehicles || vehicles.length === 0) {
      fetchVehicles().then(() => setDataLoaded(true));
    } else {
      setDataLoaded(true);
    }
  }, []);

  const filtered = (vehicles || []).filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.license_plate.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setForm({ name: '', model: '', license_plate: '', max_capacity: '', odometer: 0, acquisition_cost: 0 }); setModal('add'); };
  const openEdit = (v) => { setForm({ ...v }); setModal('edit'); };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (modal === 'add') {
        await api('/api/vehicles', { method: 'POST', body: JSON.stringify({ ...form, max_capacity: Number(form.max_capacity), odometer: Number(form.odometer), acquisition_cost: Number(form.acquisition_cost) }) });
        toast.success('Vehicle added successfully');
      } else {
        await api(`/api/vehicles/${form.id}`, { method: 'PUT', body: JSON.stringify({ name: form.name, model: form.model, license_plate: form.license_plate, max_capacity: Number(form.max_capacity), odometer: Number(form.odometer), status: form.status, acquisition_cost: Number(form.acquisition_cost) }) });
        toast.success('Vehicle updated');
      }
      setModal(null);
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    try { await api(`/api/vehicles/${id}`, { method: 'DELETE' }); toast.success('Vehicle deleted'); } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4" data-testid="vehicles-page">
      <motion.div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Vehicle Registry</h1>
          <p className="text-gray-400 text-sm">{vehicles?.length || 0} assets managed</p>
        </div>
        {canEdit && (
          <motion.button 
            data-testid="add-vehicle-btn" 
            onClick={openAdd} 
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} /> Add Vehicle
          </motion.button>
        )}
      </motion.div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="input-icon-wrapper flex-1">
          <input data-testid="vehicle-search" placeholder="Search vehicles..." value={search} onChange={e => setSearch(e.target.value)}
            className="input-modern pl-12" style={{ borderRadius: 999 }} />
          <Search className="input-icon" size={18} />
        </div>
        <select data-testid="vehicle-status-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-modern" style={{ maxWidth: 200 }}>
          <option value="all">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <motion.div className="glass-card overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="overflow-x-auto">
          <table className="glass-table" data-testid="vehicles-table">
            <thead><tr><th>Vehicle</th><th>License Plate</th><th>Capacity</th><th>Odometer</th><th>Status</th><th>Cost</th>{canEdit && <th>Actions</th>}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={canEdit ? 7 : 6} className="text-center text-gray-400 py-8">No vehicles found</td></tr>
              ) : (
                filtered.map((v, i) => (
                  <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} data-testid={`vehicle-row-${v.id}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <motion.div className="icon-gradient" style={{ width: 36, height: 36, borderRadius: 10 }} whileHover={{ scale: 1.1, rotate: 5 }}><Truck size={16} /></motion.div>
                        <div><p className="font-medium">{v.name}</p><p className="text-xs text-gray-500">{v.model}</p></div>
                      </div>
                    </td>
                    <td className="font-mono text-sm">{v.license_plate}</td>
                    <td>{Number(v.max_capacity).toLocaleString()} kg</td>
                    <td>{Number(v.odometer).toLocaleString()} km</td>
                    <td><span className={`badge badge-${v.status}`}>{v.status.replace('_', ' ')}</span></td>
                    <td className="text-indigo-400">${Number(v.acquisition_cost).toLocaleString()}</td>
                    {canEdit && (
                      <td>
                        <div className="flex gap-2">
                          <motion.button data-testid={`edit-vehicle-${v.id}`} onClick={() => openEdit(v)} className="p-2 rounded-lg hover:bg-indigo-500/20 text-indigo-400 transition-colors" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}><Edit size={16} /></motion.button>
                          <motion.button data-testid={`delete-vehicle-${v.id}`} onClick={() => handleDelete(v.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}><Trash2 size={16} /></motion.button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content" onClick={e => e.stopPropagation()} data-testid="vehicle-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{modal === 'add' ? 'Add Vehicle' : 'Edit Vehicle'}</h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div><label className="text-sm font-medium text-gray-400 mb-1 block">Name</label><input data-testid="vehicle-name-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="input-modern" placeholder="e.g. Falcon X Truck" /></div>
                <div><label className="text-sm font-medium text-gray-400 mb-1 block">Model</label><input data-testid="vehicle-model-input" value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} className="input-modern" placeholder="e.g. Ford F-750" /></div>
                <div><label className="text-sm font-medium text-gray-400 mb-1 block">License Plate</label><input data-testid="vehicle-plate-input" value={form.license_plate || ''} onChange={e => setForm({ ...form, license_plate: e.target.value })} className="input-modern" placeholder="e.g. FL-001-TX" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-400 mb-1 block">Max Capacity (kg)</label><input data-testid="vehicle-capacity-input" type="number" value={form.max_capacity || ''} onChange={e => setForm({ ...form, max_capacity: e.target.value })} className="input-modern" /></div>
                  <div><label className="text-sm font-medium text-gray-400 mb-1 block">Odometer (km)</label><input type="number" value={form.odometer || ''} onChange={e => setForm({ ...form, odometer: e.target.value })} className="input-modern" /></div>
                </div>
                <div><label className="text-sm font-medium text-gray-400 mb-1 block">Acquisition Cost ($)</label><input type="number" value={form.acquisition_cost || ''} onChange={e => setForm({ ...form, acquisition_cost: e.target.value })} className="input-modern" /></div>
                {modal === 'edit' && (
                  <div><label className="text-sm font-medium text-gray-400 mb-1 block">Status</label>
                    <select value={form.status || 'available'} onChange={e => setForm({ ...form, status: e.target.value })} className="select-modern">
                      {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button data-testid="vehicle-save-btn" onClick={handleSave} disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Saving...' : 'Save Vehicle'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
