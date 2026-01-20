
import React from 'react';
import { User as UserIcon, Building2, Moon, Sun } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
    hospitalName: string;
    user: User;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ hospitalName, user, isDarkMode, toggleTheme }) => {
    return (
        <header className="h-20 flex items-center justify-between px-8 border-b border-slate-100 bg-white shadow-sm no-print">
            <div className="flex items-center space-x-4">
                <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-100"><Building2 className="text-white" size={24} /></div>
                <div className="text-left">
                    <h1 className="text-xl font-black text-slate-900 leading-none tracking-tight uppercase">SVA • Vigilância de Antimicrobianos</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{hospitalName}</p>
                </div>
            </div>
            <div className="flex items-center space-x-6">
                <button
                    onClick={toggleTheme}
                    className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                    title={isDarkMode ? "Modo Claro" : "Modo Noturno (Dark Mode)"}
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{user.name}</p>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{user.role}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner overflow-hidden">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon size={24} />
                        )}
                    </div>
                </div>
            </div>
        </header >
    );
};

export default Navbar;
