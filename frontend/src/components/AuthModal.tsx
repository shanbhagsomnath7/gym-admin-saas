import React, { useState } from 'react';
import { Dumbbell, Lock, Mail, Phone, Building, User, ArrowRight } from 'lucide-react';
import { apiClient } from '../services/api';
import type { AuthResponse } from '../services/api';

interface AuthModalProps {
  onSuccess: (authData: AuthResponse) => void;
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Login inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register inputs
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');

  // Bulletproof error message parser to avoid Minified React Error #31
  const parseErrorMessage = (err: any, fallback: string): string => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const firstErr = detail[0];
      return typeof firstErr === 'string' ? firstErr : firstErr?.msg || fallback;
    }
    if (typeof detail === 'object' && detail !== null) {
      return detail.msg || JSON.stringify(detail);
    }
    return err?.message || fallback;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setLoading(true);
      const res = await apiClient.post<AuthResponse>('/auth/login', {
        email: email.trim(),
        password: password,
      });

      localStorage.setItem('gym_auth_token', res.data.access_token);
      localStorage.setItem('gym_active_id', res.data.gym_id);
      localStorage.setItem('gym_name', res.data.gym_name);
      localStorage.setItem('gym_owner_name', res.data.owner_name);

      onSuccess(res.data);
    } catch (err: any) {
      setErrorMsg(parseErrorMessage(err, 'Login failed. Check your email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setLoading(true);
      await apiClient.post('/gyms', {
        name: gymName.trim(),
        owner_name: ownerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password,
      });

      // Attempt automatic sign in right after registering
      try {
        const loginRes = await apiClient.post<AuthResponse>('/auth/login', {
          email: email.trim(),
          password: password,
        });

        localStorage.setItem('gym_auth_token', loginRes.data.access_token);
        localStorage.setItem('gym_active_id', loginRes.data.gym_id);
        localStorage.setItem('gym_name', loginRes.data.gym_name);
        localStorage.setItem('gym_owner_name', loginRes.data.owner_name);

        onSuccess(loginRes.data);
      } catch (loginErr) {
        setIsLogin(true);
        setErrorMsg('Registration successful! Please enter your password to sign in.');
      }
    } catch (err: any) {
      setErrorMsg(parseErrorMessage(err, 'Registration failed. Check inputs or try another email.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] flex items-center justify-center p-4">
      {/* Background glow accents */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-gradient-to-b from-[#0d1322] to-[#0a0f1d] border border-slate-800/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative z-10">
        
        {/* Header Icon + Brand */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20">
            <div className="h-full w-full bg-[#090d16] rounded-2xl flex items-center justify-center text-emerald-400">
              <Dumbbell className="h-6 w-6" />
            </div>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">
            {isLogin ? 'Gym Owner Portal' : 'Register Your Gym'}
          </h2>
          <p className="text-xs text-slate-400">
            {isLogin 
              ? 'Log in to manage active athletes, renewals & check-ins' 
              : 'Launch your branded dashboard with automated reminders'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#080c16] border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              isLogin 
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              !isLogin 
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register Gym
          </button>
        </div>

        {isLogin ? (
          /* Sign In Form */
          <form onSubmit={handleLogin} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Owner Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="owner@powerfit.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 transition active:scale-95 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Enter Dashboard'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          /* Register Gym Form */
          <form onSubmit={handleRegister} className="space-y-3.5 text-xs sm:text-sm">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Gym Name</label>
              <div className="relative">
                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Iron Clad Fitness"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Your Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Somnath"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="+91..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="gym@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60 text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 transition active:scale-95 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Creating Organization...' : 'Create & Launch'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}