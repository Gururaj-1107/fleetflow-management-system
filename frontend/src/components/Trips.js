import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, ArrowRight, Play, CheckCircle, XCircle, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

export default function Trips() {
  const { trips, vehicles, drivers, api, user, fetchTrips, fetchVehicles, fetchDrivers } = useStore();
  const [modal, setModal] = useState(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const canManage = ['manager', 'dispatcher'].includes(user?.role);

  React.useEffect(() => {
    if (!trips || trips.length === 0) fetchTrips();
    if (!vehicles || vehicles.length === 0) fetchVehicles();
    if (!drivers || drivers.length === 0) fetchDrivers();
  }, []);

  const filtered = (trips || []).filter(t => filterStatus === 'all' || t.status === filterStatus);
  const availableVehicles = (vehicles || []).filter(v => v.status === 'available');
  const availableDrivers = (drivers || []).filter(d => d.status !== 'suspended' && (!d.license_expiry || new Date(d.license_expiry) > new Date()));

  const openCreate = () => {
    setForm({ vehicle_id: '', driver_id: '', origin: '', destination: '', cargo_weight: '', distance: '', revenue: '' });
    setStep(0);
    setModal('create');
  };

  const selectedVehicle = (vehicles || []).find(v => v.id === form.vehicle_id);
  const selectedDriver = (drivers || []).find(d => d.id === form.driver_id);
  const cargoExceeds = selectedVehicle && form.cargo_weight && Number(form.cargo_weight) > Number(selectedVehicle.max_capacity);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api('/api/trips', { method: 'POST', body: JSON.stringify({ ...form, cargo_weight: Number(form.cargo_weight), distance: Number(form.distance || 0), revenue: Number(form.revenue || 0) }) });
      toast.success('Trip created as draft');
      setModal(null);
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const handleAction = async (id, action) => {
    try {
      await api(`/api/trips/${id}/${action}`, { method: 'PUT' });
      toast.success(`Trip ${action}d successfully`);
    } catch (err) { toast.error(err.message); }
  };

  const steps = ['Vehicle', 'Driver', 'Details', 'Confirm'];
  const canNext = () => {
    if (step === 0) return !!form.vehicle_id;
    if (step === 1) return !!form.driver_id;
    if (step === 2) return form.origin && form.destination && form.cargo_weight && !cargoExceeds;
    return true;
  };

  return (
    <div className="space-y-4" data-testid="trips-page">
      <motion.div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Trip Dispatcher</h1>
          <p className="text-gray-400 text-sm">{trips?.length || 0} trips managed</p>
        </div>
        {canManage && (
          <motion.button 
            data-testid="create-trip-btn" 
            onClick={openCreate} 
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} /> New Trip
          </motion.button>
        )}
      </motion.div>

      <div className="glass-card p-4">
        <div className="flex gap-2 flex-wrap">
          {['all', 'draft', 'dispatched', 'completed', 'cancelled'].map(s => (
            <motion.button 
              key={s} 
              data-testid={`filter-${s}`} 
              onClick={() => setFilterStatus(s)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterStatus === s ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} {s !== 'all' && `(${(trips || []).filter(t => t.status === s).length})`}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-card p-8 text-center text-gray-500">
            <MapPin size={40} className="mx-auto mb-3 opacity-50" />
            No trips found
          </div>
        ) : (
          filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card glass-card-hover p-5" data-testid={`trip-card-${t.id}`}>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`badge badge-${t.status}`}>{t.status}</span>
                    <span className="text-xs text-gray-500 font-mono">{t.id?.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <MapPin size={16} className="text-indigo-400" />{t.origin} <ArrowRight size={14} className="text-gray-500" /> {t.destination}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
                    <span>Vehicle: <strong className="text-gray-300">{t.vehicles?.name || '-'}</strong></span>
                    <span>Driver: <strong className="text-gray-300">{t.drivers?.full_name || '-'}</strong></span>
                    <span>Cargo: <strong className="text-gray-300">{Number(t.cargo_weight).toLocaleString()} kg</strong></span>
                    <span>Revenue: <strong className="text-indigo-400">${Number(t.revenue || 0).toLocaleString()}</strong></span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    {t.status === 'draft' && (
                      <button data-testid={`dispatch-trip-${t.id}`} onClick={() => handleAction(t.id, 'dispatch')} className="btn-primary py-2 px-4 text-sm">
                        <Play size={14} /> Dispatch
                      </button>
                    )}
                    {t.status === 'dispatched' && (
                      <button data-testid={`complete-trip-${t.id}`} onClick={() => handleAction(t.id, 'complete')} className="btn-primary py-2 px-4 text-sm" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
                        <CheckCircle size={14} /> Complete
                      </button>
                    )}
                    {['draft', 'dispatched'].includes(t.status) && (
                      <button data-testid={`cancel-trip-${t.id}`} onClick={() => handleAction(t.id, 'cancel')} className="btn-danger py-2 px-4 text-sm">
                        <XCircle size={14} /> Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Trip Wizard */}
      <AnimatePresence>
        {modal === 'create' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()} data-testid="trip-wizard">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Create Trip</h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>

              {/* Steps */}
              <div className="flex gap-2 mb-6">
                {steps.map((s, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className="text-sm text-gray-500 mb-4">Step {step + 1}: {steps[step]}</p>

              {step === 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableVehicles.length === 0 ? <p className="text-gray-400 text-sm py-4 text-center">No available vehicles</p> :
                    availableVehicles.map(v => (
                      <button key={v.id} data-testid={`select-vehicle-${v.id}`} onClick={() => setForm({ ...form, vehicle_id: v.id })}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${form.vehicle_id === v.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent bg-white/50 hover:bg-white'}`}>
                        <div className="icon-gradient" style={{ width: 40, height: 40, borderRadius: 12 }}><MapPin size={16} /></div>
                        <div className="flex-1"><p className="font-medium text-gray-800">{v.name}</p><p className="text-xs text-gray-400">{v.model} | {v.license_plate} | Cap: {Number(v.max_capacity).toLocaleString()} kg</p></div>
                      </button>
                    ))}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableDrivers.length === 0 ? <p className="text-gray-400 text-sm py-4 text-center">No available drivers</p> :
                    availableDrivers.map(d => (
                      <button key={d.id} data-testid={`select-driver-${d.id}`} onClick={() => setForm({ ...form, driver_id: d.id })}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${form.driver_id === d.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent bg-white/50 hover:bg-white'}`}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm">{d.full_name[0]}</div>
                        <div className="flex-1"><p className="font-medium text-gray-800">{d.full_name}</p><p className="text-xs text-gray-400">Safety: {d.safety_score} | License: {d.license_expiry}</p></div>
                      </button>
                    ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium text-gray-600 mb-1 block">Origin</label><input data-testid="trip-origin-input" value={form.origin || ''} onChange={e => setForm({ ...form, origin: e.target.value })} className="input-modern" placeholder="Los Angeles, CA" /></div>
                    <div><label className="text-sm font-medium text-gray-600 mb-1 block">Destination</label><input data-testid="trip-dest-input" value={form.destination || ''} onChange={e => setForm({ ...form, destination: e.target.value })} className="input-modern" placeholder="San Francisco, CA" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-1 block">Cargo Weight (kg)</label>
                      <input data-testid="trip-cargo-input" type="number" value={form.cargo_weight || ''} onChange={e => setForm({ ...form, cargo_weight: e.target.value })} className={`input-modern ${cargoExceeds ? 'border-red-400' : ''}`} />
                      {cargoExceeds && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertTriangle size={12} /> Exceeds capacity ({selectedVehicle.max_capacity} kg)</p>}
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 mb-1 block">Distance (km)</label><input type="number" value={form.distance || ''} onChange={e => setForm({ ...form, distance: e.target.value })} className="input-modern" /></div>
                    <div><label className="text-sm font-medium text-gray-600 mb-1 block">Revenue ($)</label><input type="number" value={form.revenue || ''} onChange={e => setForm({ ...form, revenue: e.target.value })} className="input-modern" /></div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3 p-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-2xl">
                  <h3 className="font-semibold text-gray-800">Trip Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">Vehicle</span><span className="font-medium">{selectedVehicle?.name}</span>
                    <span className="text-gray-500">Driver</span><span className="font-medium">{selectedDriver?.full_name}</span>
                    <span className="text-gray-500">Route</span><span className="font-medium">{form.origin} → {form.destination}</span>
                    <span className="text-gray-500">Cargo</span><span className="font-medium">{Number(form.cargo_weight).toLocaleString()} kg</span>
                    <span className="text-gray-500">Revenue</span><span className="font-medium text-indigo-600">${Number(form.revenue || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {step > 0 && <button onClick={() => setStep(step - 1)} className="btn-secondary flex-1">Back</button>}
                {step < 3 ? (
                  <button onClick={() => setStep(step + 1)} disabled={!canNext()} className="btn-primary flex-1 justify-center">Next</button>
                ) : (
                  <button data-testid="trip-submit-btn" onClick={handleCreate} disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Creating...' : 'Create Trip'}</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
