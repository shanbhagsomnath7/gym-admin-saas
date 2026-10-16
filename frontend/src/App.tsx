import React, { useEffect, useState } from 'react';
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
  Layers
} from 'lucide-react';
import { apiClient } from './services/api';
import type { Member, MemberCreatePayload, Plan } from './services/api';

const GYM_ID = 'f0038c6c-8afb-4608-b71b-8377314e343b';

export default function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membersRes, plansRes] = await Promise.all([
        apiClient.get<Member[]>(`/gyms/${GYM_ID}/members`),
        apiClient.get<Plan[]>(`/gyms/${GYM_ID}/plans`)
      ]);
      setMembers(membersRes.data);
      setPlans(plansRes.data);
      if (plansRes.data.length > 0 && !formData.plan_id) {
        // Auto-select first plan by default
        handlePlanSelect(plansRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When a plan is chosen, auto-compute expiry date
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
    if (!formData.full_name || !formData.phone || !formData.expiry_date || isSubmitting) return;

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

      await apiClient.post(`/gyms/${GYM_ID}/members`, payload);
      setIsModalOpen(false);
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        plan_id: plans[0]?.id || '',
        expiry_date: '',
        is_active: true,
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to create member:', err);
      alert('Error creating member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await apiClient.delete(`/gyms/${GYM_ID}/members/${memberId}`);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete member:', err);
      alert('Could not delete member.');
    }
  };

  const sendWhatsAppReminder = (member: Member) => {
    let cleanPhone = member.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const message = encodeURIComponent(
      `Hi ${member.full_name}! Your PowerFit Arena membership expires on ${member.expiry_date}. Renew today to keep your streak going! You can pay via UPI or at the front desk.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const getDaysLeft = (expiryDate: string) => {
    const diffTime = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone.includes(searchQuery)
  );

  const expiringSoonCount = members.filter(m => {
    const days = getDaysLeft(m.expiry_date);
    return days >= 0 && days <= 5;
  }).length;

  // Monthly Revenue Estimate Calculation:
  // (Plan Price / (duration_days / 30))
  const monthlyRevenue = members.reduce((acc, member) => {
    if (!member.is_active) return acc;
    const plan = plans.find(p => p.id === member.plan_id);
    if (!plan) return acc + 1500; // default baseline if no plan attached
    const months = plan.duration_days / 30;
    return acc + Math.round(plan.price / months);
  }, 0);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-[#0d1322]/80 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">PowerFit Arena</h1>
            <p className="text-xs text-slate-400">Admin Operations Dashboard</p>
          </div>
        </div>

        <button 
          onClick={() => {
            if (plans.length > 0) handlePlanSelect(plans[0]);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Add Member</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-8 space-y-6">
        
        {/* Metric Cards */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0e1424] flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium">Total Members</p>
              <h3 className="text-2xl font-bold">{members.length}</h3>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-[#0e1424] flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium">Expiring &le; 5 Days</p>
              <h3 className="text-2xl font-bold text-amber-400">{expiringSoonCount}</h3>
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 p-4 rounded-xl border border-slate-800 bg-[#0e1424] flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium">Est. Monthly MRR</p>
              <h3 className="text-2xl font-bold text-emerald-400">
                ₹{monthlyRevenue.toLocaleString('en-IN')}
              </h3>
            </div>
          </div>
        </section>

        {/* Member Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search member by name or mobile number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-[#0e1424] text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Members List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            <span>Members Directory</span>
            <span>{filteredMembers.length} Found</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading directory...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 text-slate-400 space-y-2">
              <p>No members registered yet.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-emerald-400 text-sm font-semibold hover:underline"
              >
                + Register First Member
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredMembers.map((member) => {
                const daysLeft = getDaysLeft(member.expiry_date);
                const isExpired = daysLeft < 0;
                const isExpiringSoon = daysLeft >= 0 && daysLeft <= 5;
                const memberPlan = plans.find(p => p.id === member.plan_id);

                return (
                  <div 
                    key={member.id} 
                    className="p-4 rounded-xl border border-slate-800 bg-[#0e1424] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-base text-slate-100">{member.full_name}</span>
                        {isExpired ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Expired
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {daysLeft === 0 ? 'Expires Today' : `${daysLeft}d left`}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        )}

                        {memberPlan && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {memberPlan.name}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-500" />
                          {member.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          Expires: {member.expiry_date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <button 
                        onClick={() => sendWhatsAppReminder(member)}
                        className="flex items-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Remind on WhatsApp</span>
                      </button>

                      <button 
                        onClick={() => handleDeleteMember(member.id)}
                        title="Delete member"
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e1424] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">New Member Registration</h3>
              <button 
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Vicky Patil"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-[#090d16] text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Mobile / WhatsApp Number *</label>
                <input 
                  type="text" 
                  required
                  placeholder="+919876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-[#090d16] text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Plan Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Select Membership Plan *</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {plans.map((p) => {
                    const isSelected = formData.plan_id === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handlePlanSelect(p)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isSelected 
                            ? 'border-emerald-500 bg-emerald-500/10 text-white' 
                            : 'border-slate-800 bg-[#090d16] text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <p className="font-semibold text-xs leading-none mb-1">{p.name}</p>
                        <p className="text-[11px] text-emerald-400 font-bold">₹{p.price}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Expiry Date (Auto-calculated)</label>
                <input 
                  type="date" 
                  required
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-[#090d16] text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-95 shadow-md shadow-emerald-500/10 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}