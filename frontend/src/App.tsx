import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  AlertCircle, 
  Plus, 
  MessageSquare, 
  Dumbbell, 
  Search, 
  X, 
  Phone, 
  Calendar, 
  Trash2, 
  IndianRupee, 
  Layers, 
  UserCheck, 
  Sparkles,
  TrendingUp,
  LogOut,
  Settings
} from 'lucide-react';
import { apiClient } from './services/api';
import type { Member, MemberCreatePayload, Plan, AuthResponse } from './services/api';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';

type FilterType = 'all' | 'active' | 'expiring' | 'here_today' | 'expired';

export default function App() {
  const [gymId, setGymId] = useState<string | null>(() => localStorage.getItem('gym_active_id'));
  const [gymName, setGymName] = useState<string>(() => localStorage.getItem('gym_name') || 'PowerFit Arena');
  const [ownerName, setOwnerName] = useState<string>(() => localStorage.getItem('gym_owner_name') || 'Owner');

  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<MemberCreatePayload>({
    full_name: '',
    phone: '',
    email: '',
    plan_id: '',
    expiry_date: '',
    is_active: true,
  });

  const fetchData = async (targetGymId: string) => {
    try {
      setLoading(true);
      
      try {
        const membersRes = await apiClient.get<Member[]>(`/gyms/${targetGymId}/members`);
        setMembers(membersRes.data);
      } catch (err) {
        console.error('Failed to fetch members:', err);
      }

      try {
        const plansRes = await apiClient.get<Plan[]>(`/gyms/${targetGymId}/plans`);
        setPlans(plansRes.data);
        if (plansRes.data.length > 0 && !formData.plan_id) {
          handlePlanSelect(plansRes.data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      }

      try {
        const checkinsRes = await apiClient.get<string[]>(`/gyms/${targetGymId}/attendance/today`);
        setCheckedInIds(checkinsRes.data);
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
      }

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gymId) {
      fetchData(gymId);
    }
  }, [gymId]);

  const handleAuthSuccess = (authData: AuthResponse) => {
    setGymId(authData.gym_id);
    setGymName(authData.gym_name);
    setOwnerName(authData.owner_name);
    fetchData(authData.gym_id);
  };

  const handleSignOut = () => {
    localStorage.removeItem('gym_auth_token');
    localStorage.removeItem('gym_active_id');
    localStorage.removeItem('gym_name');
    localStorage.removeItem('gym_owner_name');
    setGymId(null);
    setMembers([]);
    setPlans([]);
    setCheckedInIds([]);
  };

  const handlePlanSelect = (plan: Plan) => {
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + plan.duration_days);

    setFormData(prev => ({
      ...prev,
      plan_id: plan.id,
      expiry_date: expiry.toISOString().split('T')[0]
    }));
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone || !formData.expiry_date || isSubmitting || !gymId) return;

    try {
      setIsSubmitting(true);
      const payload: MemberCreatePayload = {
        full_name: formData.full_name,
        phone: formData.phone,
        plan_id: formData.plan_id || undefined,
        expiry_date: formData.expiry_date,
        is_active: formData.is_active,
        join_date: new Date().toISOString().split('T')[0],
      };

      if (formData.email && formData.email.trim() !== '') {
        payload.email = formData.email.trim();
      }

      await apiClient.post(`/gyms/${gymId}/members`, payload);
      setIsModalOpen(false);
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        plan_id: plans[0]?.id || '',
        expiry_date: '',
        is_active: true,
      });
      await fetchData(gymId);
    } catch (err) {
      console.error('Failed to create member:', err);
      alert('Error creating member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckIn = async (memberId: string) => {
    if (!gymId) return;
    try {
      await apiClient.post(`/gyms/${gymId}/checkin`, { member_id: memberId });
      setCheckedInIds(prev => (prev.includes(memberId) ? prev : [...prev, memberId]));
    } catch (err) {
      console.error('Check-in failed:', err);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!gymId || !confirm('Are you sure you want to remove this member?')) return;
    try {
      await apiClient.delete(`/gyms/${gymId}/members/${memberId}`);
      await fetchData(gymId);
    } catch (err) {
      console.error('Failed to delete member:', err);
      alert('Could not delete member.');
    }
  };

  const sendWhatsAppReminder = (member: Member) => {
    let cleanPhone = member.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const message = encodeURIComponent(
      `Hi ${member.full_name}! 💪 Your ${gymName} membership expires on ${member.expiry_date}. Renew today to keep your streak going! You can pay via UPI or at the front desk.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const getDaysLeft = (expiryDate?: string) => {
    if (!expiryDate) return 0;
    const diffTime = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const expiringSoonCount = useMemo(() => {
    return members.filter(m => {
      const days = getDaysLeft(m.expiry_date);
      return days >= 0 && days <= 5;
    }).length;
  }, [members]);

  const monthlyRevenue = useMemo(() => {
    if (!members || members.length === 0) return 0;
    return members.reduce((acc, member) => {
      if (!member.is_active) return acc;
      const plan = plans.find(p => p.id === member.plan_id);
      if (!plan) return acc + 1500;
      const duration = plan.duration_days || 30;
      const months = duration / 30;
      return acc + Math.round(plan.price / months);
    }, 0);
  }, [members, plans]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = 
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone.includes(searchQuery);

      if (!matchesSearch) return false;

      const daysLeft = getDaysLeft(m.expiry_date);

      if (activeFilter === 'active') return daysLeft >= 0;
      if (activeFilter === 'expiring') return daysLeft >= 0 && daysLeft <= 5;
      if (activeFilter === 'expired') return daysLeft < 0;
      if (activeFilter === 'here_today') return checkedInIds.includes(m.id);

      return true;
    });
  }, [members, searchQuery, activeFilter, checkedInIds]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!gymId) {
    return <AuthModal onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20">
      
      {/* Background radial glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="fixed top-20 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#090d16]/75 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20">
            <div className="h-full w-full bg-[#090d16] rounded-2xl flex items-center justify-center text-emerald-400">
              <Dumbbell className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white">{gymName}</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wider">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <span>{ownerName}</span>
              <span className="text-slate-600">•</span>
              <span>Hub</span>
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button 
            onClick={() => {
              if (plans.length > 0) handlePlanSelect(plans[0]);
              setIsModalOpen(true);
            }}
            className="group relative flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-300" />
            <span>Add Member</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Gym & Profile Settings"
            className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 border border-slate-800 transition active:scale-95"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            title="Sign out of gym"
            className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 border border-slate-800 transition active:scale-95"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-7 z-10">
        
        {/* Metric Cards Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          <div className="relative overflow-hidden p-5 rounded-2xl border border-slate-800/90 bg-gradient-to-b from-[#0e1424] to-[#0a0f1d] shadow-sm hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Total Members</span>
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">{members.length}</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                Active
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium">Enrolled athletes</div>
          </div>

          <div className="relative overflow-hidden p-5 rounded-2xl border border-slate-800/90 bg-gradient-to-b from-[#0e1424] to-[#0a0f1d] shadow-sm hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Check-ins Today</span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">{checkedInIds.length}</span>
              <span className="text-xs font-semibold text-slate-400">
                / {members.length} on floor
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium">Logged today</div>
          </div>

          <div className="relative overflow-hidden p-5 rounded-2xl border border-slate-800/90 bg-gradient-to-b from-[#0e1424] to-[#0a0f1d] shadow-sm hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Expiring &le; 5 Days</span>
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400 tracking-tight">{expiringSoonCount}</span>
              <span className="text-xs font-semibold text-amber-500/80">Require Action</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium">1-tap reminder ready</div>
          </div>

          <div className="relative overflow-hidden p-5 rounded-2xl border border-slate-800/90 bg-gradient-to-b from-[#0e1424] to-[#0a0f1d] shadow-sm hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Monthly MRR</span>
              <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white tracking-tight">₹{monthlyRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-400/80 font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Recurring estimate
            </div>
          </div>

        </section>

        {/* Filter Pills + Search Bar */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0e1424] border border-slate-800/80 overflow-x-auto text-xs">
              {[
                { id: 'all', label: 'All', count: members.length },
                { id: 'here_today', label: 'Checked In', count: checkedInIds.length },
                { id: 'expiring', label: 'Expiring', count: expiringSoonCount },
                { id: 'active', label: 'Active', count: members.filter(m => getDaysLeft(m.expiry_date) >= 0).length },
                { id: 'expired', label: 'Expired', count: members.filter(m => getDaysLeft(m.expiry_date) < 0).length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as FilterType)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeFilter === tab.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeFilter === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search by name or phone..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-800/90 bg-[#0e1424] text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-all"
              />
            </div>
          </div>
        </section>

        {/* Members Directory */}
        <section className="space-y-3">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading gym members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-16 text-center rounded-2xl border border-dashed border-slate-800/90 bg-[#0a0f1d]/50 text-slate-400 space-y-3">
              <Users className="h-8 w-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold">No athletes found matching this view.</p>
              <button 
                onClick={() => {
                  setActiveFilter('all');
                  setSearchQuery('');
                }}
                className="text-emerald-400 text-xs font-semibold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredMembers.map((member) => {
                const daysLeft = getDaysLeft(member.expiry_date);
                const isExpired = daysLeft < 0;
                const isExpiringSoon = daysLeft >= 0 && daysLeft <= 5;
                const memberPlan = plans.find(p => p.id === member.plan_id);
                const isCheckedIn = checkedInIds.includes(member.id);

                return (
                  <div 
                    key={member.id} 
                    className="group relative p-4 sm:p-5 rounded-2xl border border-slate-800/80 bg-gradient-to-r from-[#0d1322] to-[#0a0f1c] hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-700/60 flex items-center justify-center font-bold text-sm text-slate-200 shadow-inner">
                          {getInitials(member.full_name)}
                        </div>
                        {isCheckedIn && (
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-[#090d16] flex items-center justify-center text-[9px] text-slate-950 font-black">
                            ✓
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                            {member.full_name}
                          </span>

                          {isExpired ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Expired
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                              {daysLeft === 0 ? 'Expires Today' : `${daysLeft}d remaining`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                          )}

                          {memberPlan && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/60">
                              {memberPlan.name} (₹{memberPlan.price})
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5 font-mono">
                            <Phone className="h-3 w-3 text-slate-500" />
                            {member.phone}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            <span>Expiry: <strong className="text-slate-300 font-medium">{member.expiry_date}</strong></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                      <button
                        onClick={() => handleCheckIn(member.id)}
                        disabled={isCheckedIn}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                          isCheckedIn
                            ? 'bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/20 cursor-default'
                            : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 hover:border-emerald-500/40'
                        }`}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>{isCheckedIn ? 'Checked In' : 'Check In'}</span>
                      </button>

                      <button 
                        onClick={() => sendWhatsAppReminder(member)}
                        className="flex items-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm hover:shadow-[#25D366]/10"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Remind</span>
                      </button>

                      <button 
                        onClick={() => handleDeleteMember(member.id)}
                        title="Delete member"
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Add Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d1322] border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-white">Enroll New Athlete</h3>
                <p className="text-xs text-slate-400">Instantly generate membership and access</p>
              </div>
              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-medium text-slate-400 mb-1.5">Athlete Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60 font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1.5">WhatsApp / Mobile Number *</label>
                <input 
                  type="text" 
                  required
                  placeholder="+919876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Membership Tier *</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {plans.map((p) => {
                    const isSelected = formData.plan_id === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handlePlanSelect(p)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected 
                            ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/40' 
                            : 'border-slate-800 bg-[#080c16] text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <p className="font-bold text-xs leading-none mb-1 text-slate-200">{p.name}</p>
                        <p className="text-xs text-emerald-400 font-extrabold">₹{p.price}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1.5">Expiry Date (Auto-calculated)</label>
                <input 
                  type="date" 
                  required
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-[#080c16] text-slate-200 focus:outline-none focus:border-emerald-500/60 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 transition-all active:scale-95 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Enroll Athlete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && gymId && (
        <SettingsModal
          gymId={gymId}
          initialGymName={gymName}
          initialOwnerName={ownerName}
          onClose={() => setIsSettingsOpen(false)}
          onUpdated={(newName, newOwner) => {
            setGymName(newName);
            setOwnerName(newOwner);
          }}
        />
      )}

    </div>
  );
}