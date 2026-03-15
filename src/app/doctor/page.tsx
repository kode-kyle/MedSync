'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile, Patient, Prescription } from '@/types';
import Sidebar from '@/components/Sidebar';

export default function DoctorPortal() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [section, setSection] = useState('dashboard');
    const [search, setSearch] = useState('');
    const [prescriptions, setAllRx] = useState<(Prescription & { patient_name?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [aiResult, setAiResult] = useState<string>('');
    const [aiPatientId, setAiPatientId] = useState('');
    const [emTrn, setEmTrn] = useState('');
    const [emReason, setEmReason] = useState('');
    const [emResult, setEmResult] = useState<Patient | null>(null);
    const [stats, setStats] = useState({ patients: 0, rx: 0, alerts: 0, imm: 0 });
    const [toast, setToast] = useState('');

    const showToast = (msg: string, type = 'success') => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/'); return; }
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!prof || prof.role !== 'doctor') { router.push('/'); return; }
        setProfile(prof);

        const { data: pats } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
        setPatients(pats || []);

        const { data: rxAll } = await supabase.from('prescriptions').select('*, patients(full_name)').order('created_at', { ascending: false });
        const mappedRx = (rxAll || []).map((r: any) => ({ ...r, patient_name: r.patients?.full_name }));
        setAllRx(mappedRx);

        const { count: immCount } = await supabase.from('immunizations').select('*', { count: 'exact', head: true });
        setStats({ patients: pats?.length || 0, rx: mappedRx.filter(r => r.status === 'Active').length, alerts: 2, imm: immCount || 0 });
        setLoading(false);
    };

    const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/'); };

    const filteredPatients = patients.filter(p =>
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.trn.includes(search) ||
        (p.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const openEmergency = async () => {
        if (!emTrn || !emReason) { showToast('Enter TRN and reason', 'error'); return; }
        const { data } = await supabase.from('patients').select('*').eq('trn', emTrn).single();
        if (!data) { showToast('Patient not found', 'error'); return; }
        await supabase.from('audit_logs').insert({ patient_id: data.id, actor_name: profile?.full_name || 'Doctor', actor_role: 'doctor', action: `EMERGENCY ACCESS — ${emReason}`, ip_address: '0.0.0.0' });
        setEmResult(data);
        showToast('Emergency access granted & logged', 'warning');
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen" style={{ background: '#0d0d1a' }}>
            <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🏥</div><div className="text-gray-400 text-sm">Loading clinical system…</div></div>
        </div>
    );

    return (
        <div className="flex min-h-screen" style={{ background: '#0d0d1a' }}>
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 bg-[#1a1a35] border border-[#2a2a50] border-l-4 border-l-pink-500 rounded-xl px-4 py-3 text-sm text-white shadow-xl">
                    {toast}
                </div>
            )}

            <Sidebar role="doctor" userName={profile?.full_name || 'Doctor'} activeSection={section} onSectionChange={(s) => { setSection(s); if (s === 'new-record') setShowRecordModal(true); }} onSignOut={handleSignOut} />

            <div className="ml-60 flex-1 flex flex-col">
                {/* Topbar */}
                <div className="sticky top-0 z-20 bg-[#12122a] border-b border-[#2a2a50] px-7 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Doctor Portal</span>
                        <span className="text-[#333360]">›</span>
                        <span className="text-white font-semibold capitalize">{section.replace('-', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients by name or TRN…" className="bg-[#111128] border border-[#2a2a50] rounded-xl px-4 py-2 text-sm text-white w-64 focus:outline-none focus:border-pink-500 placeholder:text-gray-600" />
                            {search && (
                                <div className="absolute top-full mt-1 right-0 w-72 bg-[#1a1a35] border border-[#2a2a50] rounded-xl overflow-hidden shadow-xl z-50">
                                    {filteredPatients.slice(0, 5).map(p => (
                                        <div key={p.id} onClick={() => { setSelectedPatient(p); setSection('patients'); setSearch(''); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#252545] cursor-pointer transition-all">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold">{p.full_name.charAt(0)}</div>
                                            <div><div className="text-sm font-semibold text-white">{p.full_name}</div><div className="text-xs text-gray-500">TRN: {p.trn}</div></div>
                                        </div>
                                    ))}
                                    {filteredPatients.length === 0 && <div className="px-4 py-3 text-sm text-gray-500 text-center">No patients found</div>}
                                </div>
                            )}
                        </div>
                        <button onClick={() => setShowRecordModal(true)} className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all" style={{ background: 'linear-gradient(135deg,#e91e8c,#7c3aed)' }}>➕ New Record</button>
                    </div>
                </div>

                <div className="p-7">
                    {/* DASHBOARD */}
                    {section === 'dashboard' && (
                        <div>
                            <div className="mb-7">
                                <h1 className="text-2xl font-bold text-white">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {profile?.full_name?.split(' ')[0]}</h1>
                                <p className="text-gray-400 text-sm mt-1">{new Date().toLocaleDateString('en-JM', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                {[
                                    ['👥', stats.patients, 'Total Patients', 'text-pink-400', 'rgba(233,30,140,0.12)'],
                                    ['💊', stats.rx, 'Active Prescriptions', 'text-green-400', 'rgba(34,197,94,0.1)'],
                                    ['⚠️', stats.alerts, 'AI Alerts', 'text-amber-400', 'rgba(245,158,11,0.1)'],
                                    ['💉', stats.imm, 'Immunizations', 'text-purple-400', 'rgba(124,58,237,0.1)'],
                                ].map(([icon, val, label, color, bg]) => (
                                    <div key={String(label)} className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-5 hover:border-pink-500/30 transition-all">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: String(bg) }}>{icon}</div>
                                        <div className={`text-3xl font-extrabold mb-1 ${color}`}>{val}</div>
                                        <div className="text-xs text-gray-500">{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Recent patients */}
                            <div className="grid grid-cols-2 gap-5">
                                <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-5">
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2a2a50]">
                                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">👥 Recent Patients</span>
                                        <button onClick={() => setSection('patients')} className="text-xs text-pink-400 hover:underline">View All →</button>
                                    </div>
                                    {patients.slice(0, 5).map(p => (
                                        <div key={p.id} onClick={() => { setSelectedPatient(p); setSection('patients'); }} className="flex items-center gap-3 py-2.5 border-b border-[#2a2a50]/50 last:border-0 cursor-pointer hover:opacity-80 transition-all">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">{p.full_name.charAt(0)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-white truncate">{p.full_name}</div>
                                                <div className="text-xs text-gray-500">TRN: {p.trn}</div>
                                            </div>
                                            <span className="text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded-full">{p.blood_type || '—'}</span>
                                        </div>
                                    ))}
                                    {patients.length === 0 && <div className="text-center py-8 text-gray-600 text-sm">No patients yet</div>}
                                </div>

                                {/* Quick Actions */}
                                <div className="flex flex-col gap-4">
                                    <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-5">
                                        <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 pb-3 border-b border-[#2a2a50]">⚡ Quick Actions</div>
                                        {[
                                            ['📋', 'New Patient Record', 'Start a new visit', () => setShowRecordModal(true)],
                                            ['💊', 'View Prescriptions', 'All issued prescriptions', () => setSection('prescriptions')],
                                            ['🤖', 'AI Safety Check', 'Run drug interaction analysis', () => setSection('ai')],
                                            ['🚨', 'Emergency Access', 'Urgent patient data', () => setSection('emergency')],
                                        ].map(([icon, title, desc, action]) => (
                                            <button key={String(title)} onClick={action as any} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#252545] transition-all text-left mb-1">
                                                <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center text-lg flex-shrink-0">{String(icon)}</div>
                                                <div><div className="text-sm font-semibold text-white">{String(title)}</div><div className="text-xs text-gray-500">{String(desc)}</div></div>
                                                <span className="ml-auto text-gray-600 text-sm">→</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                                        <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">⚠️ AI Alerts</div>
                                        <div className="text-xs text-amber-300/80 leading-relaxed">🔴 Marcus Reid — Penicillin allergy conflicts with common antibiotics.</div>
                                        <div className="text-xs text-amber-300/80 leading-relaxed mt-2">🟡 Jonathon Ellis — HbA1c elevated 7.8%. Consider dosage review.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PATIENTS */}
                    {section === 'patients' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Patient Records</h2>
                                <button onClick={() => setShowRecordModal(true)} className="px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#e91e8c,#7c3aed)' }}>➕ New Patient</button>
                            </div>
                            <div className="mb-4">
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by name, TRN, email…" className="w-full bg-[#1a1a35] border border-[#2a2a50] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500 placeholder:text-gray-600" />
                            </div>
                            <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[#2a2a50]">
                                            {['Patient', 'TRN', 'DOB / Age', 'Blood Type', 'Phone', 'Action'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPatients.map(p => {
                                            const age = p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000)) : '?';
                                            return (
                                                <tr key={p.id} className="border-b border-[#2a2a50]/50 hover:bg-[#1f1f40]/60 transition-all">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{p.full_name.charAt(0)}</div>
                                                            <div><div className="text-sm font-semibold text-white">{p.full_name}</div><div className="text-xs text-gray-500">{p.email || '—'}</div></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-pink-400 text-xs">{p.trn}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-300">{p.date_of_birth}<br /><span className="text-gray-500">{age} yrs · {p.sex || '—'}</span></td>
                                                    <td className="px-4 py-3"><span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full">{p.blood_type || '—'}</span></td>
                                                    <td className="px-4 py-3 text-sm text-gray-300">{p.phone || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <button onClick={() => { setSelectedPatient(p); setShowRecordModal(true); }} className="px-3 py-1.5 rounded-lg border border-[#2a2a50] text-gray-400 text-xs hover:border-pink-500 hover:text-white transition-all">📋 Open</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {filteredPatients.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No patients found</div>}
                            </div>
                        </div>
                    )}

                    {/* PRESCRIPTIONS */}
                    {section === 'prescriptions' && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-6">All Prescriptions</h2>
                            <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl overflow-hidden">
                                <table className="w-full">
                                    <thead><tr className="border-b border-[#2a2a50]">
                                        {['Patient', 'Medication', 'Dosage', 'Frequency', 'Issued', 'Expires', 'Status', 'QR Code'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</th>
                                        ))}
                                    </tr></thead>
                                    <tbody>
                                        {prescriptions.map(rx => (
                                            <tr key={rx.id} className="border-b border-[#2a2a50]/50 hover:bg-[#1f1f40]/60 transition-all">
                                                <td className="px-4 py-3 text-sm font-semibold text-white">{rx.patient_name || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-300">{rx.medication}</td>
                                                <td className="px-4 py-3 text-sm text-gray-300">{rx.dosage}</td>
                                                <td className="px-4 py-3 text-sm text-gray-300">{rx.frequency}</td>
                                                <td className="px-4 py-3 text-xs text-gray-400">{rx.issue_date}</td>
                                                <td className="px-4 py-3 text-xs text-gray-400">{rx.expiry_date || '—'}</td>
                                                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rx.status === 'Active' ? 'text-green-400 bg-green-500/10 border border-green-500/30' : rx.status === 'Dispensed' ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>{rx.status}</span></td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-500">{rx.qr_code}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {prescriptions.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No prescriptions found</div>}
                            </div>
                        </div>
                    )}

                    {/* AI ASSISTANT */}
                    {section === 'ai' && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">🤖 AI Clinical Assistant</h2>
                            <p className="text-gray-400 text-sm mb-6">TRN-Health Sentinel — Read-only clinical decision support.</p>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-6">
                                    <h3 className="text-sm font-bold text-white mb-4">Select Patient</h3>
                                    <input value={aiPatientId} onChange={e => setAiPatientId(e.target.value)} placeholder="Search patient name or TRN…" className="w-full bg-[#111128] border border-[#2a2a50] rounded-xl px-4 py-2.5 text-sm text-white mb-4 focus:outline-none focus:border-pink-500 placeholder:text-gray-600" />
                                    {patients.filter(p => p.full_name.toLowerCase().includes(aiPatientId.toLowerCase()) || p.trn.includes(aiPatientId)).slice(0, 5).map(p => (
                                        <div key={p.id} onClick={async () => {
                                            const [{ data: allergies }, { data: meds }, { data: history }] = await Promise.all([
                                                supabase.from('allergies').select('*').eq('patient_id', p.id),
                                                supabase.from('current_medications').select('*').eq('patient_id', p.id),
                                                supabase.from('medical_history').select('*').eq('patient_id', p.id),
                                            ]);
                                            const alerts = [];
                                            if (allergies?.length) alerts.push(`🔴 HIGH PRIORITY: Patient has ${allergies.length} known allergy/allergies (${allergies.map((a: any) => a.allergen).join(', ')}). Cross-check all prescriptions.`);
                                            if (meds?.length) alerts.push(`🟡 ${meds.length} current medication(s) on record. Review for polypharmacy interactions.`);
                                            if (history?.filter((h: any) => h.status === 'Active').length) alerts.push(`🔵 Active conditions: ${history.filter((h: any) => h.status === 'Active').map((h: any) => h.condition).join(', ')}.`);
                                            if (!alerts.length) alerts.push('✅ No critical flags detected. Patient profile appears safe for standard treatment.');
                                            alerts.push('⚕️ Final clinical decision rests with the attending physician.');
                                            setAiResult(`AI Analysis for ${p.full_name} (TRN: ${p.trn})\n\n` + alerts.join('\n\n'));
                                        }} className="flex items-center gap-3 p-3 rounded-xl border border-[#2a2a50] hover:border-pink-500 cursor-pointer transition-all mb-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold">{p.full_name.charAt(0)}</div>
                                            <div><div className="text-sm font-semibold text-white">{p.full_name}</div><div className="text-xs text-gray-500">TRN: {p.trn}</div></div>
                                            <span className="ml-auto text-xs text-pink-400">Analyze →</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-[#12122a] border border-[#2a2a50] rounded-2xl p-6 flex flex-col">
                                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#2a2a50]">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-xl">🤖</div>
                                        <div><div className="text-sm font-bold text-white">TRN-Health Sentinel</div><div className="text-xs text-gray-500">Clinical Decision Support Engine</div></div>
                                    </div>
                                    <pre className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap flex-1">{aiResult || 'Select a patient above to run AI safety analysis on their allergies, medications, and medical history.'}</pre>
                                    <div className="mt-4 pt-4 border-t border-[#2a2a50] text-xs text-amber-400/70 italic">⚕️ Final clinical decision rests with the attending physician.</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EMERGENCY */}
                    {section === 'emergency' && (
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-xl">🚨</div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Emergency Access</h2>
                                    <p className="text-gray-400 text-sm">Every access is permanently logged and visible to the patient.</p>
                                </div>
                            </div>
                            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-6 text-sm text-red-300">
                                ⚠️ This provides read-only access to allergies, blood type, and active conditions only. All access is immutably recorded.
                            </div>
                            <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-6 max-w-md mb-6">
                                <div className="mb-4">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Patient TRN *</label>
                                    <input value={emTrn} onChange={e => setEmTrn(e.target.value)} placeholder="123-456-789" className="w-full bg-[#111128] border border-[#2a2a50] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 placeholder:text-gray-600" />
                                </div>
                                <div className="mb-5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Reason for Emergency Access *</label>
                                    <textarea value={emReason} onChange={e => setEmReason(e.target.value)} rows={3} placeholder="Describe the medical emergency…" className="w-full bg-[#111128] border border-[#2a2a50] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 placeholder:text-gray-600 resize-none" />
                                </div>
                                <button onClick={openEmergency} className="w-full py-3 rounded-xl text-white font-semibold text-sm bg-red-600 hover:bg-red-500 transition-all">🔓 Access Emergency Data</button>
                            </div>
                            {emResult && (
                                <div className="bg-[#1a1a35] border border-red-500/30 rounded-2xl p-6">
                                    <h3 className="text-sm font-bold text-red-400 mb-4">🚨 Emergency Data — {emResult.full_name}</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div><div className="text-[10px] text-gray-500 uppercase mb-1">Blood Type</div><span className="text-xl font-bold text-red-400">{emResult.blood_type || 'Unknown'}</span></div>
                                        <div><div className="text-[10px] text-gray-500 uppercase mb-1">Phone</div><div className="text-sm text-white">{emResult.phone || '—'}</div></div>
                                        <div><div className="text-[10px] text-gray-500 uppercase mb-1">Emergency Contact</div><div className="text-sm text-white">{emResult.emergency_contact_name || '—'}</div></div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-[#2a2a50] text-xs text-red-400/70">This access has been permanently logged. Reason: "{emReason}"</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* New Record Modal */}
            {showRecordModal && (
                <PatientRecordModal profile={profile} patient={selectedPatient} onClose={() => { setShowRecordModal(false); setSelectedPatient(null); }} onSaved={() => { setShowRecordModal(false); setSelectedPatient(null); loadData(); showToast('Patient record saved!'); }} />
            )}
        </div>
    );
}

// ─── Patient Record Modal ─────────────────────────────────────────────────────
function PatientRecordModal({ profile, patient, onClose, onSaved }: { profile: Profile | null; patient: Patient | null; onClose: () => void; onSaved: () => void }) {
    const [tab, setTab] = useState(0);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        full_name: patient?.full_name || '', trn: patient?.trn || '', dob: patient?.date_of_birth || '',
        sex: patient?.sex || '', blood: patient?.blood_type || '', phone: patient?.phone || '',
        email: patient?.email || '', address: patient?.address || '',
        emName: patient?.emergency_contact_name || '', emPhone: patient?.emergency_contact_phone || '', notes: patient?.general_notes || '',
    });
    const [visit, setVisit] = useState({ reason: '', symptoms: '', duration: '', clinic: '', date: new Date().toISOString().split('T')[0], bp: '', hr: '', temp: '', rr: '', height: '', weight: '', bmi: '', spo2: '', primaryDx: '', secondaryDx: '', dxNotes: '', drNotes: '' });
    const [rxList, setRxList] = useState<any[]>([]);
    const [medHistory, setMedHistory] = useState<any[]>([]);
    const [allergies, setAllergies] = useState<any[]>([]);

    const tabs = ['Visit Info', 'Vital Signs', 'Med History', 'Allergies', 'Prescriptions', 'Diagnosis', "Doctor's Notes"];

    const saveAll = async () => {
        if (!form.full_name || !form.trn) { alert('Name and TRN are required'); return; }
        setSaving(true);
        let patientId = patient?.id;
        if (!patientId) {
            const { data: newPat } = await supabase.from('patients').insert({ trn: form.trn, full_name: form.full_name, date_of_birth: form.dob, sex: form.sex, blood_type: form.blood, phone: form.phone, email: form.email, address: form.address, emergency_contact_name: form.emName, emergency_contact_phone: form.emPhone, general_notes: form.notes }).select().single();
            patientId = newPat?.id;
        } else {
            await supabase.from('patients').update({ full_name: form.full_name, sex: form.sex, blood_type: form.blood, phone: form.phone, email: form.email, address: form.address, emergency_contact_name: form.emName, emergency_contact_phone: form.emPhone, general_notes: form.notes }).eq('id', patientId);
        }
        if (!patientId) { setSaving(false); return; }
        // Visit
        await supabase.from('visits').insert({ patient_id: patientId, doctor_name: profile?.full_name || 'Doctor', clinic_name: visit.clinic, visit_date: visit.date, reason_for_visit: visit.reason, symptoms: visit.symptoms, symptom_duration: visit.duration, blood_pressure: visit.bp, heart_rate: visit.hr ? parseFloat(visit.hr) : null, body_temp: visit.temp ? parseFloat(visit.temp) : null, respiratory_rate: visit.rr ? parseFloat(visit.rr) : null, height: visit.height, weight: visit.weight ? parseFloat(visit.weight) : null, bmi: visit.bmi ? parseFloat(visit.bmi) : null, spo2: visit.spo2 ? parseFloat(visit.spo2) : null, primary_diagnosis: visit.primaryDx, secondary_diagnosis: visit.secondaryDx, diagnosis_notes: visit.dxNotes, doctor_notes: visit.drNotes });
        // Prescriptions
        for (const rx of rxList) {
            if (rx.medication) {
                const qr = `MED-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                await supabase.from('prescriptions').insert({ patient_id: patientId, doctor_name: profile?.full_name || 'Doctor', medication: rx.medication, dosage: rx.dosage, frequency: rx.frequency, issue_date: visit.date, expiry_date: rx.expires, status: 'Active', qr_code: qr });
            }
        }
        // Allergies
        for (const a of allergies) {
            if (a.allergen) await supabase.from('allergies').insert({ patient_id: patientId, allergen: a.allergen, reaction: a.reaction, severity: a.severity || 'Mild' });
        }
        // Med history
        for (const h of medHistory) {
            if (h.condition) await supabase.from('medical_history').insert({ patient_id: patientId, condition: h.condition, status: h.status || 'Active', notes: h.notes });
        }
        await supabase.from('audit_logs').insert({ patient_id: patientId, actor_name: profile?.full_name || 'Doctor', actor_role: 'doctor', action: patient ? 'Record updated' : 'New patient record created', ip_address: '0.0.0.0' });
        setSaving(false);
        onSaved();
    };

    const f = (field: string, val: string) => setForm(prev => ({ ...prev, [field]: val }));
    const v = (field: string, val: string) => setVisit(prev => ({ ...prev, [field]: val }));

    const inputCls = "w-full bg-[#111128] border border-[#2a2a50] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 placeholder:text-gray-600 transition-all";
    const labelCls = "text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block";

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#12122a] border border-[#2a2a50] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#2a2a50] flex items-center justify-between flex-shrink-0">
                    <h2 className="text-base font-bold text-white">{patient ? `📋 ${patient.full_name}` : '📋 New Patient Record'}</h2>
                    <div className="flex gap-3">
                        <button onClick={saveAll} disabled={saving} className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg,#e91e8c,#7c3aed)' }}>
                            {saving ? 'Saving…' : '💾 Save Record'}
                        </button>
                        <button onClick={onClose} className="px-3 py-2 rounded-xl border border-[#2a2a50] text-gray-400 text-sm hover:border-pink-500 hover:text-white transition-all">✕</button>
                    </div>
                </div>

                {/* Patient Header Fields */}
                <div className="px-6 py-4 border-b border-[#2a2a50] flex-shrink-0">
                    <input value={form.full_name} onChange={e => f('full_name', e.target.value)} placeholder="Patient Full Name…" className="text-2xl font-bold bg-transparent text-white w-full focus:outline-none placeholder:text-gray-700 border-b border-transparent focus:border-pink-500/50 pb-1 mb-4 transition-all" />
                    <div className="grid grid-cols-5 gap-3">
                        {[['TRN', 'trn', '123-456-789'], ['Date of Birth', 'dob', ''], ['Sex', 'sex', ''], ['Blood Type', 'blood', ''], ['Phone', 'phone', '876-555-0000']].map(([lbl, key, ph]) => (
                            <div key={key}>
                                <div className={labelCls}>{lbl}</div>
                                {lbl === 'Sex' ? (
                                    <select value={form[key as keyof typeof form]} onChange={e => f(key, e.target.value)} className={inputCls}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select>
                                ) : lbl === 'Blood Type' ? (
                                    <select value={form[key as keyof typeof form]} onChange={e => f(key, e.target.value)} className={inputCls}><option value="">—</option>{['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bt => <option key={bt}>{bt}</option>)}</select>
                                ) : (
                                    <input type={key === 'dob' ? 'date' : 'text'} value={form[key as keyof typeof form]} onChange={e => f(key, e.target.value)} placeholder={ph} className={inputCls} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto border-b border-[#2a2a50] flex-shrink-0 px-2">
                    {tabs.map((t, i) => (
                        <button key={t} onClick={() => setTab(i)} className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${tab === i ? 'border-pink-500 text-pink-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>{t}</button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Visit Info */}
                    {tab === 0 && (
                        <div className="grid grid-cols-2 gap-4">
                            {[['Reason for Visit', 'reason', 'Chief complaint'], ['Symptoms', 'symptoms', 'List symptoms'], ['Duration of Symptoms', 'duration', 'e.g. 3 days'], ['Clinic / Hospital', 'clinic', 'Institution']].map(([l, k, p]) => (
                                <div key={k}>
                                    <label className={labelCls}>{l}</label>
                                    <input value={visit[k as keyof typeof visit]} onChange={e => v(k, e.target.value)} placeholder={p} className={inputCls} />
                                </div>
                            ))}
                            <div><label className={labelCls}>Visit Date</label><input type="date" value={visit.date} onChange={e => v('date', e.target.value)} className={inputCls} /></div>
                        </div>
                    )}
                    {/* Vital Signs */}
                    {tab === 1 && (
                        <div className="grid grid-cols-2 gap-4">
                            {[['Blood Pressure (mmHg)', 'bp', '120/80'], ['Heart Rate (bpm)', 'hr', '72'], ['Body Temperature (°F)', 'temp', '98.6'], ['Respiratory Rate', 'rr', '16'], ['Height', 'height', "5'10\""], ['Weight (lbs)', 'weight', '160'], ['O2 Saturation (%)', 'spo2', '98'], ['BMI (auto)', 'bmi', '']].map(([l, k, p]) => (
                                <div key={k}>
                                    <label className={labelCls}>{l}</label>
                                    <input value={visit[k as keyof typeof visit]} onChange={e => {
                                        v(k, e.target.value);
                                        if (k === 'weight' || k === 'height') {
                                            const w = parseFloat(k === 'weight' ? e.target.value : visit.weight);
                                            const h = k === 'height' ? e.target.value : visit.height;
                                            if (w && h) {
                                                const m = h.match(/(\d+)'(\d+)?/);
                                                if (m) { const cm = parseInt(m[1]) * 30.48 + parseInt(m[2] || '0') * 2.54; v('bmi', (w * 0.453592 / ((cm / 100) ** 2)).toFixed(1)); }
                                            }
                                        }
                                    }} placeholder={p} className={inputCls + (k === 'bmi' ? ' opacity-70' : '')} readOnly={k === 'bmi'} />
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Medical History */}
                    {tab === 2 && (
                        <div>
                            {medHistory.map((h, i) => (
                                <div key={i} className="bg-[#1a1a35] border border-[#2a2a50] rounded-xl p-4 mb-3 relative">
                                    <button onClick={() => setMedHistory(prev => prev.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-gray-600 hover:text-red-400 text-xs">✕</button>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div><label className={labelCls}>Condition</label><input value={h.condition} onChange={e => setMedHistory(prev => prev.map((x, j) => j === i ? { ...x, condition: e.target.value } : x))} className={inputCls} placeholder="Condition name" /></div>
                                        <div><label className={labelCls}>Status</label><select value={h.status} onChange={e => setMedHistory(prev => prev.map((x, j) => j === i ? { ...x, status: e.target.value } : x))} className={inputCls}><option>Active</option><option>Resolved</option><option>Chronic</option></select></div>
                                        <div><label className={labelCls}>Notes</label><input value={h.notes} onChange={e => setMedHistory(prev => prev.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} className={inputCls} placeholder="Notes" /></div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setMedHistory(prev => [...prev, { condition: '', status: 'Active', notes: '' }])} className="w-full py-2.5 rounded-xl border border-dashed border-[#2a2a50] text-gray-500 text-sm hover:border-pink-500 hover:text-pink-400 transition-all">➕ Add Condition</button>
                        </div>
                    )}
                    {/* Allergies */}
                    {tab === 3 && (
                        <div>
                            {allergies.map((a, i) => (
                                <div key={i} className="bg-[#1a1a35] border border-[#2a2a50] rounded-xl p-4 mb-3 relative">
                                    <button onClick={() => setAllergies(prev => prev.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-gray-600 hover:text-red-400 text-xs">✕</button>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div><label className={labelCls}>Allergen</label><input value={a.allergen} onChange={e => setAllergies(prev => prev.map((x, j) => j === i ? { ...x, allergen: e.target.value } : x))} className={inputCls} placeholder="Drug/Food/Environmental" /></div>
                                        <div><label className={labelCls}>Reaction</label><input value={a.reaction} onChange={e => setAllergies(prev => prev.map((x, j) => j === i ? { ...x, reaction: e.target.value } : x))} className={inputCls} placeholder="Rash, anaphylaxis…" /></div>
                                        <div><label className={labelCls}>Severity</label><select value={a.severity} onChange={e => setAllergies(prev => prev.map((x, j) => j === i ? { ...x, severity: e.target.value } : x))} className={inputCls}><option>Mild</option><option>Moderate</option><option>Severe</option></select></div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setAllergies(prev => [...prev, { allergen: '', reaction: '', severity: 'Mild' }])} className="w-full py-2.5 rounded-xl border border-dashed border-[#2a2a50] text-gray-500 text-sm hover:border-pink-500 hover:text-pink-400 transition-all">➕ Add Allergy</button>
                        </div>
                    )}
                    {/* Prescriptions */}
                    {tab === 4 && (
                        <div>
                            {rxList.map((rx, i) => (
                                <div key={i} className="bg-[#1a1a35] border border-[#2a2a50] rounded-xl p-4 mb-3 relative">
                                    <button onClick={() => setRxList(prev => prev.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-gray-600 hover:text-red-400 text-xs">✕</button>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div><label className={labelCls}>Medication</label><input value={rx.medication} onChange={e => setRxList(prev => prev.map((x, j) => j === i ? { ...x, medication: e.target.value } : x))} className={inputCls} placeholder="Drug name" /></div>
                                        <div><label className={labelCls}>Dosage</label><input value={rx.dosage} onChange={e => setRxList(prev => prev.map((x, j) => j === i ? { ...x, dosage: e.target.value } : x))} className={inputCls} placeholder="e.g. 10mg" /></div>
                                        <div><label className={labelCls}>Frequency</label><select value={rx.frequency} onChange={e => setRxList(prev => prev.map((x, j) => j === i ? { ...x, frequency: e.target.value } : x))} className={inputCls}>{['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Weekly'].map(f => <option key={f}>{f}</option>)}</select></div>
                                        <div><label className={labelCls}>Expiry Date</label><input type="date" value={rx.expires} onChange={e => setRxList(prev => prev.map((x, j) => j === i ? { ...x, expires: e.target.value } : x))} className={inputCls} /></div>
                                    </div>
                                    <div className="mt-3 bg-[#0d0d1a] rounded-lg px-3 py-2 text-xs text-gray-500">📱 QR code will be auto-generated on save.</div>
                                </div>
                            ))}
                            <button onClick={() => setRxList(prev => [...prev, { medication: '', dosage: '', frequency: 'Once daily', expires: '' }])} className="w-full py-2.5 rounded-xl border border-dashed border-[#2a2a50] text-gray-500 text-sm hover:border-pink-500 hover:text-pink-400 transition-all">➕ New Prescription</button>
                        </div>
                    )}
                    {/* Diagnosis */}
                    {tab === 5 && (
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelCls}>Primary Diagnosis</label><input value={visit.primaryDx} onChange={e => v('primaryDx', e.target.value)} placeholder="ICD-10 code or description" className={inputCls} /></div>
                            <div><label className={labelCls}>Secondary Diagnosis</label><input value={visit.secondaryDx} onChange={e => v('secondaryDx', e.target.value)} placeholder="ICD-10 or description" className={inputCls} /></div>
                            <div className="col-span-2"><label className={labelCls}>Notes / Observations</label><textarea value={visit.dxNotes} onChange={e => v('dxNotes', e.target.value)} rows={5} placeholder="Clinical notes…" className={inputCls + ' resize-none'} /></div>
                        </div>
                    )}
                    {/* Doctor Notes */}
                    {tab === 6 && (
                        <div>
                            <label className={labelCls}>Doctor's Notes</label>
                            <textarea value={visit.drNotes} onChange={e => v('drNotes', e.target.value)} rows={12} placeholder="Type detailed clinical notes, observations, and treatment plans…" className={inputCls + ' resize-none'} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
