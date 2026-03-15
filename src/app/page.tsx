'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

type PortalType = 'doctor' | 'patient' | 'pharmacist' | null;

export default function HomePage() {
  const router = useRouter();
  const [activePortal, setActivePortal] = useState<PortalType>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trn, setTrn] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const openPortal = (p: PortalType) => {
    setActivePortal(p);
    setMode('login');
    setError('');
    // Pre-fill demo credentials
    if (p === 'doctor') { setEmail('sclarke@medsync.jm'); setPassword('Doctor123!'); }
    else if (p === 'patient') { setEmail('mreid@medsync.jm'); setPassword('Patient123!'); setTrn('123-456-789'); }
    else if (p === 'pharmacist') { setEmail('nwilliams@carib-pharma.jm'); setPassword('Pharma123!'); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      const role = profile?.role || activePortal;
      showToast('Welcome to MedSync!');
      setTimeout(() => router.push(`/${role}`), 800);
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    if (!trn || !fullName || !dob || !sex) { setError('Please fill in all required fields.'); setLoading(false); return; }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, role: 'patient', full_name: fullName, email, phone });
      const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
      await supabase.from('patients').insert({ profile_id: data.user.id, trn, full_name: fullName, date_of_birth: dob, sex, phone, email, address });
      await supabase.from('audit_logs').insert({ actor_name: fullName, actor_role: 'patient', action: 'Patient self-registered', ip_address: '0.0.0.0' });
      showToast('Account created! Check your email to verify, then log in.');
      setMode('login');
    }
    setLoading(false);
  };

  const portals = [
    { key: 'doctor', label: 'Doctor Portal', icon: '👨‍⚕️', desc: 'Full read/write access to patient records, diagnoses, prescriptions, and AI safety checks.', color: 'from-pink-500/20 to-pink-500/5', border: 'hover:border-pink-500', btn: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500' },
    { key: 'patient', label: 'Patient Portal', icon: '👤', desc: 'Read-only access to your medical history, prescriptions, immunization card, and audit log.', color: 'from-teal-500/20 to-teal-500/5', border: 'hover:border-teal-400', btn: 'bg-teal-600 hover:bg-teal-500' },
    { key: 'pharmacist', label: 'Pharmacist Portal', icon: '💊', desc: 'Scan prescription QR codes, verify medications, and mark prescriptions as dispensed.', color: 'from-purple-500/20 to-purple-500/5', border: 'hover:border-purple-400', btn: 'bg-purple-700 hover:bg-purple-600' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(233,30,140,0.1) 0%, transparent 60%), #0d0d1a' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1a35] border border-[#2a2a50] rounded-xl px-5 py-3 text-sm text-white shadow-xl border-l-4 border-l-pink-500 flex items-center gap-3 animate-in slide-in-from-right">
          ✅ {toast}
        </div>
      )}

      {/* NAV */}
      <nav className="sticky top-0 z-40 border-b border-[#2a2a50] bg-[#0d0d1a]/80 backdrop-blur-xl px-10 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/medsync-logo.png" alt="MedSync" style={{ width: '210px', height: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => openPortal('patient')} className="px-4 py-2 rounded-lg border border-[#2a2a50] text-gray-400 text-sm font-medium hover:border-teal-500 hover:text-white transition-all">Patient Login</button>
          <button onClick={() => openPortal('doctor')} className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-all">Portal Access</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-4xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 rounded-full px-4 py-1.5 text-xs font-semibold text-pink-400 mb-6">
          🇯🇲 National Health Platform · Integrated TRN
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-5 leading-tight" style={{ background: 'linear-gradient(135deg, #fff 0%, #9f67ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Syncronizing<br />Healthcare.
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mb-10 leading-relaxed">
          MedSync centralizes healthcare using your TRN as a lifelong medical identifier — connecting doctors, pharmacies, and patients on one secure platform.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <button onClick={() => { setActivePortal('patient'); setMode('register'); }} className="px-7 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold text-base hover:opacity-90 transition-all shadow-lg shadow-pink-500/20">
            🏥 Register as Patient
          </button>
          <button onClick={() => openPortal('doctor')} className="px-7 py-3 rounded-xl border border-[#2a2a50] text-gray-300 font-semibold text-base hover:border-pink-500 hover:text-white transition-all">
            👨‍⚕️ Doctor Portal
          </button>
        </div>
        <div className="flex gap-10 justify-center">
          {[['3', 'User Portals'], ['100%', 'TRN-Linked'], ['AI', 'Powered Safety']].map(([num, lbl]) => (
            <div key={lbl} className="text-center">
              <div className="text-2xl font-bold text-white">{num}</div>
              <div className="text-xs text-gray-500 mt-0.5">{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PORTAL CARDS */}
      <section className="px-6 pb-16 max-w-5xl mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Access Your Portal</h2>
          <p className="text-gray-400 text-sm">Three dedicated portals with role-specific permissions.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {portals.map((p) => (
            <div key={p.key} onClick={() => openPortal(p.key as PortalType)}
              className={`bg-[#1a1a35] border border-[#2a2a50] ${p.border} rounded-2xl p-7 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}>
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-3xl mx-auto mb-4`}>{p.icon}</div>
              <h3 className="text-base font-bold text-white mb-2">{p.label}</h3>
              <p className="text-gray-400 text-xs mb-5 leading-relaxed">{p.desc}</p>
              <button className={`w-full py-2.5 rounded-xl text-white text-sm font-semibold ${p.btn} transition-all`}>Access Portal</button>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-center text-white mb-8">Platform Capabilities</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            ['🔐', 'TRN-Based Identity', 'One lifelong record per citizen using Tax Registration Number.'],
            ['📱', 'QR Prescription System', 'Encrypted, time-bound QR codes for tamper-proof prescription verification.'],
            ['🤖', 'AI Safety Assistant', 'Read-only AI flags drug interactions, allergy conflicts, and immunization gaps.'],
            ['💉', 'Digital Immunization Cards', 'Track all vaccines with batch numbers, providers, and QR verification.'],
            ['🔒', 'Immutable Audit Logs', 'Every access and modification permanently logged and reviewable.'],
            ['🚨', 'Emergency Access', 'Secure override for life-critical data — always logged.'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="bg-[#1a1a35] border border-[#2a2a50] rounded-xl p-5 hover:border-[#333360] transition-all hover:-translate-y-0.5">
              <div className="text-2xl mb-3">{icon}</div>
              <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LOGIN / REGISTER OVERLAY */}
      {activePortal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-5" onClick={(e) => { if (e.target === e.currentTarget) setActivePortal(null); }}>
          <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-3xl p-8 w-full max-w-md shadow-2xl" style={{ animation: 'slideIn 0.3s ease' }}>
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setActivePortal(null)} className="text-xs text-gray-400 border border-[#2a2a50] px-3 py-1.5 rounded-lg hover:border-pink-500 hover:text-white transition-all">← Back</button>
              <button onClick={() => setActivePortal(null)} className="text-gray-400 hover:text-white text-lg transition-all">✕</button>
            </div>

            {/* Portal icon + title */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">{portals.find(p => p.key === activePortal)?.icon}</div>
              <h2 className="text-xl font-bold text-white">{portals.find(p => p.key === activePortal)?.label}</h2>
              <p className="text-gray-400 text-xs mt-1">{mode === 'login' ? 'Sign in to your account' : 'Create your patient account'}</p>
            </div>

            {/* Demo creds hint */}
            {mode === 'login' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-5 text-xs text-blue-300">
                <div className="font-semibold mb-1">💡 Demo Credentials</div>
                {activePortal === 'doctor' && <div>Email: sclarke@medsync.jm · Password: Doctor123!</div>}
                {activePortal === 'patient' && <div>Email: mreid@medsync.jm · Password: Patient123!</div>}
                {activePortal === 'pharmacist' && <div>Email: nwilliams@carib-pharma.jm · Password: Pharma123!</div>}
              </div>
            )}

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="flex flex-col gap-4">
              {mode === 'register' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Full Name *</label>
                      <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Smith" required className="w-full bg-[#111128] border border-[#2a2a50] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-all placeholder:text-gray-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">TRN *</label>
                      <input value={trn} onChange={e => setTrn(e.target.value)} placeholder="123-456-789" required className="w-full bg-[#111128] border border-[#2a2a50] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-all placeholder:text-gray-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Date of Birth *</label>
                      <input type="date" value={dob} onChange={e => setDob(e.target.value)} required className="w-full bg-[#111128] border border-[#2a2a50] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Sex *</label>
                      <select value={sex} onChange={e => setSex(e.target.value)} required className="w-full bg-[#111128] border border-[#2a2a50] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-all">
                        <option value="">Select</option>
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Phone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="876-555-0000" className="w-full bg-[#111128] border border-[#2a2a50] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-all placeholder:text-gray-600" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Address</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="12 Main St, Kingston" className="w-full bg-[#111128] border border-[#2a2a50] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-all placeholder:text-gray-600" />
                  </div>
                </>
              )}

              {activePortal !== 'patient' || mode === 'login' ? (
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-[#111128] border border-[#2a2a50] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-all placeholder:text-gray-600" placeholder="you@example.com" />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-[#111128] border border-[#2a2a50] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-all placeholder:text-gray-600" placeholder="you@example.com" />
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full bg-[#111128] border border-[#2a2a50] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-all placeholder:text-gray-600" />
              </div>

              {error && <div className="text-red-400 text-xs text-center py-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3">{error}</div>}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #e91e8c, #7c3aed)' }}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
              </button>

              {activePortal === 'patient' && (
                <div className="text-center text-xs text-gray-500">
                  {mode === 'login'
                    ? <span>No account? <button type="button" onClick={() => { setMode('register'); setError(''); }} className="text-pink-400 hover:underline">Register here</button></span>
                    : <span>Already registered? <button type="button" onClick={() => { setMode('login'); setError(''); }} className="text-pink-400 hover:underline">Login here</button></span>}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
