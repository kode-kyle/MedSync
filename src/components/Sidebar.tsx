'use client';

import { useRouter } from 'next/navigation';
import { UserRole } from '@/types';

interface SidebarProps {
    role: UserRole;
    userName: string;
    activeSection: string;
    onSectionChange: (section: string) => void;
    onSignOut: () => void;
}

const navItems: Record<UserRole, { icon: string; label: string; section: string }[]> = {
    doctor: [
        { icon: '🏠', label: 'Dashboard', section: 'dashboard' },
        { icon: '👥', label: 'Patients', section: 'patients' },
        { icon: '➕', label: 'New Record', section: 'new-record' },
        { icon: '💊', label: 'Prescriptions', section: 'prescriptions' },
        { icon: '💉', label: 'Immunizations', section: 'immunizations' },
        { icon: '🤖', label: 'AI Assistant', section: 'ai' },
        { icon: '🚨', label: 'Emergency Access', section: 'emergency' },
    ],
    patient: [
        { icon: '🏠', label: 'My Dashboard', section: 'dashboard' },
        { icon: '📋', label: 'Medical Records', section: 'records' },
        { icon: '💊', label: 'Prescriptions', section: 'prescriptions' },
        { icon: '💉', label: 'Immunizations', section: 'immunizations' },
        { icon: '🔍', label: 'Audit Log', section: 'audit' },
    ],
    pharmacist: [
        { icon: '🏠', label: 'Dashboard', section: 'dashboard' },
        { icon: '📷', label: 'Scan QR Code', section: 'scan' },
        { icon: '📋', label: 'Dispense History', section: 'history' },
    ],
    admin: [
        { icon: '🏠', label: 'Dashboard', section: 'dashboard' },
    ],
};

const roleColors: Record<UserRole, string> = {
    doctor: 'from-pink-500 to-purple-600',
    patient: 'from-teal-500 to-cyan-600',
    pharmacist: 'from-purple-500 to-indigo-600',
    admin: 'from-orange-500 to-amber-600',
};

const roleTitles: Record<UserRole, string> = {
    doctor: 'Doctor Portal',
    patient: 'Patient Portal',
    pharmacist: 'Pharmacist Portal',
    admin: 'Admin Portal',
};

export default function Sidebar({ role, userName, activeSection, onSectionChange, onSignOut }: SidebarProps) {
    const items = navItems[role] || [];

    return (
        <aside className="w-60 flex-shrink-0 bg-[#10102a] border-r border-[#2a2a50] flex flex-col min-h-screen fixed top-0 left-0 bottom-0 z-30">
            {/* Logo */}
            <div className="px-4 py-5 border-b border-[#2a2a50] flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleColors[role]} flex items-center justify-center text-lg flex-shrink-0`}>🏥</div>
                <div>
                    <div className="text-base font-extrabold">Med<span className="text-pink-500">Sync</span></div>
                    <div className="text-[10px] text-gray-500">{roleTitles[role]}</div>
                </div>
            </div>

            {/* User */}
            <div className="px-4 py-3 border-b border-[#2a2a50] flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleColors[role]} flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    {userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{userName}</div>
                    <div className="text-[10px] text-pink-400 capitalize">{role}</div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-4 py-2">Navigation</div>
                {items.map((item) => (
                    <button
                        key={item.section}
                        onClick={() => onSectionChange(item.section)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all text-left rounded-lg mx-0 ${activeSection === item.section
                                ? 'bg-gradient-to-r from-pink-500/15 to-purple-500/10 text-white border-l-2 border-pink-500 pl-3.5'
                                : 'text-gray-400 hover:text-white hover:bg-[#1a1a35]'
                            }`}
                        style={{ margin: '1px 8px', width: 'calc(100% - 16px)' }}>
                        <span className="text-base w-5 text-center">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[#2a2a50]">
                <button onClick={onSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a2a50] text-gray-400 text-sm hover:border-red-500 hover:text-red-400 transition-all">
                    🚪 Sign Out
                </button>
            </div>
        </aside>
    );
}
