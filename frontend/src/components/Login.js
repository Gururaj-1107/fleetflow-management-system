import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Truck, Lock, Mail, User, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

const roles = [
  { value: 'manager', label: 'Fleet Manager', icon: '🎯' },
  { value: 'dispatcher', label: 'Dispatcher', icon: '📦' },
  { value: 'safety', label: 'Safety Officer', icon: '🛡' },
  { value: 'analyst', label: 'Analyst', icon: '📊' },
];

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useStore();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'manager' });
  const [errors, setErrors] = useState({});
  const API = process.env.REACT_APP_BACKEND_URL;

  const validate = () => {
    const e = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters';
    if (isRegister && !form.full_name) e.full_name = 'Name required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister ? form : { email: form.email, password: form.password };
      const res = await fetch(`${API}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');
      setAuth(data.token, data.user);
      toast.success(`Welcome, ${data.user.full_name}!`);
      navigate('/');
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const fillDemo = (role) => {
    setForm({ email: `${role}@fleetflow.com`, password: 'password123', full_name: '', role });
    setIsRegister(false);
  };

  return (
    <div className="login-bg" data-testid="login-page">
      {/* Floating shapes */}
      <div className="floating-shape" style={{ width: 400, height: 400, background: 'rgba(102,126,234,0.3)', top: '-10%', left: '-5%' }} />
      <div className="floating-shape" style={{ width: 300, height: 300, background: 'rgba(118,75,162,0.3)', bottom: '-5%', right: '-3%', animationDelay: '3s' }} />
      <div className="floating-shape" style={{ width: 200, height: 200, background: 'rgba(79,172,254,0.3)', top: '60%', left: '60%', animationDelay: '5s' }} />

      <div className="flex w-full max-w-[1100px] mx-4" style={{ minHeight: '600px', position: 'relative', zIndex: 1 }}>
        {/* Left: Login Form */}
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="login-glass flex-1 p-12 flex flex-col justify-center" style={{ maxWidth: 480 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="icon-gradient" style={{ width: 40, height: 40, borderRadius: 12 }}>
              <Truck size={20} />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">FleetFlow</span>
          </div>
          <h1 className="text-white text-3xl font-bold mt-6 mb-1" data-testid="login-title">
            {isRegister ? 'Join the Fleet' : 'Welcome Back'}
          </h1>
          <p className="text-white/70 text-base mb-8">{isRegister ? 'Create your command center account' : 'Enter your command center'}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {isRegister && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input data-testid="register-name-input" type="text" placeholder="Full Name" value={form.full_name}
                      onChange={e => setForm({ ...form, full_name: e.target.value })}
                      className="input-modern pl-12" style={{ background: 'rgba(255,255,255,0.9)' }} />
                  </div>
                  {errors.full_name && <p className="text-red-300 text-sm mt-1">{errors.full_name}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input data-testid="login-email-input" type="email" placeholder="Email address" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input-modern pl-12" style={{ background: 'rgba(255,255,255,0.9)' }} />
              </div>
              {errors.email && <p className="text-red-300 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input data-testid="login-password-input" type="password" placeholder="Password" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-modern pl-12" style={{ background: 'rgba(255,255,255,0.9)' }} />
              </div>
              {errors.password && <p className="text-red-300 text-sm mt-1">{errors.password}</p>}
            </div>

            {isRegister && (
              <div className="relative">
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <select data-testid="register-role-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="select-modern" style={{ background: 'rgba(255,255,255,0.9)' }}>
                  {roles.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                </select>
              </div>
            )}

            <motion.button data-testid="login-submit-button" type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              className="btn-primary w-full justify-center text-base" style={{ padding: '16px 28px', marginTop: 8 }}>
              {loading ? <div className="skeleton" style={{ width: 120, height: 20 }} /> : isRegister ? 'Create Account' : 'Enter Command Center'}
            </motion.button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/50 text-sm">Quick Demo Access</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {roles.map(r => (
              <button key={r.value} data-testid={`demo-${r.value}-btn`} onClick={() => fillDemo(r.value)}
                className="text-sm py-2.5 px-3 rounded-xl border border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40 transition-all font-medium">
                {r.icon} {r.label}
              </button>
            ))}
          </div>

          <p className="text-white/50 text-sm text-center mt-6">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button data-testid="toggle-auth-mode" onClick={() => setIsRegister(!isRegister)} className="text-white font-semibold hover:underline">
              {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </motion.div>

        {/* Right: 3D Illustration */}
        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="flex-1 hidden lg:flex items-center justify-center relative">
          <div className="shield-3d">
            <div className="shield-3d-inner">
              <div className="relative" style={{ width: 280, height: 280 }}>
                {/* 3D Shield Face */}
                <div className="absolute inset-0 rounded-3xl" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.05))',
                  border: '1px solid rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(10px)',
                  transform: 'rotateX(10deg)',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4)'
                }}>
                  <div className="flex items-center justify-center h-full">
                    <Shield size={100} className="text-white/80" strokeWidth={1.2} />
                  </div>
                </div>
                {/* Shadow */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2" style={{
                  width: '70%', height: 30, background: 'rgba(0,0,0,0.15)', borderRadius: '50%', filter: 'blur(15px)'
                }} />
              </div>
            </div>
          </div>
          {/* Floating badge */}
          <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/4 right-12 login-glass px-5 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/90 text-sm font-medium">Fleet Active</span>
          </motion.div>
          <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute bottom-1/4 left-8 login-glass px-5 py-3">
            <span className="text-white/90 text-sm font-medium">8 Vehicles Tracked</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
