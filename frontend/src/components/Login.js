import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Truck, Lock, Mail, User, ChevronDown, ArrowLeft, Send } from 'lucide-react';
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
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'manager' });
  const [errors, setErrors] = useState({});
  const [resetSent, setResetSent] = useState(false);
  const API = process.env.REACT_APP_BACKEND_URL;

  const validate = () => {
    const e = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (mode !== 'forgot' && (!form.password || form.password.length < 6)) e.password = 'Min 6 characters';
    if (mode === 'register' && !form.full_name) e.full_name = 'Name required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    
    try {
      if (mode === 'forgot') {
        // Simulate password reset email
        await new Promise(resolve => setTimeout(resolve, 1500));
        setResetSent(true);
        toast.success('Password reset link sent to your email!');
      } else {
        const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const body = mode === 'register' ? form : { email: form.email, password: form.password };
        const res = await fetch(`${API}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Authentication failed');
        setAuth(data.token, data.user);
        toast.success(`Welcome, ${data.user.full_name}!`);
        navigate('/');
      }
    } catch (err) { 
      toast.error(err.message); 
    }
    setLoading(false);
  };

  const fillDemo = (role) => {
    setForm({ email: `${role}@fleetflow.com`, password: 'password123', full_name: '', role });
    setMode('login');
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setErrors({});
    setResetSent(false);
  };

  return (
    <div className="login-bg" data-testid="login-page">
      {/* Animated gradient orbs */}
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />
      
      {/* Floating shapes */}
      <div className="floating-shape" style={{ width: 400, height: 400, background: 'rgba(102,126,234,0.25)', top: '-10%', left: '-5%' }} />
      <div className="floating-shape" style={{ width: 300, height: 300, background: 'rgba(118,75,162,0.25)', bottom: '-5%', right: '-3%', animationDelay: '3s' }} />
      <div className="floating-shape" style={{ width: 200, height: 200, background: 'rgba(79,172,254,0.2)', top: '60%', left: '60%', animationDelay: '5s' }} />

      <div className="flex w-full max-w-[1100px] mx-4" style={{ minHeight: '600px', position: 'relative', zIndex: 1 }}>
        {/* Left: Login Form */}
        <motion.div 
          initial={{ opacity: 0, x: -40 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="login-glass flex-1 p-12 flex flex-col justify-center" 
          style={{ maxWidth: 480 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              className="icon-gradient" 
              style={{ width: 40, height: 40, borderRadius: 12 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Truck size={20} />
            </motion.div>
            <span className="text-white font-bold text-xl tracking-tight">FleetFlow</span>
          </div>
          
          <AnimatePresence mode="wait">
            {mode === 'forgot' ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <button 
                  onClick={() => switchMode('login')} 
                  className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
                  data-testid="back-to-login-btn"
                >
                  <ArrowLeft size={18} />
                  <span className="text-sm font-medium">Back to Login</span>
                </button>
                
                <h1 className="text-white text-3xl font-bold mt-4 mb-1" data-testid="forgot-title">
                  Reset Password
                </h1>
                <p className="text-white/70 text-base mb-8">
                  {resetSent 
                    ? "Check your email for reset instructions"
                    : "Enter your email to receive a reset link"
                  }
                </p>

                {!resetSent ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <div className="input-icon-wrapper">
                        <input 
                          data-testid="forgot-email-input" 
                          type="email" 
                          placeholder="Email address" 
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          className="input-modern pl-12" 
                        />
                        <Mail className="input-icon" size={18} />
                      </div>
                      {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                    </div>

                    <motion.button 
                      data-testid="forgot-submit-button" 
                      type="submit" 
                      disabled={loading} 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-primary w-full justify-center text-base" 
                      style={{ padding: '16px 28px', marginTop: 8 }}
                    >
                      {loading ? (
                        <div className="skeleton" style={{ width: 120, height: 20 }} />
                      ) : (
                        <>
                          <Send size={18} />
                          Send Reset Link
                        </>
                      )}
                    </motion.button>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-cyan-400 flex items-center justify-center">
                      <Mail size={32} className="text-white" />
                    </div>
                    <p className="text-white/80 text-sm">
                      We've sent instructions to <span className="text-white font-semibold">{form.email}</span>
                    </p>
                    <button 
                      onClick={() => { setResetSent(false); setForm({ ...form, email: '' }); }}
                      className="text-indigo-300 hover:text-indigo-200 text-sm mt-4 underline"
                    >
                      Try another email
                    </button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-white text-3xl font-bold mt-6 mb-1" data-testid="login-title">
                  {mode === 'register' ? 'Join the Fleet' : 'Welcome Back'}
                </h1>
                <p className="text-white/70 text-base mb-8">
                  {mode === 'register' ? 'Create your command center account' : 'Enter your command center'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence>
                    {mode === 'register' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <div className="input-icon-wrapper">
                          <input 
                            data-testid="register-name-input" 
                            type="text" 
                            placeholder="Full Name" 
                            value={form.full_name}
                            onChange={e => setForm({ ...form, full_name: e.target.value })}
                            className="input-modern pl-12" 
                          />
                          <User className="input-icon" size={18} />
                        </div>
                        {errors.full_name && <p className="text-red-400 text-sm mt-1">{errors.full_name}</p>}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <div className="input-icon-wrapper">
                      <input 
                        data-testid="login-email-input" 
                        type="email" 
                        placeholder="Email address" 
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="input-modern pl-12" 
                      />
                      <Mail className="input-icon" size={18} />
                    </div>
                    {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <div className="input-icon-wrapper">
                      <input 
                        data-testid="login-password-input" 
                        type="password" 
                        placeholder="Password" 
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        className="input-modern pl-12" 
                      />
                      <Lock className="input-icon" size={18} />
                    </div>
                    {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
                  </div>

                  {mode === 'register' && (
                    <div className="relative">
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      <select 
                        data-testid="register-role-select" 
                        value={form.role} 
                        onChange={e => setForm({ ...form, role: e.target.value })}
                        className="select-modern"
                      >
                        {roles.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                      </select>
                    </div>
                  )}

                  {mode === 'login' && (
                    <div className="flex justify-end">
                      <button 
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-indigo-300 hover:text-indigo-200 text-sm transition-colors"
                        data-testid="forgot-password-link"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <motion.button 
                    data-testid="login-submit-button" 
                    type="submit" 
                    disabled={loading} 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary w-full justify-center text-base" 
                    style={{ padding: '16px 28px', marginTop: 8 }}
                  >
                    {loading ? (
                      <div className="skeleton" style={{ width: 120, height: 20 }} />
                    ) : mode === 'register' ? 'Create Account' : 'Enter Command Center'}
                  </motion.button>
                </form>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-white/20" />
                  <span className="text-white/50 text-sm">Quick Demo Access</span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {roles.map(r => (
                    <motion.button 
                      key={r.value} 
                      data-testid={`demo-${r.value}-btn`} 
                      onClick={() => fillDemo(r.value)}
                      whileHover={{ scale: 1.03, backgroundColor: 'rgba(102, 126, 234, 0.2)' }}
                      whileTap={{ scale: 0.97 }}
                      className="text-sm py-2.5 px-3 rounded-xl border border-white/20 text-white/80 hover:border-white/40 transition-all font-medium"
                    >
                      {r.icon} {r.label}
                    </motion.button>
                  ))}
                </div>

                <p className="text-white/50 text-sm text-center mt-6">
                  {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button 
                    data-testid="toggle-auth-mode" 
                    onClick={() => switchMode(mode === 'register' ? 'login' : 'register')} 
                    className="text-white font-semibold hover:underline"
                  >
                    {mode === 'register' ? 'Sign In' : 'Sign Up'}
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right: 3D Illustration */}
        <motion.div 
          initial={{ opacity: 0, x: 40 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex-1 hidden lg:flex items-center justify-center relative"
        >
          <div className="shield-3d">
            <div className="shield-3d-inner">
              <div className="relative" style={{ width: 280, height: 280 }}>
                {/* 3D Shield Face */}
                <div className="absolute inset-0 rounded-3xl" style={{
                  background: 'linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.2))',
                  border: '1px solid rgba(102,126,234,0.3)',
                  backdropFilter: 'blur(10px)',
                  transform: 'rotateX(10deg)',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.3), 0 0 40px rgba(102,126,234,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                }}>
                  <div className="flex items-center justify-center h-full">
                    <Shield size={100} className="text-white/80" strokeWidth={1.2} />
                  </div>
                </div>
                {/* Shadow */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2" style={{
                  width: '70%', height: 30, background: 'rgba(0,0,0,0.3)', borderRadius: '50%', filter: 'blur(15px)'
                }} />
              </div>
            </div>
          </div>
          
          {/* Floating badges */}
          <motion.div 
            animate={{ y: [0, -15, 0] }} 
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/4 right-12 login-glass px-5 py-3 flex items-center gap-2"
          >
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/90 text-sm font-medium">Fleet Active</span>
          </motion.div>
          
          <motion.div 
            animate={{ y: [0, 12, 0] }} 
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute bottom-1/4 left-8 login-glass px-5 py-3"
          >
            <span className="text-white/90 text-sm font-medium">8 Vehicles Tracked</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
