'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile, Patient, Prescription, Immunization, AuditLog } from '@/types';
import Sidebar from '@/components/Sidebar';

export default function PatientPortal() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [section, setSection] = useState('dashboard');
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [immunizations, setImmunizations] = useState<Immunization[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [qrPatient, setQrPatient] = useState<Prescription | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/'); return; }

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!prof || prof.role !== 'patient') { router.push('/'); return; }
        setProfile(prof);

        const { data: pat } = await supabase.from('patients').select('*').eq('profile_id', user.id).single();
        if (pat) {
            setPatient(pat);
            const [rxRes, immRes, auditRes] = await Promise.all([
                supabase.from('prescriptions').select('*').eq('patient_id', pat.id).order('created_at', { ascending: false }),
                supabase.from('immunizations').select('*').eq('patient_id', pat.id).order('date_administered', { ascending: false }),
                supabase.from('audit_logs').select('*').eq('patient_id', pat.id).order('created_at', { ascending: false }).limit(50),
            ]);
            setPrescriptions(rxRes.data || []);
            setImmunizations(immRes.data || []);
            setAuditLogs(auditRes.data || []);
        }
        setLoading(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleSection = (s: string) => {
        if (s === 'dashboard') setSection('dashboard');
        else setSection(s);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen" style={{ background: '#0d0d1a' }}>
            <div className="text-center">
                <div className="text-4xl mb-4 animate-pulse">🏥</div>
                <div className="text-gray-400 text-sm">Loading your health record…</div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen" style={{ background: '#0d0d1a' }}>
            <Sidebar role="patient" userName={profile?.full_name || 'Patient'} activeSection={section} onSectionChange={handleSection} onSignOut={handleSignOut} />

            <div className="ml-60 flex-1 flex flex-col">
                {/* Topbar */}
                <div className="sticky top-0 z-20 bg-[#12122a] border-b border-[#2a2a50] px-7 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Patient Portal</span>
                        <span className="text-[#333360]">›</span>
                        <span className="text-white font-semibold capitalize">{section === 'dashboard' ? 'My Dashboard' : section}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {patient && <span className="text-xs text-gray-500 font-mono">TRN: <span className="text-pink-400">{patient.trn}</span></span>}
                        <span className="text-xs text-teal-400 border border-teal-500/30 bg-teal-500/10 px-2 py-1 rounded-lg">🔒 Read-Only Access</span>
                    </div>
                </div>

                <div className="p-7 flex-1">
                    {/* DASHBOARD */}
                    {section === 'dashboard' && (
                        <div>
                            <div className="mb-7">
                                <h1 className="text-2xl font-bold text-white">Welcome, {profile?.full_name?.split(' ')[0]}</h1>
                                <p className="text-gray-400 text-sm mt-1">Here's a summary of your health record.</p>
                            </div>

                            {/* Patient Info Card */}
                            {patient && (
                                <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-6 mb-6">
                                    <div className="flex items-start gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-500/5 flex items-center justify-center text-3xl border border-[#2a2a50]">👤</div>
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                ['TRN', patient.trn],
                                                ['Date of Birth', patient.date_of_birth],
                                                ['Sex', patient.sex || '—'],
                                                ['Blood Type', patient.blood_type || '—'],
                                                ['Phone', patient.phone || '—'],
                                                ['Email', patient.email || '—'],
                                                ['Emergency Contact', patient.emergency_contact_name || '—'],
                                                ['Em. Contact Phone', patient.emergency_contact_phone || '—'],
                                            ].map(([label, val]) => (
                                                <div key={label}>
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-0.5">{label}</div>
                                                    <div className="text-sm text-white font-medium">{val}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stat cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {[
                                    ['💊', prescriptions.length.toString(), 'Total Prescriptions', 'text-green-400', 'rgba(34,197,94,0.1)'],
                                    ['✅', prescriptions.filter(r => r.status === 'Active').length.toString(), 'Active Prescriptions', 'text-teal-400', 'rgba(0,212,180,0.1)'],
                                    ['💉', immunizations.length.toString(), 'Immunizations', 'text-purple-400', 'rgba(124,58,237,0.1)'],
                                    ['📋', auditLogs.length.toString(), 'Access Log Entries', 'text-blue-400', 'rgba(59,130,246,0.1)'],
                                ].map(([icon, val, label, color, bg]) => (
                                    <div key={label} className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-5 hover:border-pink-500/30 transition-all">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: bg }}>{icon}</div>
                                        <div className={`text-2xl font-extrabold mb-1 ${color}`}>{val}</div>
                                        <div className="text-xs text-gray-500">{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Recent Prescriptions */}
                            <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2a2a50]">
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">💊 Active Prescriptions</span>
                                    <button onClick={() => setSection('prescriptions')} className="text-xs text-pink-400 hover:underline">View All →</button>
                                </div>
                                {prescriptions.filter(r => r.status === 'Active').length === 0 ? (
                                    <div className="text-center py-8 text-gray-600 text-sm">No active prescriptions</div>
                                ) : prescriptions.filter(r => r.status === 'Active').slice(0, 3).map(rx => (
                                    <div key={rx.id} className="flex items-center gap-4 py-3 border-b border-[#2a2a50]/50 last:border-0">
                                        <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center text-lg">💊</div>
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-white">{rx.medication} · {rx.dosage}</div>
                                            <div className="text-xs text-gray-500">{rx.frequency} · By {rx.doctor_name}</div>
                                        </div>
                                        <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">Active</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* RECORDS */}
                    {section === 'records' && patient && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-6">My Medical Records</h2>
                            <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-6">
                                <p className="text-gray-400 text-sm text-center py-8">Your medical history is available when visited by a doctor who enters records into MedSync.</p>
                            </div>
                        </div>
                    )}

                    {/* PRESCRIPTIONS */}
                    {section === 'prescriptions' && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-6">My Prescriptions</h2>
                            <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[#2a2a50]">
                                            {['Medication', 'Dosage', 'Frequency', 'Doctor', 'Issued', 'Expires', 'Status', 'QR'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {prescriptions.map(rx => (
                                            <tr key={rx.id} className="border-b border-[#2a2a50]/50 hover:bg-[#1f1f40]/50 transition-all">
                                                <td className="px-4 py-3 text-sm font-semibold text-white">{rx.medication}</td>
                                                <td className="px-4 py-3 text-sm text-gray-300">{rx.dosage}</td>
                                                <td className="px-4 py-3 text-sm text-gray-300">{rx.frequency}</td>
                                                <td className="px-4 py-3 text-sm text-gray-300">{rx.doctor_name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-400">{rx.issue_date}</td>
                                                <td className="px-4 py-3 text-sm text-gray-400">{rx.expiry_date || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rx.status === 'Active' ? 'text-green-400 bg-green-500/10 border border-green-500/30' : rx.status === 'Dispensed' ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>{rx.status}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={() => setQrPatient(rx)} className="text-xs px-2 py-1 rounded-lg border border-[#2a2a50] text-gray-400 hover:border-pink-500 hover:text-white transition-all">📱 QR</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {prescriptions.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No prescriptions found</div>}
                            </div>
                        </div>
                    )}

                    {/* IMMUNIZATIONS */}
                    {section === 'immunizations' && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-6">💉 Immunization Card</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {immunizations.map(imm => (
                                    <div key={imm.id} className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-5 hover:border-purple-500/30 transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-xl flex-shrink-0">💉</div>
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-white mb-1">{imm.vaccine}</div>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    <span className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">{imm.dose}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 space-y-0.5">
                                                    <div>📅 {imm.date_administered}</div>
                                                    <div>🏥 {imm.provider || '—'}</div>
                                                    <div>🔢 Batch: {imm.batch_number || '—'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {immunizations.length === 0 && (
                                    <div className="col-span-2 bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-12 text-center text-gray-600 text-sm">No immunization records found</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* AUDIT LOG */}
                    {section === 'audit' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">🔍 Audit Log</h2>
                                <span className="text-xs text-gray-500 bg-[#1a1a35] border border-[#2a2a50] px-3 py-1.5 rounded-lg">Immutable record of all access to your data</span>
                            </div>
                            <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[#2a2a50]">
                                            {['Action', 'Performed By', 'Role', 'Date & Time', 'IP Address'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.map(log => (
                                            <tr key={log.id} className="border-b border-[#2a2a50]/50 hover:bg-[#1f1f40]/50 transition-all">
                                                <td className="px-4 py-3 text-sm text-white">{log.action}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-white">{log.actor_name}</td>
                                                <td className="px-4 py-3"><span className="text-xs capitalize text-pink-400 bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 rounded-full">{log.actor_role}</span></td>
                                                <td className="px-4 py-3 text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.ip_address || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {auditLogs.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No audit log entries</div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* QR Modal */}
            {qrPatient && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-5" onClick={() => setQrPatient(null)}>
                    <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-3xl p-8 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-2">💊 Prescription QR</h3>
                        <div className="bg-white p-4 rounded-xl mx-auto w-48 h-48 flex items-center justify-center mb-4 text-xs text-gray-800 font-mono text-center break-all">
                            {qrPatient.qr_code}
                        </div>
                        <div className="text-sm font-semibold text-white mb-1">{qrPatient.medication} · {qrPatient.dosage}</div>
                        <div className="text-xs text-gray-400 mb-1">By {qrPatient.doctor_name}</div>
                        <div className="text-xs text-gray-500 mb-4 font-mono">{qrPatient.qr_code}</div>
                        <button onClick={() => setQrPatient(null)} className="w-full py-2.5 rounded-xl border border-[#2a2a50] text-gray-400 text-sm hover:border-pink-500 hover:text-white transition-all">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
