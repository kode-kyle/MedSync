'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile, Prescription } from '@/types';
import Sidebar from '@/components/Sidebar';

export default function PharmacistPortal() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [section, setSection] = useState('dashboard');
    const [qrInput, setQrInput] = useState('');
    const [scanning, setScanning] = useState(false);
    const [rxResult, setRxResult] = useState<(Prescription & { patient_trn?: string; patient_name?: string }) | null>(null);
    const [dispensedList, setDispensedList] = useState<(Prescription & { patient_name?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState('');
    const [toastType, setToastType] = useState('success');

    const showToast = (msg: string, type = 'success') => { setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3500); };

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/'); return; }
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!prof || prof.role !== 'pharmacist') { router.push('/'); return; }
        setProfile(prof);

        const { data: dispensed } = await supabase
            .from('prescriptions')
            .select('*, patients(full_name)')
            .eq('status', 'Dispensed')
            .order('dispensed_at', { ascending: false });
        setDispensedList((dispensed || []).map((r: any) => ({ ...r, patient_name: r.patients?.full_name })));
        setLoading(false);
    };

    const lookupQR = async () => {
        if (!qrInput.trim()) { showToast('Enter a QR code or prescription ID', 'error'); return; }
        setScanning(true); setRxResult(null);
        const { data, error } = await supabase
            .from('prescriptions')
            .select('*, patients(full_name, trn, blood_type)')
            .eq('qr_code', qrInput.trim())
            .single();

        if (error || !data) { showToast('Prescription not found. Check the QR code.', 'error'); setScanning(false); return; }

        // Supabase joins can sometimes return an array or an object depending on the relationship type.
        // We safely extract the patient details regardless of format.
        const patientData = Array.isArray(data.patients) ? data.patients[0] : data.patients;

        setRxResult({
            ...data,
            patient_name: patientData?.full_name,
            patient_trn: patientData?.trn
        });
        setScanning(false);
    };

    const dispenseRx = async () => {
        if (!rxResult) return;
        if (rxResult.status === 'Dispensed') { showToast('Already dispensed!', 'error'); return; }
        if (rxResult.status === 'Expired') { showToast('This prescription has expired!', 'error'); return; }
        await supabase.from('prescriptions').update({ status: 'Dispensed', dispensed_at: new Date().toISOString() }).eq('id', rxResult.id);
        if (rxResult.patient_id) {
            await supabase.from('audit_logs').insert({ patient_id: rxResult.patient_id, actor_name: profile?.full_name || 'Pharmacist', actor_role: 'pharmacist', action: `Prescription dispensed: ${rxResult.medication} ${rxResult.dosage}`, ip_address: '0.0.0.0' });
        }
        setRxResult(prev => prev ? { ...prev, status: 'Dispensed' } : null);
        showToast(`✅ ${rxResult.medication} dispensed successfully!`);
        loadData();
    };

    const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/'); };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen" style={{ background: '#0d0d1a' }}>
            <div className="text-center"><div className="text-4xl mb-3 animate-pulse">💊</div><div className="text-gray-400 text-sm">Loading pharmacist system…</div></div>
        </div>
    );

    return (
        <div className="flex min-h-screen" style={{ background: '#0d0d1a' }}>
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 bg-[#1a1a35] border rounded-xl px-4 py-3 text-sm text-white shadow-xl border-l-4 ${toastType === 'error' ? 'border-red-500 border-l-red-500' : 'border-[#2a2a50] border-l-green-500'}`}>{toast}</div>
            )}

            <Sidebar role="pharmacist" userName={profile?.full_name || 'Pharmacist'} activeSection={section} onSectionChange={setSection} onSignOut={handleSignOut} />

            <div className="ml-60 flex-1 flex flex-col">
                {/* Topbar */}
                <div className="sticky top-0 z-20 bg-[#12122a] border-b border-[#2a2a50] px-7 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Pharmacist Portal</span>
                        <span className="text-[#333360]">›</span>
                        <span className="text-white font-semibold capitalize">{section}</span>
                    </div>
                    <span className="text-xs text-purple-400 border border-purple-500/30 bg-purple-500/10 px-2 py-1 rounded-lg">💊 Dispensing Mode</span>
                </div>

                <div className="p-7">
                    {/* DASHBOARD */}
                    {section === 'dashboard' && (
                        <div>
                            <div className="mb-7">
                                <h1 className="text-2xl font-bold text-white">Welcome, {profile?.full_name?.split(' ')[0]}</h1>
                                <p className="text-gray-400 text-sm mt-1">Verify and dispense prescriptions using QR codes.</p>
                            </div>

                            <div className="grid grid-cols-3 gap-5 mb-7">
                                {[
                                    ['💊', dispensedList.length.toString(), 'Prescriptions Dispensed Today', 'text-green-400', 'rgba(34,197,94,0.1)'],
                                    ['📷', '1', 'QR Scanner Active', 'text-purple-400', 'rgba(124,58,237,0.1)'],
                                    ['✅', '100%', 'Verification Accuracy', 'text-teal-400', 'rgba(0,212,180,0.1)'],
                                ].map(([icon, val, label, color, bg]) => (
                                    <div key={String(label)} className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-5">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: String(bg) }}>{icon}</div>
                                        <div className={`text-3xl font-extrabold mb-1 ${color}`}>{val}</div>
                                        <div className="text-xs text-gray-500">{label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl p-6 mb-6">
                                <h3 className="text-sm font-bold text-white mb-1">Quick Scan</h3>
                                <p className="text-xs text-gray-400 mb-4">Enter or paste a QR code value to look up a prescription.</p>
                                <div className="flex gap-3">
                                    <input value={qrInput} onChange={e => setQrInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookupQR()} placeholder="Enter QR code or prescription ID…" className="flex-1 bg-[#111128] border border-[#2a2a50] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 placeholder:text-gray-600" />
                                    <button onClick={lookupQR} disabled={scanning} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold bg-purple-700 hover:bg-purple-600 disabled:opacity-60 transition-all">
                                        {scanning ? '…' : '🔍 Verify'}
                                    </button>
                                    <button onClick={() => setSection('scan')} className="px-5 py-2.5 rounded-xl border border-[#2a2a50] text-gray-400 text-sm hover:border-purple-500 hover:text-white transition-all">📷 Scan QR</button>
                                </div>
                            </div>

                            {/* Result */}
                            {rxResult && (
                                <div className={`bg-[#1a1a35] border rounded-2xl p-6 ${rxResult.status === 'Active' ? 'border-green-500/30' : rxResult.status === 'Dispensed' ? 'border-blue-500/30' : 'border-red-500/30'}`}>
                                    <div className="flex items-start gap-5 mb-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${rxResult.status === 'Active' ? 'bg-green-500/10' : rxResult.status === 'Dispensed' ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>💊</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-white">{rxResult.medication} — {rxResult.dosage}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rxResult.status === 'Active' ? 'text-green-400 bg-green-500/10 border border-green-500/30' : rxResult.status === 'Dispensed' ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30' : 'text-red-400 bg-red-500/10 border border-red-500/30'}`}>{rxResult.status}</span>
                                            </div>
                                            <div className="text-sm text-gray-300">{rxResult.frequency}</div>
                                            <div className="text-xs text-gray-500 mt-1">Prescribed by {rxResult.doctor_name}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-5 pt-4 border-t border-[#2a2a50]">
                                        <div><div className="text-[10px] text-gray-500 uppercase mb-1">Patient</div><div className="text-sm font-semibold text-white">{rxResult.patient_name || '—'}</div></div>
                                        <div><div className="text-[10px] text-gray-500 uppercase mb-1">TRN</div><div className="text-sm font-mono text-pink-400">{rxResult.patient_trn || '—'}</div></div>
                                        <div><div className="text-[10px] text-gray-500 uppercase mb-1">Issue Date</div><div className="text-sm text-white">{rxResult.issue_date}</div></div>
                                        <div><div className="text-[10px] text-gray-500 uppercase mb-1">Expiry Date</div><div className="text-sm text-white">{rxResult.expiry_date || '—'}</div></div>
                                        <div className="col-span-2"><div className="text-[10px] text-gray-500 uppercase mb-1">QR Code</div><div className="text-xs text-gray-400 font-mono break-all">{rxResult.qr_code}</div></div>
                                    </div>

                                    {rxResult.status === 'Active' && (
                                        <button onClick={dispenseRx} className="w-full py-3 rounded-xl text-white font-bold text-sm bg-green-600 hover:bg-green-500 transition-all">
                                            ✅ Confirm & Dispense Medication
                                        </button>
                                    )}
                                    {rxResult.status === 'Dispensed' && (
                                        <div className="text-center text-sm text-blue-400 py-3 bg-blue-500/10 rounded-xl border border-blue-500/30">✅ This prescription has already been dispensed.</div>
                                    )}
                                    {rxResult.status === 'Expired' && (
                                        <div className="text-center text-sm text-red-400 py-3 bg-red-500/10 rounded-xl border border-red-500/30">🚫 This prescription is expired. Do not dispense.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SCAN QR */}
                    {section === 'scan' && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-6">📷 Scan / Enter QR Code</h2>
                            <div className="max-w-md">
                                <div className="bg-[#1a1a35] border-2 border-dashed border-[#2a2a50] rounded-2xl p-12 text-center mb-6 hover:border-purple-500/50 transition-all">
                                    <div className="text-5xl mb-4">📷</div>
                                    <p className="text-gray-400 text-sm mb-2">Camera QR scanning coming soon.</p>
                                    <p className="text-gray-600 text-xs">Use the manual entry below to enter the QR code value.</p>
                                </div>
                                <div className="flex gap-3">
                                    <input value={qrInput} onChange={e => setQrInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookupQR()} placeholder="Paste or type QR code…" className="flex-1 bg-[#111128] border border-[#2a2a50] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 placeholder:text-gray-600" />
                                    <button onClick={() => { lookupQR(); setSection('dashboard'); }} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold bg-purple-700 hover:bg-purple-600 transition-all">Verify →</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HISTORY */}
                    {section === 'history' && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-6">📋 Dispense History</h2>
                            <div className="bg-[#1a1a35] border border-[#2a2a50] rounded-2xl overflow-hidden">
                                <table className="w-full">
                                    <thead><tr className="border-b border-[#2a2a50]">
                                        {['Patient', 'Medication', 'Dosage', 'Frequency', 'Dispensed On', 'QR Code'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</th>
                                        ))}
                                    </tr></thead>
                                    <tbody>
                                        {dispensedList.map(rx => (
                                            <tr key={rx.id} className="border-b border-[#2a2a50]/50 hover:bg-[#1f1f40]/50 transition-all">
                                                <td className="px-4 py-3 text-sm font-semibold text-white">{rx.patient_name || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-300">{rx.medication}</td>
                                                <td className="px-4 py-3 text-sm text-gray-300">{rx.dosage}</td>
                                                <td className="px-4 py-3 text-sm text-gray-300">{rx.frequency}</td>
                                                <td className="px-4 py-3 text-xs text-gray-400">{rx.dispensed_at ? new Date(rx.dispensed_at).toLocaleString() : '—'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500 font-mono max-w-xs truncate">{rx.qr_code}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {dispensedList.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No dispensed prescriptions yet</div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
