import React, { useState } from 'react';
import { X, Lock, Phone, User, Building, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../services/api';

interface SettingsModalProps {
  gymId: string;
  initialGymName: string;
  initialOwnerName: string;
  onClose: () => void;
  onUpdated: (newName: string, newOwner: string) => void;
}

export default function SettingsModal({
  gymId,
  initialGymName,
  initialOwnerName,
  onClose,
  onUpdated
}: SettingsModalProps) {
  const [gymName, setGymName] = useState(initialGymName);
  const [ownerName, setOwnerName] = useState(initialOwnerName);
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ text: '', isError: false });

    try {
      setSaving(true);
      const payload: any = {
        name: gymName,
        owner_name: ownerName,
      };

      if (phone.trim()) payload.phone = phone.trim();
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      await apiClient.patch(`/gyms/${gymId}/profile`, payload);

      localStorage.setItem('gym_name', gymName);
      localStorage.setItem('gym_owner_name', ownerName);

      onUpdated(gymName, ownerName);
      setMsg({ text: 'Profile updated successfully!', isError: false });
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      const errorDetail = err?.response?.data?.detail || 'Failed to update profile.';
      setMsg({ text: typeof errorDetail === 'string' ? errorDetail : 'Validation error', isError: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d1322] border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
        
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-white">Gym & Owner Settings</h3>
            <p className="text-xs text-slate-400">Update account credentials and contact details</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5"/>
          </button>
        </div>

        {msg.text && (
          <div className={`p-3 rounded-xl text-xs font-semibold text-center ${
            msg.isError 
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5 text-xs sm:text-sm">
          <div>
            <label className="block font-medium text-slate-400 mb-1">Gym Name</label>
            <div className="relative">
              <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/>
              <input
                type="text"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-400 mb-1">Owner Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-400 mb-1">New Mobile / WhatsApp (Optional)</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/>
              <input
                type="text"
                placeholder="Leave blank to keep existing"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60 font-mono"
              />
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3 space-y-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Change Password (Optional)</p>
            
            <div>
              <label className="block font-medium text-slate-400 mb-1">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-95 shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {saving ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}